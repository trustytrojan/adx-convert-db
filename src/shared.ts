import fs from 'node:fs';

const dataDir = `./data`;
export const versionFoldersLocal = `${dataDir}/version-folders`;
export const rootFolderHtml = `${dataDir}/root-folder.html`;
export const songName2FolderIdFile = `${dataDir}/songName2folderId.json`;
export const zetarakuJsonFile = `${dataDir}/zetaraku.json`;

// i want the final output committed to the repo
export const songsJsonFile = `./songs.json`;

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(versionFoldersLocal, { recursive: true });
