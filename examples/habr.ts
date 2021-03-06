import { take } from "rxjs";
import { hlel } from "../hlel";
// need to correct type infer
import { _ } from "../transformer/parser";

// where is top level await :[
async function main() {
  const dataGenerator = await hlel(
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

  const sub = dataGenerator.pipe(take(5)).subscribe({
    next(v) {
      console.log(v.title);
    },
    complete() {
      // stop data extraction after stream is complete 
	  // for that example it's when we take 5 elements 
      sub.unsubscribe();
    },
  });
}
main();
