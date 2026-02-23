/*
Separate step from the downloading of the version folders HTML (download-gdrive-folders.ts)
because Google Drive's servers don't want to send embeddedfolderview HTML quickly...
*/

import fs from 'node:fs';
import { songName2FolderIdFile, versionFoldersLocal } from './shared.ts';
import { parseEmbeddedFolderView } from './gdrive.ts';

const songName2folderId: Record<string, string> = Object.create(null);

const versionFolders = fs.readdirSync(versionFoldersLocal);

for (const versionFolder of versionFolders) {
	const htmlText = fs.readFileSync(`${versionFoldersLocal}/${versionFolder}`).toString();
	for (const { name, id } of parseEmbeddedFolderView(htmlText))
		// WE MUST NORMALIZE HERE TO HANDLE JAPANESE ACCENTS SOMETIMES BEING SEPARATE CHARACTERS!!!
		songName2folderId[name.normalize()] = id;
}

fs.writeFileSync(songName2FolderIdFile, JSON.stringify(songName2folderId, null, '\t'));
