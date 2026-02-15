export interface Song {
	folderId: string;
	songId: string;
	title: string;
	artist: string;
	romanizedTitle?: string;
	romanizedArtist?: string;
	communityNames?: string[];
}

export interface ZetarakuSong {
	songId: string;
	title: string;
	artist: string;
	sheets: Array<{ type: string; difficulty: string }>;
}