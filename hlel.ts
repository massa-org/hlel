import { Extractors } from "./downloader/extractors";
import { pageProcessor } from "./downloader/generic_downloader";
import { URLQueue } from "./downloader/url_queue";
import { objectParser, ParserConfig, valueParser } from "./transformer/parser";
import { Page } from "puppeteer";
import { Fn } from "./util/fn_types";

async function* simplePageProcessor(
	queue: string[],
	elementSelector: string,
	nextUrlSelector?: string,
	nextUrlHost?: string
) {
	let cnt = 0;
	const opts: { urlExtractorFn?: Fn<Page, Promise<string[]>> } = {};
	if (nextUrlSelector) {
		opts.urlExtractorFn = async (e: Page) => {
			++cnt;
			if (cnt > 2) return [];
			const doc = await Extractors.domElements(nextUrlSelector!)(e);
			return Promise.all(
				doc.map(
					valueParser("a", (v) => (nextUrlHost ?? "") + v[0].href)
				)
			);
		};
	}

	yield* pageProcessor({
		processPageFn: Extractors.domElements(elementSelector),
		queue: new URLQueue<string>(queue),
		errorReporter: async ([err, image]) => console.log(err),
		...opts,
	});
}

// high level extraction library
export async function* hlel<Config extends ParserConfig>(
	queue: string[] | string,
	elementSelector: string,
	parserConfig: Config,
	nextUrlSelector?: string,
	nextUrlHost?: string
) {
	if (!Array.isArray(queue)) queue = [queue];
	const sqd = simplePageProcessor(
		queue,
		elementSelector,
		nextUrlSelector,
		nextUrlHost
	);
	const parser = objectParser(parserConfig);
	for await (const d of sqd) {
		yield await parser(d);
	}
}
