import { hlel } from "../hlel";
// need to correct type infer
import { _ } from "../transformer/parser";

// where is top level await :[
async function main() {
	const dataGenerator = hlel(
		"https://habr.com/ru/top/daily/",
		// object_selector
		"article",
		// all selectors bellow work in context of 'object_selector'
		{
			title: ["h2.tm-article-snippet__title", _((v) => v[0].text)],
			description: [".article-formatted-body", _((v) => v[0].text)],
			images: [
				"img",
				// extract images src and filter empty strings
				_((v) => v.map((v) => v.src?.trim()).filter(Boolean)),
			],
		} as const //
	);

	for await (const object of dataGenerator) {
		console.log(object);
	}
}
main();
