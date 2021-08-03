import { load } from ".pnpm/cheerio@1.0.0-rc.10/node_modules/cheerio";
import { Extractors } from "./downloader/extractors";
import { pageProcessor, TypedUrl } from "./downloader/generic_downloader";
import { URLQueue } from "./downloader/url_queue";
import { objectParser, _, ParserConfig } from "./transformer/parser";

async function* simpleQueueDownloader<Url extends TypedUrl>(
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
async function* hlel<Url extends TypedUrl, Config extends ParserConfig>(
	queue: Url[] | Url,
	elementSelector: string,
	parserConfig: Config
) {
	if (!Array.isArray(queue)) queue = [queue];
	const sqd = simpleQueueDownloader(queue, elementSelector);
	const parser = objectParser(parserConfig);
	for await (const d of sqd) {
		yield await parser(load(d));
	}
}

async function main() {
	// const ei = hlel(
	// 	"https://habr.com/ru/top/daily/",
	// 	"article",
	// 	{
	// 		title: ["h2.tm-article-snippet__title", _((v) => v[0].text)],
	// 		description: [".article-formatted-body", _((v) => v[0].text)],
	// 	} as const//
	// );
	const ei = hlel(
		"https://youtube.com",
		"ytd-thumbnail",
		{
			title: ["img", _((v) => v[0].src)],
		} as const //
	);
	for await (const object of ei) {
		console.log(object);
	}
}
main();
