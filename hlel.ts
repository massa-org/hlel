import { Page } from "puppeteer";
import { mergeMap } from "rxjs";
import { Extractors } from "./downloader/extractors";
import {
    pageProcessor,
    pageProcessorConfig,
    pageProcessorDefaultConfig,
    pageProcessorUserAgents,
} from "./downloader/generic_downloader";
import { URLQueue } from "./downloader/url_queue";
import { objectParser, ParserConfig, valueParser } from "./transformer/parser";
import { Fn } from "./util/fn_types";

type configType = Partial<pageProcessorConfig<string, string>>;

async function simplePageProcessor(
    queue: string[],
    elementSelector: string,
    nextUrlSelector?: string,
    nextUrlHost?: string,
    config?: configType,
) {
    const opts: { urlExtractorFn?: Fn<Page, Promise<string[]>> } = {};
    if (nextUrlSelector) {
        opts.urlExtractorFn = async (e: Page) => {
            const doc = await Extractors.domElements(nextUrlSelector!)(e);
            return Promise.all(
                doc.map(
                    valueParser("a", (v) => (nextUrlHost ?? "") + v[0].href)
                )
            );
        };
    }

    return pageProcessor({
        processPageFn: Extractors.domElements(elementSelector),
        queue: new URLQueue<string>(queue),
        errorReporter: async ([err, image]) => console.error(err),
        ...opts,
        ...config,
    });
}

// high level extraction library
export async function hlel<Config extends ParserConfig>(
    queue: string[] | string,
    elementSelector: string,
    parserConfig: Config,
    nextUrlSelector?: string,
    nextUrlHost?: string,
    config?: configType,
) {
    if (!Array.isArray(queue)) queue = [queue];
    const sqd = await simplePageProcessor(
        queue,
        elementSelector,
        nextUrlSelector,
        nextUrlHost,
		config,
    );
    const parser = objectParser(parserConfig);
    return sqd.pipe(mergeMap(parser));
}

hlel.config = pageProcessorDefaultConfig;
hlel.userAgents = pageProcessorUserAgents;