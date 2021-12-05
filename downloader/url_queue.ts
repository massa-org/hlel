// urlqueue interface and simple in memory queue implementation
export class URLQueue<T> {
	toProcess: T[];
	errored: T[] = [];

	constructor(initialData: T[]) {
		this.toProcess = [...initialData];
	}

	async next(): Promise<T | undefined> {
		if (this.toProcess.length == 0) return undefined;
		const [first, ...rest] = this.toProcess;
		this.toProcess = rest;

		return first;
	}
	async add(url: T): Promise<void> {
		this.toProcess.push(url);
	}

	async error(url: T, err: any): Promise<void> {
		this.errored.push(url);
	}

	async end(): Promise<void> {}
}
