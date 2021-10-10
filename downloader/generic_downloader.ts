import md5 from "md5";
import path from "path";
import prettyMs from "pretty-ms";
import progress from "progress";
import puppeteer from "puppeteer";
import { Observable } from "rxjs";
import { Fn } from "../util/fn_types";
import { sleep } from "../util/sleep";
import { URLQueue } from "./url_queue";

export type TypedUrl = { url: string; kind: string } | string;

export type pageProcessorConfig<T, Url extends TypedUrl> = {
	processPageFn: { (page: puppeteer.Page, kind?: string): Promise<T[]> };
	urlExtractorFn?: { (page: puppeteer.Page, kind?: string): Promise<Url[]> };
	queue: URLQueue<Url>;
	sleepTime?: Fn<string, number>;
	errorReporter?: Fn<[string, string], Promise<void>>;
};

// const pageRest = config.maxPage - currentPage;
const progressBar = new progress(
	"Fetch progress [:bar] (:current/:total) :percent eta: :sleep \n",
	{
		complete: "=",
		incomplete: " ",
		width: 20,
		total: 0, //pages to process
	}
);

const stopValue = Symbol();


export function pageProcessor<T, Url extends TypedUrl>(
	config: pageProcessorConfig<T, Url>,
): Observable<T> {
	let stopReason: string | null = null;
	let stop = () => stopReason = 'external request';

	return new Observable((sub) => {
		(async () => {
			const browser = await puppeteer.launch({ headless: true });
			const context = await browser.createIncognitoBrowserContext();

			console.log("launch: context initialized");

			let retries = 5;
			while (retries > 0) {
				console.log("run: main loop started");
				const page = await context.newPage();
				console.log("run: new page initialized");
				let currentUrl: string | undefined;
				let curl: Url | undefined;
				try {
					while (true) {
						// TODO emulate user interaction on page
						// ex. find nav element with page url and goto it
						// ex. mouse random moves
						curl = await config.queue.next();
						if (!curl) break;
						if (typeof curl == "string") currentUrl = curl;
						else currentUrl = (curl as any).url;
						currentUrl = currentUrl!;

						console.log(`run: download page ${currentUrl}`);
						await page.goto(currentUrl);

						if (config.urlExtractorFn) {
							const nextUrls = await config.urlExtractorFn(
								page,
								(curl as any).kind
							);
							for (const u of nextUrls) await config.queue.add(u);
						}


						const objects = await config.processPageFn(page, (curl as any).kind);
						objects.forEach((v) => sub.next(v));

						await sleep(
							(config.sleepTime ?? ((_) => undefined))(currentUrl)
						);

						if (stopReason != null) throw stopValue;
						retries = 5;
					}
					await config.queue.end();
					break; // if internal loop stop without exception just stop extraction process
				} catch (err) {
					if (err == stopValue) {
						retries = 0;
						continue;
					}
					console.log(`error: on downloading: ${currentUrl}`);
					console.log(err);

					config.queue.error(curl!, err);

					const errorFile = path.join("/tmp", `${md5(currentUrl!)}.png`);
					const errorText = JSON.stringify({
						currentUrl,
						error: err,
					});

					await page.screenshot({
						path: errorFile,
						fullPage: true,
					});

					await (config?.errorReporter ?? (() => undefined))([
						errorText,
						errorFile,
					]);

					--retries;
					const sleepTime = (5 - retries) * 30 * 1000;
					console.log(
						"error: sleep before next retry: ",
						prettyMs(sleepTime)
					);
					await sleep(sleepTime);
					page.close();
					console.log("run: close page");
					continue;
				}
			}
			console.log(`stop: reason = ${stopReason ?? "no more data to process"}`);
			await browser.close();
			sub.complete();
		})();
		return stop;
	});
}
