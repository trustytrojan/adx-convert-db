import fs from 'node:fs';
import { hasJapanese, romanizeJapanese } from './romanize-jp.ts';
import { songName2FolderIdFile, zetarakuJsonFile, songsJsonFile } from './shared.ts';
import { Song, ZetarakuSong } from './types.ts';

const zetarakuJsonUrl = 'https://dp4p6x0xfi5o9.cloudfront.net/maimai/data.json';

// Download zetaraku.json from their Cloudfront deployed static URL
if (!fs.existsSync(zetarakuJsonFile)) {
	const r = await fetch(zetarakuJsonUrl);
	if (!r.ok)
		throw new Error(`${zetarakuJsonUrl} -> ${r.status} ${r.statusText}`);
	fs.writeFileSync(zetarakuJsonFile, await r.text());
	console.log(`Downloaded zetaraku.json to: ${zetarakuJsonFile}`);
}

// Load data
const songName2folderId: Record<string, string> = JSON.parse(fs.readFileSync(songName2FolderIdFile).toString());
const mySongNames = Object.keys(songName2folderId);
const zetarakuSongs: ZetarakuSong[] = JSON.parse(fs.readFileSync(zetarakuJsonFile).toString()).songs;

// Regex patterns
const possiblyUtageRegex = /^[\(\[].[\)\]] ?(.+)$/;
const utageDifficultyRegex = /^【(.)】$/;

// Difficulty conversion for Wonderland Wars
const wwdiff2number: Record<string, string> = {
	EASY: '1',
	BASIC: '2',
	ADVANCED: '3',
	EXPERT: '4',
	MASTER: '5',
	'Re:MASTER': '6',
};

/**
 * Normalize a string to a search-friendly key for matching
 */
const toSearchKey = (s: string): string =>
	s.normalize('NFC')
		.toLowerCase()
		.replace(/[！-～]/g, (m) => String.fromCharCode(m.charCodeAt(0) - 0xfee0))
		// Bridge the Greek/Latin gap for KHYMΞXΛ
		.replace(/ξ/g, 'e')
		.replace(/λ/g, 'a')
		.replace('アンバークロニカル', 'アンバークロニクル') // Match "cal" to "cle"
		// Keep alphanumeric, CJK, Greek, and the specific male symbol
		.replace(/[^a-z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\u0370-\u03ff\u2200-\u22ff♂]/gi, '');

// Pre-process the GDrive map with search-friendly keys
const searchFriendlyMap: Record<string, string> = Object.create(null);
for (const [name, id] of Object.entries(songName2folderId)) {
	const key = toSearchKey(name);
	searchFriendlyMap[key] = id;

	// Hardfix for "Idolratrize" vs "Idoratrize"
	if (key.includes('idolratrize'))
		searchFriendlyMap[key.replace('idolratrize', 'idoratrize')] = id;
	// Hardfix for "Plus Danshi" -> "+♂"
	if (key.includes('plusdanshi'))
		searchFriendlyMap['♂'] = id;
}

/**
 * Check if a song might exist in the gdrive database
 */
const songLikelyInGdrive = (songId: string, title: string): boolean => {
	// Check exact matches first
	if (songId in songName2folderId || title in songName2folderId)
		return true;

	// Check search key matches
	const keySongId = toSearchKey(songId);
	const keyTitle = toSearchKey(title);
	if (keySongId in searchFriendlyMap || keyTitle in searchFriendlyMap)
		return true;

	// Special case for the math symbol
	if (title === '∀' && '∀' in songName2folderId)
		return true;

	return false;
};

/**
 * Try to find a folderId for a non-utage song
 */
const findNonUtageFolderId = (songId: string, title: string): string | null => {
	const keySongId = toSearchKey(songId);
	const keyTitle = toSearchKey(title);

	// Try exact first, then keys
	return (
		(songId === 'Link (2)' ? songName2folderId['383_Link'] : null)
 		|| songName2folderId[songId]
		|| songName2folderId[title]
		|| searchFriendlyMap[keySongId]
		|| searchFriendlyMap[keyTitle]
		|| (title === '∀' ? songName2folderId['∀'] : null)
	);
};

/**
 * Try to find a gdrive name for a utage song's non-utage base
 */
const findUtageGdriveName = (nonUtageName: string): string | null => {
	const found = mySongNames.find((s) => s.includes(nonUtageName) && possiblyUtageRegex.test(s));
	return found ?? null;
};

/**
 * Convert a non-utage song name to its gdrive utage counterpart
 */
