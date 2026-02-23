import fs from 'node:fs';
import { hasJapanese, romanizeJapanese } from './romanize-jp.ts';
import { songName2FolderIdFile, songsJsonFile, zetarakuJsonFile } from './shared.ts';
import { Song, ZetarakuSong } from './types.ts';

const zetarakuJsonUrl = 'https://dp4p6x0xfi5o9.cloudfront.net/maimai/data.json';

// Download zetaraku.json from their Cloudfront deployed static URL
if (!fs.existsSync(zetarakuJsonFile)) {
	const r = await fetch(zetarakuJsonUrl);
	if (!r.ok)
		throw new Error(`${zetarakuJsonUrl} -> ${r.status} ${r.statusText}`);
	fs.writeFileSync(zetarakuJsonFile, await r.text());
	console.log(`Downloaded ${zetarakuJsonFile}`);
}

// Load data
const songName2folderId: Record<string, string> = JSON.parse(fs.readFileSync(songName2FolderIdFile).toString());
const folderId2songName = Object.fromEntries(Object.entries(songName2folderId).map(([a, b]) => [b, a]));
const mySongNames = Object.keys(songName2folderId);
const zetarakuSongs: ZetarakuSong[] = JSON.parse(fs.readFileSync(zetarakuJsonFile).toString()).songs;

// Regex patterns
const possiblyUtageRegex = /^[\(\[].[\)\]] ?(.+)$/;
const utageDifficultyRegex = /^【(.)】$/;

// keep specifically utage song names for separate searching
const possiblyUtage = RegExp.prototype.test.bind(possiblyUtageRegex);
const utageSongNames = mySongNames.filter(possiblyUtage);

// Difficulty conversion for Wonderland Wars
const wwdiff2number = {
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
	// WE MUST NORMALIZE HERE TO HANDLE JAPANESE ACCENTS SOMETIMES BEING SEPARATE CHARACTERS!!!
	s.normalize()
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

	return false;
};

type OptionalString = string | undefined;
type ThreeOptionalStrings = [OptionalString, OptionalString, OptionalString];

/**
 * Try to find folderIds for a non-utage song
 * Plural because there are `[ST]` and `[DX]` variants along with untagged folder names
 * @returns Exactly 3 `string | undefined`
 */
const findNonUtageFolderIds = (songId: string, title: string): ThreeOptionalStrings => {
	const keySongId = toSearchKey(songId);
	const keyTitle = toSearchKey(title);

	const searchMappings = (suffix: string = ''): string | undefined =>
		songName2folderId[songId + suffix]
		|| songName2folderId[title + suffix]
		|| searchFriendlyMap[keySongId + suffix]
		|| searchFriendlyMap[keyTitle + suffix];

	return [
		searchMappings(),
		searchMappings(' [DX]'),
		searchMappings(' [ST]'),
	];
};

/**
 * Try to find gdrive folder names for a utage song's non-utage base
 */
const findUtageGdriveName = (nonUtageName: string): (string | undefined)[] =>
	utageSongNames.filter((s) => possiblyUtageRegex.test(s) && s.includes(nonUtageName));

/**
 * Convert a non-utage song name to its gdrive utage counterpart
 */
const convertToGdriveUtageName = (nonUtageName: string, difficulty: string): string | undefined => {
	let match: RegExpMatchArray | null;

	// Handle "Garakuta Doll Play (1)" -> "[宴 NO.1] Garakuta Doll Play"
	if ((match = nonUtageName.match(/^Garakuta Doll Play \((\d)\)$/))) {
		const num = match[1];
		return `[宴 NO.${num}] Garakuta Doll Play`;
	}

	// Handle "Wonderland Wars オープニング (EASY)" -> "[宴 NO.1] Wonderland Wars オープニング"
	if ((match = nonUtageName.match(/^Wonderland Wars オープニング \(([A-Za-z:]+)\)$/))) {
		const diff = match[1];
		const num = wwdiff2number[diff as keyof typeof wwdiff2number];
		if (num)
			return `[宴 NO.${num}] Wonderland Wars オープニング`;
	}

	// Handle "(宴) Reach For The Stars (2)" -> "[difficultyChar] Reach For The Stars"
	if ((match = utageDifficultyRegex.exec(difficulty))) {
		const difficultyChar = match[1];
		const rftsName = nonUtageName.replace(/ \(\d\)$/, '');
		return `[${difficultyChar}] ${rftsName}`;
	}
};

/**
 * Try to find folderIds for a utage song
 * Plural because there are `[1P]`, `[2P]`, `[EASY]`, and `[HARD]` variants
 */
const findUtageFolderIds = (nonUtageName: string, difficulty: string): (string | undefined)[] | undefined => {
	// First try: find existing gdrive name that includes the non-utage name
	const gdriveNames = findUtageGdriveName(nonUtageName);
	if (gdriveNames.length)
		return gdriveNames.map((n) => n && songName2folderId[n]);

	// Second try: convert to gdrive name using special rules
	const convertedName = convertToGdriveUtageName(nonUtageName, difficulty);
	if (convertedName && convertedName in songName2folderId)
		return [songName2folderId[convertedName]];
};

/**
 * Create a Song object from using Zetaraku & Google Drive folder data.
 */
