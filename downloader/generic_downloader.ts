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
    sleepTime?: Fn<string, number> | number;
    errorReporter?: Fn<[string, string], Promise<void>>;
};

export const pageProcessorUserAgents = {
    pixel: "Mozilla/5.0 (Linux; Android 8.0; Pixel 2 Build/OPD3.170816.012) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Mobile Safari/537.36",
};

export const pageProcessorDefaultConfig: {
    headless: boolean;
    userAgent?: string;
} = {
    headless: true,
};
// const pageRest = config.maxPage - currentPage;
const progressBar = new progress(
    "Fetch progress [:bar] (:current/:total) :percent eta: :sleep \n",
    {
        complete: "=",
        incomplete: " ",
        width: 20,
        total: 0, //pages to process
    },
);

const stopValue = Symbol();

export function pageProcessor<T, Url extends TypedUrl>(
    config: pageProcessorConfig<T, Url>,
): Observable<T> {
    let sleepTime: Fn<string, number | undefined> = (_) =>
        3000 + Math.random() * 7000;

    if (typeof config.sleepTime == "number") {
        sleepTime = (_) => config.sleepTime as number;
    }
    if (typeof config.sleepTime == "function") {
        sleepTime = config.sleepTime;
    }

    let stopReason: string | null = null;
    let stop = () => (stopReason = "external request");

    return new Observable((sub) => {
        (async () => {
            const browser = await puppeteer.launch({
                headless: pageProcessorDefaultConfig.headless,
            });
            const context = await browser.createIncognitoBrowserContext();

            console.error("launch: context initialized");

            let retries = 5;
            while (retries > 0) {
                console.error("run: main loop started");
                const page = await context.newPage();

                if (pageProcessorDefaultConfig.userAgent)
                    page.setUserAgent(pageProcessorDefaultConfig.userAgent);

                console.error("run: new page initialized");
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

                        console.error(`run: download page ${currentUrl}`);
                        await page.goto(currentUrl);

                        if (config.urlExtractorFn) {
                            const nextUrls = await config.urlExtractorFn(
                                page,
                                (curl as any).kind,
                            );
                            for (const u of nextUrls) await config.queue.add(u);
                        }

                        const objects = await config.processPageFn(
                            page,
                            (curl as any).kind,
                        );
                        objects.forEach((v) => sub.next(v));

                        await sleep(sleepTime(currentUrl));

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
                    console.error(`error: on downloading: ${currentUrl}`);
                    console.error(err);

                    config.queue.error(curl!, err);

                    const errorFile = path.join(
                        "/tmp",
                        `${md5(currentUrl!)}.png`,
                    );
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
                    console.error(
                        "error: sleep before next retry: ",
                        prettyMs(sleepTime),
                    );
                    await sleep(sleepTime);
                    page.close();
                    console.error("run: close page");
                    continue;
                }
            }
            console.error(
                `stop: reason = ${stopReason ?? "no more data to process"}`,
            );
            await browser.close();
            sub.complete();
        })();
        return stop;
    });
}
