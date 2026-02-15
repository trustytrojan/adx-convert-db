import { songsJsonFile } from './shared.ts';
import { Song } from './types.ts';
import fs from 'node:fs';

const communityNamesFile = 'data/community-names.tsv';

if (!fs.existsSync(communityNamesFile)) {
	const communityNamesTsvUrl = 'https://github.com/lomotos10/GCM-bot/raw/refs/heads/main/data/aliases/en/maimai.tsv';
	const resp = await fetch(communityNamesTsvUrl);

	if (!resp.ok)
		throw new Error(`${communityNamesTsvUrl} -> ${resp.status} ${resp.statusText}`);

	fs.writeFileSync(communityNamesFile, await resp.text());
}

const communityNamesRaw = fs.readFileSync(communityNamesFile).toString();
const communityNamesLines = communityNamesRaw.split('\n');

const song2communityNames = Object.fromEntries(communityNamesLines.map((l) => {
	const tabSeparated = l.split('\t');
	const songName = tabSeparated[0];
	const communityNames = tabSeparated.slice(1);
	return [songName, communityNames];
}));

const songs: Song[] = JSON.parse(fs.readFileSync(songsJsonFile).toString());

// perform insertion
for (const song of songs) {
	let key = song.zetarakuId;

	// annoying edge case
	if (song.zetarakuId === 'Link')
		key = 'Link (maimai)';
	else if (song.zetarakuId === 'Link (2)')
		key = 'Link';

	const communityNames = song2communityNames[key];

	if (communityNames?.length === 0)
		continue;

	song.communityNames = communityNames;
}

fs.writeFileSync(songsJsonFile, JSON.stringify(songs, null, '\t'));
