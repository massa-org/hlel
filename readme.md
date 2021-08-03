Для запуска

```
npm i -g ts-node
npm i
npm run example
```

High level extraction library - переписанная версия предыдущего экстрактора данных. С целью упрощения конфигурации экстрактора для конкретного источника данных. И объединения процесса получения данных и его разбора.

К какому коду желательно прийти

```ts
const app = hlel({
	initial: ["http://site_name.com"],
	scanner: valueParser(["a.page", (v) => v.map((e) => e.src)]),
	parser: objectParser({
		image: ["div.image > a > img", (v) => v.map((e) => e.src)],
	}),
	saver: fileSaver("./data/extracted.json"),
	// saver: mongoSaver('localhost:28017/site_name')
});

app.run();
// return object from page with infered types
app.get("http://site.name.com/2");
```

