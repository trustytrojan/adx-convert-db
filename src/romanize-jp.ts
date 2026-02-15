// ugly destructuring because kuroshiro is stuck in
const { default: { default: Kuroshiro } } = await import('kuroshiro');
import KuromojiAnalyzer from 'kuroshiro-analyzer-kuromoji';

// Singleton instance to be reused across the module
const kuroshiro = new Kuroshiro();
await kuroshiro.init(new KuromojiAnalyzer());

export const romanizeJapanese = async (text: string): Promise<string> => {
	const converted: string = await kuroshiro.convert(text, {
		to: 'romaji',
		romajiSystem: 'passport',
		mode: 'spaced',
	});

	// in 'spaced' mode, it will put spaces even around existing spaces.
	// to negate this without changing the library itself, ensure only one space between words.
	return converted.replaceAll(/  +/g, ' ');
}

export const hasJapanese = (text: string): boolean => Kuroshiro.Util.hasJapanese(text);
