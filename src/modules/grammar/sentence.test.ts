import { describe, expect, it } from 'vitest';
import { chunkText, parseSentence, validOrders } from './sentence';

describe('parseSentence', () => {
  it('reads furigana, particles and chunks', () => {
    const s = parseSentence('私[わたし]{は} 学生[がくせい]です{か}。');
    expect(s.chunks.map(chunkText)).toEqual(['私は', '学生ですか。']);
    expect(s.text).toBe('私は学生ですか。');
    expect(s.reading).toBe('わたしはがくせいですか。');
    expect(s.chunks[0].segs).toEqual([{ text: '私', reading: 'わたし' }, { text: 'は', particle: true }]);
  });
  it('puts furigana only on the kanji run', () => {
    const s = parseSentence('起[お]きます');
    expect(s.chunks[0].segs).toEqual([{ text: '起', reading: 'お' }, { text: 'きます' }]);
    const t = parseSentence('イタリア料理[りょうり]{が}');
    expect(t.chunks[0].segs[0]).toEqual({ text: 'イタリア' });
    expect(t.chunks[0].segs[1]).toEqual({ text: '料理', reading: 'りょうり' });
  });
});

describe('validOrders', () => {
  it('lets particle phrases move but keeps the predicate last', () => {
    const s = parseSentence('毎朝[まいあさ] 6時[ろくじ]{に} 起[お]きます。');
    const orders = validOrders(s.chunks).map((o) => o.join(''));
    expect(orders).toContain('012');
    expect(orders).not.toContain('102');
  });
  it('allows swapping argument phrases', () => {
    const s = parseSentence('駅[えき]{で} 新聞[しんぶん]{を} 買[か]います。');
    const orders = validOrders(s.chunks).map((o) => o.join(''));
    expect(orders.sort()).toEqual(['012', '102']);
  });
  it('keeps modifiers in front of their noun', () => {
    const s = parseSentence('奈良[なら]{は} 古[ふる]い 町[まち]です。');
    const orders = validOrders(s.chunks).map((o) => o.join(''));
    expect(orders).toEqual(['012']);
  });
});
