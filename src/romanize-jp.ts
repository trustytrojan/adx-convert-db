// ugly destructuring because kuroshiro is stuck in
const { default: { default: Kuroshiro } } = await import('kuroshiro');
import KuromojiAnalyzer from 'kuroshiro-analyzer-kuromoji';

// Singleton instance to be reused across the module
const kuroshiro = new Kuroshiro();
await kuroshiro.init(new KuromojiAnalyzer());

export const romanizeJapanese = (text: string): Promise<string> =>
	kuroshiro.convert(text, {
		to: 'romaji',
		romajiSystem: 'passport',
		mode: 'spaced',
	});

export const hasJapanese = (text: string): boolean => Kuroshiro.Util.hasJapanese(text);
