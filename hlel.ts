import { load } from ".pnpm/cheerio@1.0.0-rc.10/node_modules/cheerio";
import { Extractors } from "./downloader/extractors";
import { pageProcessor, TypedUrl } from "./downloader/generic_downloader";
import { URLQueue } from "./downloader/url_queue";
import { objectParser, _, ParserConfig } from "./transformer/parser";

async function* simplePageProcessor<Url extends TypedUrl>(
	queue: Url[],
	elementSelector: string
) {
	yield* pageProcessor({
		processPageFn: Extractors.domElements(elementSelector),
		queue: new URLQueue<Url>(queue),
		errorReporter: async ([err, image]) => console.log(err),
	});
}

// high level extraction library
export async function* hlel<Url extends TypedUrl, Config extends ParserConfig>(
	queue: Url[] | Url,
	elementSelector: string,
	parserConfig: Config
) {
	if (!Array.isArray(queue)) queue = [queue];
	const sqd = simplePageProcessor(queue, elementSelector);
	const parser = objectParser(parserConfig);
	for await (const d of sqd) {
		yield await parser(load(d));
	}
}
