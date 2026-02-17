export interface Song {
	/**
	 * Google Drive folder ID.
	 * If present, then `majdataId` should not be, and this song is a convert hosted
	 * in the [Google Drive folder](https://drive.google.com/drive/u/0/folders/1NiZ9rL19qKLqt0uNcP5tIqc0fUrksAPs).
	 */
	id?: string;

	/**
	 * Zetaraku `songId`. Not present on Majdata songs.
	 */
	zetarakuId?: string;

	title: string;
	artist: string;

	/**
	 * Romanized title. Not present if `title` does not contain Japanese characters.
	 */
	romanizedTitle?: string;

	/**
	 * Romanized artist. Not present if `artist` does not contain Japanese characters.
	 */
	romanizedArtist?: string;

	/**
	 * Also known as "aliases". Sourced from [GCM-Bot](https://github.com/lomotos10/GCM-bot/blob/main/data/aliases/en/maimai.tsv).
	 */
	communityNames?: string[];
}

export interface ZetarakuSong {
	songId: string;
	title: string;
	artist: string;
	sheets: Array<{ type: string; difficulty: string }>;
}