const convertToGdriveUtageName = (nonUtageName: string, difficulty: string): string | null => {
	// Handle "Garakuta Doll Play (1)" -> "[宴 NO.1] Garakuta Doll Play"
	{
		const match = nonUtageName.match(/^Garakuta Doll Play \((\d)\)$/);
		if (match) {
			const num = match[1];
			return `[宴 NO.${num}] Garakuta Doll Play`;
		}
	}

	// Handle "Wonderland Wars オープニング (EASY)" -> "[宴 NO.1] Wonderland Wars オープニング"
	{
		const match = nonUtageName.match(/^Wonderland Wars オープニング \(([A-Za-z:]+)\)$/);
		if (match) {
			const diff = match[1];
			const num = wwdiff2number[diff];
			if (num)
				return `[宴 NO.${num}] Wonderland Wars オープニング`;
		}
	}

	// Handle "(宴) Reach For The Stars (2)" -> "[char] Reach For The Stars"
	{
		const rftsName = nonUtageName.replace(/ \(\d\)$/, '');
		const match = utageDifficultyRegex.exec(difficulty);
		if (match) {
			const difficultyChar = match[1];
			return `[${difficultyChar}] ${rftsName}`;
		}
	}

	return null;
};

/**
 * Try to find a folderId for a utage song
 */
const findUtageFolderId = (nonUtageName: string, difficulty: string): string | null => {
	// First try: find existing gdrive name that includes the non-utage name
	const gdriveName = findUtageGdriveName(nonUtageName);
	if (gdriveName)
		return songName2folderId[gdriveName] || null;

	// Second try: convert to gdrive name using special rules
	const convertedName = convertToGdriveUtageName(nonUtageName, difficulty);
	if (convertedName && convertedName in songName2folderId)
		return songName2folderId[convertedName];

	return null;
};

/**
 * Create a Song object from a song entry
 */
const createSongObject = async ({ title, artist, songId }: ZetarakuSong, folderId: string): Promise<Song> => {
	return {
		folderId,
		songId,
		title,
		artist,
		...(hasJapanese(title) ? { romanizedTitle: await romanizeJapanese(title) } : {}),
		...(hasJapanese(artist) ? { romanizedArtist: await romanizeJapanese(artist) } : {}),
	};
};

// Process songs
const songs: Song[] = [];
const notFoundSongIds: string[] = [];
const notFoundButLikelyNotConverted: string[] = [];
let utageSongsProcessed = 0;
let nonUtageSongsProcessed = 0;

for (const songEntry of zetarakuSongs) {
	const { songId, title, sheets } = songEntry;
	const type = sheets[0]?.type;
	const difficulty = sheets[0]?.difficulty;

	if (type === 'utage') {
		// Utage song handling
		const match = possiblyUtageRegex.exec(songId);
		if (!match)
			continue;

		let nonUtageName = match[1];
		if (!nonUtageName)
			continue;

		// Normalize specific character issues
		if (nonUtageName === "WE'RE BACK!!")
			nonUtageName = nonUtageName.replace("'", '\u2019');

		// Check if this utage song is likely in our gdrive database
		// We need to check both the converted names and existing names
		const gdriveUtageName = convertToGdriveUtageName(nonUtageName, difficulty || '');
		const likelyInGdrive = findUtageGdriveName(nonUtageName)
			|| (gdriveUtageName && gdriveUtageName in songName2folderId);

		if (!likelyInGdrive) {
			notFoundButLikelyNotConverted.push(songId);
			continue;
		}

		// Try to find the folderId
		const folderId = findUtageFolderId(nonUtageName, difficulty || '');
		if (folderId) {
			const songObj = await createSongObject(songEntry, folderId);
			songs.push(songObj);
			++utageSongsProcessed;
		} else {
			// In gdrive but couldn't find folderId
			notFoundSongIds.push(songId);
		}
	} else {
		// Check if this song is likely in our gdrive database
		if (!songLikelyInGdrive(songId, title)) {
			notFoundButLikelyNotConverted.push(songId);
			continue;
		}

		// Try to find the folderId
		const folderId = findNonUtageFolderId(songId, title);
		if (folderId) {
			const songObj = await createSongObject(songEntry, folderId);
			songs.push(songObj);
			++nonUtageSongsProcessed;
		} else {
			// In gdrive but couldn't find folderId
			notFoundSongIds.push(songId);
		}
	}
}

// Log results
console.log(`Total matched songs: ${songs.length}`);
console.log(`Utage songs processed: ${utageSongsProcessed}`);
console.log(`Non-utage songs processed: ${nonUtageSongsProcessed}`);
if (notFoundSongIds.length > 0) {
	console.log(`\nzetaraku songIds found in gdrive but **could not match**:`);
	for (const songId of notFoundSongIds)
		console.log(`'${songId}'`);
	console.log(`\nTotal unmatched: ${notFoundSongIds.length}`);
}
if (notFoundButLikelyNotConverted.length > 0) {
	console.log(`\nzetaraku songIds **probably not converted**:`);
	for (const songId of notFoundButLikelyNotConverted)
		console.log(`'${songId}'`);
	console.log(`\nTotal unmatched: ${notFoundButLikelyNotConverted.length}`);
}

// Save results
fs.writeFileSync(songsJsonFile, JSON.stringify(songs, null, '\t'));
console.log(`\nSaved ${songs.length} songs to: ${songsJsonFile}`);
