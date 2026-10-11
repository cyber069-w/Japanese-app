import { createKanaModule } from '../kana/createKanaModule';
import mnemonics from './mnemonics.json';
import words from './words.json';

export const katakana = createKanaModule({
  id: 'katakana',
  script: 'katakana',
  name: 'Katakana',
  nameJa: 'カタカナ',
  icon: 'ア',
  description: 'Katakana for loanwords – including ー, small ッ and sounds like ティ and ファ.',
  mnemonics,
  words,
  wordsName: 'Loanwords',
  wordsDescription: 'Read words like コーヒー, テレビ, パン – with long vowels ー and small ッ.',
  confusables: [
    ['シ', 'ツ', 'ン', 'ソ'], ['ソ', 'ン', 'リ'], ['ク', 'ケ', 'タ'], ['ワ', 'ウ', 'フ', 'ラ'], ['ノ', 'メ', 'ヌ'],
    ['チ', 'テ', 'ナ'], ['ア', 'マ', 'ム'], ['コ', 'ユ', 'ロ', 'ヨ'], ['ス', 'ヌ'], ['ヲ', 'ヨ', 'ラ'], ['セ', 'ヒ'], ['ハ', 'ル', 'ヘ'],
    ['エ', 'ニ', 'ユ'], ['オ', 'ホ', 'キ'],
  ],
  confusableDrill: true,
});
