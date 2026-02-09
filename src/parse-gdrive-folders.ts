/*
Separate step from the downloading of the version folders HTML (download-gdrive-folders.ts)
because Google Drive's servers don't want to send embeddedfolderview HTML quickly...
*/

import fs from 'node:fs';
import { parseDriveFolders, versionFoldersLocal, songName2FolderIdFile } from './shared.ts';

const songName2folderId: Record<string, string> = Object.create(null);

const versionFolders = fs.readdirSync(versionFoldersLocal);

for (const versionFolder of versionFolders) {
	const htmlText = fs.readFileSync(`${versionFoldersLocal}/${versionFolder}`).toString();
	Object.assign(songName2folderId, parseDriveFolders(htmlText));
}

fs.writeFileSync(songName2FolderIdFile, JSON.stringify(songName2folderId, null, '\t'));
console.log(`Wrote songName2folderId to: ${songName2FolderIdFile}`);
