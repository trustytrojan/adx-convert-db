export interface GdriveConvertData {
	id: string;
	name: string;
	lastModified: string;
}

export interface Song {
	/**
	 * Google Drive folder ID.
	 */
	id: string;

	/**
	 * Zetaraku `songId`.
	 */
	zetarakuId: string;

	/**
	 * Song title
	 */
	title: string;

	/**
	 * Song artist
	 */
	artist: string;

	/**
	 * Zetaraku `notesDesigner`.
	 */
	designer?: string;

	/**
	 * Zetaraku `releaseDate`.
	 */
	releaseDate: string;

	/**
	 * Array of difficulty levels as strings, with the index indicating the
	 * difficulty name (basic, advanced, expert, master, remaster).
	 * If no chart is available for a diff, the value is `""` or `null`.
	 * (This is how Majdata.net provides difficulty level data.)
	 */
	levels: string[];

	/**
	 * Romanized title. Not present if `title` does not contain Japanese characters.
	 */
	romanizedTitle?: string;

	/**
	 * Romanized artist. Not present if `artist` does not contain Japanese characters.
	 */
	romanizedArtist?: string;

	/**
	 * Romanized designer. Not present if `designer` does not contain Japanese characters.
	 */
	romanizedDesigner?: string;

	/**
	 * Also known as "aliases". Sourced from [GCM-Bot](https://github.com/lomotos10/GCM-bot/blob/main/data/aliases/en/maimai.tsv).
	 */
	communityNames?: string[];
}

export interface ZetarakuSongSheet {
	type: string;
	difficulty: string;
	level: string;
	levelValue: number;
	noteDesigner: string | null;
}

export interface ZetarakuSong {
	songId: string;
	title: string;
	artist: string;
	sheets: ZetarakuSongSheet[];
	releaseDate: string;
}
