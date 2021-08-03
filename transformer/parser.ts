import { CheerioAPI } from "cheerio";
import { Fn } from "../util/fn_types";
import { load } from ".pnpm/cheerio@1.0.0-rc.10/node_modules/cheerio";

export type ElementData = {
	href?: string;
	src?: string;
	attr?: Record<string, string>;
	text: string;
};

export function valueParser<T>(
	selector: string,
	transformer: Fn<ElementData[], T>
) {
	return async (html: string): Promise<T> => {
		const $ = load(html);
		return transformer(
			$(selector)
				.map(function () {
					const href = $(this).attr().href;
					const src = $(this).attr().src;
					const attr = $(this).attr();
					const text = $(this).text();

					return { href, text, src, attr };
				})
				.toArray()
		);
	};
}

export function _<T>(fn: Fn<ElementData[], T>) {
	return fn;
}
export type ParserConfig = Record<
	string,
	readonly [string, Fn<ElementData[], any>]
>;

export function objectParser<T extends ParserConfig>(config: T) {
	return async (html: string) => {
		const ret: any = {};
		const pms = Object.keys(config).map(async (key) => {
			ret[key] = await valueParser(...config[key])(html);
		});
		await Promise.all(pms);
		return ret as _optType<T>;
	};
}

type _openPromise<T> = T extends Promise<infer R> ? R : T;
type _openArray<T> = T extends readonly (infer AT)[]
	? _openPromise<AT>[]
	: _openPromise<T>;

type _optType<
	T extends Record<string, readonly [string, Fn<ElementData[], any>]>
> = {
	[K in keyof T]: _openArray<ReturnType<T[K][1]>>;
};
