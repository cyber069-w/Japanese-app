import { createKanaModule } from '../kana/createKanaModule';
import mnemonics from './mnemonics.json';
import words from './words.json';

export const hiragana = createKanaModule({
  id: 'hiragana',
  script: 'hiragana',
  name: 'Hiragana',
  nameJa: 'ひらがな',
  icon: 'あ',
  description: 'The 46 basic characters, dakuten and combinations – with memory pictures.',
  mnemonics,
  words,
  wordsName: 'Words',
  wordsDescription: 'Read real words like ねこ, すし, がっこう.',
  // characters that are easy to confuse – used as tricky wrong options
  confusables: [
    ['あ', 'お', 'め', 'ぬ'], ['い', 'り', 'こ'], ['う', 'つ', 'ら'], ['さ', 'き', 'ち'], ['は', 'ほ', 'け', 'に'],
    ['ね', 'れ', 'わ'], ['る', 'ろ'], ['ま', 'も', 'よ'], ['し', 'つ', 'く'], ['そ', 'て'], ['な', 'た'], ['ゆ', 'よ'],
  ],
});
