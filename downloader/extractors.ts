import puppeteer from "puppeteer";
export namespace Extractors {
	export const domElements =
		(selector: string) =>
		async (page: puppeteer.Page, kind?: string): Promise<string[]> => {
			const content = await page.$$eval(selector, (e) =>
				e.map((e) => e.outerHTML)
			);

			if (content.length == 0) {
				throw `No content error`;
			}

			return content;
		};
}
