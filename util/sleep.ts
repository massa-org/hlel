export const sleep = (time?: number) => {
	time ??= 3000 + Math.random() * 7000;
	return new Promise<number>((s) => setTimeout(() => s(time!), time));
};
