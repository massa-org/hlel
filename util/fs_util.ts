import { constants as fsConstants } from "fs";
import fs from "fs/promises";

import { promisify } from "util";
import rimraf_cb from "rimraf";
import path from "path";

export const rimraf = promisify(rimraf_cb);

export async function checkFileExists(filepath: string) {
	try {
		await fs.access(filepath, fsConstants.F_OK);
		return true;
	} catch (err) {
		return false;
	}
}

export const tryMkdir = async (dpath: string) => {
	if (await checkFileExists(dpath)) return;
	await fs.mkdir(dpath);
};
