import { songsJsonFile } from './shared.ts';
import { MajdataSong, Song } from './types.ts';
import { hasJapanese, romanizeJapanese } from './romanize-jp.ts';
import fs from 'node:fs';

const majdataFile = 'data/majdata.json';

if (!fs.existsSync(majdataFile)) {
	const url = 'https://majdata.net/api3/api/maichart/list';
	const resp = await fetch(url);

	if (!resp.ok)
		throw new Error(`${url} -> ${resp.status} ${resp.statusText}`);

	fs.writeFileSync(majdataFile, await resp.text());
}

const majdataRaw = fs.readFileSync(majdataFile).toString();

const majdataSongs: MajdataSong[] = JSON.parse(majdataRaw);
const songs: Song[] = JSON.parse(fs.readFileSync(songsJsonFile).toString());

for (const { id, title, artist } of majdataSongs) {
	songs.push({
		majdataId: id,
		title,
		artist,
		...(hasJapanese(title) ? { romanizedTitle: await romanizeJapanese(title) } : {}),
		...(hasJapanese(artist) ? { romanizedArtist: await romanizeJapanese(artist) } : {}),
	});
}

fs.writeFileSync(songsJsonFile, JSON.stringify(songs, null, '\t'));