const createSongObject = async (z: ZetarakuSong, folderId: string): Promise<Song> => {
	// default to listing all level values
	let levels = z.sheets.map((s) => s.level);

	const folderName = folderId2songName[folderId];
	if (!folderName)
		throw new Error('this is not good!');

	// if zetaraku reports both chart types:
	if (z.sheets.some((s) => s.type === 'dx') && z.sheets.some((s) => s.type === 'std')) {
		// if this convert folder is a DX convert:
		if (folderName.endsWith('[DX]'))
			levels = z.sheets.filter((s) => s.type === 'dx').map((s) => s.level);
		else
			levels = z.sheets.filter((s) => s.type === 'std').map((s) => s.level);
	}

	// remove duplicates, in case the same designer worked on 2+ sheets
	const noteDesigners = new Set(z.sheets.map((s) => s.noteDesigner).filter((s) => s && s !== '-'));
	const designer = noteDesigners.size > 0 && noteDesigners.values().reduce((prev, curr) => `${prev},${curr}`);

	return {
		id: folderId,
		zetarakuId: z.songId,
		title: folderName,
		artist: z.artist,
		...(designer ? { designer } : {}),
		releaseDate: z.releaseDate,
		levels,
		...(hasJapanese(folderName) ? { romanizedTitle: await romanizeJapanese(folderName) } : {}),
		...(hasJapanese(z.artist) ? { romanizedArtist: await romanizeJapanese(z.artist) } : {}),
		...(designer && hasJapanese(designer) ? { romanizedDesigner: await romanizeJapanese(designer) } : {}),
	};
};

// Process songs
const songs: Song[] = [];
const notFoundSongIds: string[] = [];
const notFoundButLikelyNotConverted: string[] = [];
let utageSongsProcessed = 0;

for (const songEntry of zetarakuSongs) {
	const { songId, title, sheets } = songEntry;
	const type = sheets[0]?.type;
	const difficulty = sheets[0]?.difficulty;

	if (type === 'utage') {
		// Utage song handling

		// Regex exec on title before songId.
		// This is a hardcode specifically for "[協]青春コンプレックス" because songId ends
		// in japanese text that is impossible to match to gdrive folder names.
		const match = possiblyUtageRegex.exec(title) ?? possiblyUtageRegex.exec(songId);
		if (!match)
			continue;

		const nonUtageName = match[1];
		if (!nonUtageName)
			continue;

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
		let folderIds = findUtageFolderIds(nonUtageName, difficulty || '');

		if (!folderIds?.length) {
			// In gdrive but couldn't find folderId
			notFoundSongIds.push(songId);
			continue;
		}

		// Hardcode specifically for "[協]青春コンプレックス" because gdrive has [EASY] and [HARD] variants
		if (songId.endsWith('（ヒーロー級）')) {
			// translates to 'hero class'
			// filter to HARD charts
			folderIds = folderIds.filter((id) => id && folderId2songName[id].endsWith('[HARD]'));
		} else if (songId.endsWith('（入門編）')) {
			// translates to 'introductory edition'
			// filter to EASY charts
			folderIds = folderIds.filter((id) => id && folderId2songName[id].endsWith('[EASY]'));
		}

		const addSong = async (folderId: string) => {
			const songObj = await createSongObject(songEntry, folderId);
			songs.push(songObj);
			++utageSongsProcessed;
		};

		folderIds.filter((s) => s !== undefined).map(addSong);
	} else {
		// Check if this song is likely in our gdrive database
		if (!songLikelyInGdrive(songId, title)) {
			notFoundButLikelyNotConverted.push(songId);
			continue;
		}

		// Try to find the folderId
		const [folderId, dxFolderId, stFolderId] = findNonUtageFolderIds(songId, title);

		if (!folderId) {
			// In gdrive but couldn't find folderId
			notFoundSongIds.push(songId);
			continue;
		}

		const addSong = async (folderId: string) => {
			const songObj = await createSongObject(songEntry, folderId);
			songs.push(songObj);
		};

		await addSong(folderId);

		if (dxFolderId)
			await addSong(dxFolderId);
		if (stFolderId)
			await addSong(stFolderId);
	}
}

const collectedSongTitles = new Set(songs.map((s) => s.title));
const allDxConverts = new Set(mySongNames.filter((s) => s.endsWith('[DX]')));
const allStConverts = new Set(mySongNames.filter((s) => s.endsWith('[ST]')));
const all1pConverts = new Set(mySongNames.filter((s) => s.endsWith('[1P]')));
const all2pConverts = new Set(mySongNames.filter((s) => s.endsWith('[2P]')));
const allEzConverts = new Set(mySongNames.filter((s) => s.endsWith('[EASY]')));
const allHdConverts = new Set(mySongNames.filter((s) => s.endsWith('[HARD]')));
console.log('Uncollected DX converts:', allDxConverts.difference(collectedSongTitles));
console.log('Uncollected ST converts:', allStConverts.difference(collectedSongTitles));
console.log('Uncollected 1P converts:', all1pConverts.difference(collectedSongTitles));
console.log('Uncollected 2P converts:', all2pConverts.difference(collectedSongTitles));
console.log('Uncollected EASY converts:', allEzConverts.difference(collectedSongTitles));
console.log('Uncollected HARD converts:', allHdConverts.difference(collectedSongTitles));

// Log results
console.log(`\nTotal matched songs: ${songs.length}`);
console.log(`Utage songs processed: ${utageSongsProcessed}`);

if (notFoundSongIds.length > 0) {
	console.log(`\nzetaraku songIds found in gdrive but could not match:`);
	for (const songId of notFoundSongIds)
		console.log(`'${songId}'`);
	console.log(`\nTotal unmatched: ${notFoundSongIds.length}`);
}

if (notFoundButLikelyNotConverted.length > 0) {
	console.log(`\nzetaraku songIds probably not converted:`);
	for (const songId of notFoundButLikelyNotConverted)
		console.log(`'${songId}'`);
	console.log(`\nTotal unmatched: ${notFoundButLikelyNotConverted.length}`);
}

// Save results
fs.writeFileSync(songsJsonFile, JSON.stringify(songs, null, '\t'));
console.log(`\nSaved ${songs.length} songs to: ${songsJsonFile}`);
