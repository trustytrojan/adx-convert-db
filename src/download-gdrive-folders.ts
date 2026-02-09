/*
this script is separate from parse-gdrive-folders.ts because Google Drive's embeddedfolderview
pages for some reason take forever to download... i suppose they are less prioritized server-side
and are expected to be cached?? which is what we're doing by splitting the downloading/parsing.
*/

import fs from 'node:fs';
import { parseDriveFolders, rootFolderHtml, versionFoldersLocal } from './shared.ts';

const DRIVE_EMBED_BASE = 'https://drive.google.com/embeddedfolderview?id=';

const fetchGdriveEmbeddedFolderView = async (folderId: string) => {
	const url = DRIVE_EMBED_BASE + folderId;
	const resp = await fetch(url);
	if (!resp.ok)
		throw new Error(`${url} -> ${resp.status} ${resp.statusText}`);
	return resp.text();
};

// the root "maisquared" folder. this contains subfolders named "(version number). (version name)"
const rootFolderId = '1NiZ9rL19qKLqt0uNcP5tIqc0fUrksAPs';

if (!fs.existsSync(rootFolderHtml)) {
	fs.writeFileSync(rootFolderHtml, await fetchGdriveEmbeddedFolderView(rootFolderId));
	console.log(`Downloaded '${rootFolderHtml}'`);
} else {
	console.log(`Using cached '${rootFolderHtml}'`);
}

const versionFolders = parseDriveFolders(fs.readFileSync(rootFolderHtml).toString());

// concurrently download the html of all version folders
await Promise.all(
	Object.entries(versionFolders).map(async ([name, id]) => {
		const filename = `${versionFoldersLocal}/${name}.html`;
		if (fs.existsSync(filename)) {
			console.log(`'${filename}' exists, skipping download`);
			return;
		}
		const htmlText = await fetchGdriveEmbeddedFolderView(id);
		fs.writeFileSync(filename, htmlText);
		console.log(`Downloaded '${filename}'`);
	}),
);
