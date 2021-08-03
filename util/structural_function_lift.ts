type Fn<O, I> = { (v: I): O };
type KeyType = number | string | symbol;

export const lift =
	<O, I>(
		fn: Fn<O, I>,
		{}: { _I?: I; _O?: O } = {} as any //fake parameter to support type infer like lift(lift(fn)) usage
	) =>
	<Keys extends KeyType>(struct: Record<Keys, I>): Record<Keys, O> => {
		const ret: Record<Keys, O> = {} as any;
		for (const k in struct) {
			ret[k] = fn(struct[k]);
		}
		return ret;
	};

export const liftKey =
	<O, I, Keys extends string = string>(
		fn: Fn<O, [Keys, I]>,
		{}: { _I?: I; _O?: O; _Keys: Keys } = {} as any //fake parameter to support type infer like lift(lift(fn)) usage
	) =>
	(struct: Record<Keys, I>): Record<Keys, O> => {
		const ret: Record<Keys, O> = {} as any;
		for (const k in struct) {
			ret[k] = fn([k, struct[k]]);
		}
		return ret;
	};
