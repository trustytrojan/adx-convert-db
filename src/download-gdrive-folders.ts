/*
this script is separate from parse-gdrive-folders.ts because Google Drive's embeddedfolderview
pages for some reason take forever to download... i suppose they are less prioritized server-side
and are expected to be cached?? which is what we're doing by splitting the downloading/parsing.
*/

import fs from 'node:fs';
import { rootFolderHtml, versionFoldersLocal } from './shared.ts';
import { fetchEmbeddedFolderView, parseEmbeddedFolderView } from './gdrive.ts';

// the root "maisquared" folder. this contains subfolders named "(version number). (version name)"
const rootFolderId = '1NiZ9rL19qKLqt0uNcP5tIqc0fUrksAPs';

if (!fs.existsSync(rootFolderHtml)) {
	fs.writeFileSync(rootFolderHtml, await fetchEmbeddedFolderView(rootFolderId));
	console.log(`Downloaded '${rootFolderHtml}'`);
}

const versionFolders = parseEmbeddedFolderView(fs.readFileSync(rootFolderHtml).toString())
	.map((item) => [item.name, item.id]);

// concurrently download the html of all version folders
await Promise.all(
	versionFolders.map(async ([name, id]) => {
		const filename = `${versionFoldersLocal}/${name}.html`;
		if (fs.existsSync(filename))
			return;
		const htmlText = await fetchEmbeddedFolderView(id);
		fs.writeFileSync(filename, htmlText);
		console.log(`Downloaded '${filename}'`);
	}),
);
