import { describe, expect, it } from 'vitest';
import { nameToKatakana } from './katakanaName';

const cases: Array<[string, string]> = [
  ['Sebastian', 'ゼバスティアン'],
  ['Max', 'マックス'],
  ['Anna', 'アンナ'],
  ['Hanna', 'ハンナ'],
  ['Emma', 'エマ'],
  ['Lena', 'レナ'],
  ['Sophie', 'ゾフィー'],
  ['Felix', 'フェリックス'],
  ['Jonas', 'ヨナス'],
  ['Julia', 'ユリア'],
  ['Stefan', 'シュテファン'],
  ['Müller', 'ミュラー'],
  ['Schmidt', 'シュミット'],
  ['Matthias', 'マッティアス'],
  ['Moritz', 'モリッツ'],
  ['Philipp', 'フィリップ'],
  ['Sebastian', 'ゼバスティアン'],
  ['Alexander', 'アレクサンダー'],
  ['Christian', 'クリスティアン'],
  ['Charlotte', 'シャルロッテ'],
  ['Wolfgang', 'ヴォルフガング'],
  ['Jürgen', 'ユルゲン'],
  ['Friedrich', 'フリードリヒ'],
  ['Daniel', 'ダニエル'],
  ['Becker', 'ベッカー'],
  ['Noah', 'ノア'],
  ['Lehmann', 'レーマン'],
  ['Marie', 'マリー'],
  ['Clara', 'クララ'],
  ['Finn', 'フィン'],
  ['Bach', 'バッハ'],
  ['Leipzig', 'ライプツィヒ'],
  ['Hamburg', 'ハンブルク'],
  ['Lukas', 'ルーカス'],
];

describe('nameToKatakana', () => {
  it.each(cases)('%s → %s', (input, expected) => {
    expect(nameToKatakana(input)).toBe(expected);
  });

  it('joins words with ・ and hyphens with ＝', () => {
    expect(nameToKatakana('Anna Müller')).toBe('アンナ・ミュラー');
    expect(nameToKatakana('Hans-Peter')).toBe('ハンス＝ペーター');
    expect(nameToKatakana('Basel')).toBe('バーゼル');
    expect(nameToKatakana('Zürich')).toBe('チューリッヒ');
  });

  it('leaves Japanese input alone', () => {
    expect(nameToKatakana('マックス')).toBe('マックス');
    expect(nameToKatakana('東京')).toBe('東京');
    expect(nameToKatakana('  ')).toBe('');
  });
});
