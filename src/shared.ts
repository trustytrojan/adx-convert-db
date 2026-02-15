import * as cheerio from 'cheerio';
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

/**
 * Parses the Google Drive embedded folder HTML into a Map.
 * @param html The raw HTML string from the request.
 * @returns A record where keys are folder names and values are folder IDs.
 */
export function parseDriveFolders(html: string): Record<string, string> {
	const $ = cheerio.load(html);
	const folderMap: Record<string, string> = Object.create(null);

	// Each folder item is contained within a "flip-entry" div
	$('.flip-entry').each((_, element) => {
		const linkElement = $(element).find('a').first();
		const titleElement = $(element).find('.flip-entry-title').first();

		const href = linkElement.attr('href');
		const folderName = titleElement.text().trim();

		if (!href || href.endsWith('view?usp=drive_web'))
			return;
		if (!folderName)
			return;

		// Extract the ID from the URL: https://drive.google.com/drive/folders/{ID}
		const folderId = href.split('/').pop();

		if (!folderId)
			return;

		folderMap[folderName.trim().normalize()] = folderId;
	});

	return folderMap;
}
