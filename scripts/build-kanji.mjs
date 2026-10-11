#!/usr/bin/env node
/**
 * Builds src/modules/kanji/kanji.json from the EDRDG dictionaries:
 *
 *   node scripts/build-kanji.mjs <kanjidic2.xml.gz> <JMdict.gz>
 *
 * - Kanji set: old JLPT levels 4+3 (≈ N5+N4) + school grades 1–2 + the default study list.
 * - Readings, meanings and stroke counts come from KANJIDIC2.
 * - 2–3 example words per kanji are picked from JMdict: common words (news1/ichi1),
 *   at most 3 characters, using only kanji from the set. German glosses where JMdict has them.
 * - German kanji meanings for the default list are maintained by hand below.
 *
 * KANJIDIC2 and JMdict © Electronic Dictionary Research and Development Group, CC BY-SA 4.0.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [kdPath, jmPath] = process.argv.slice(2);
if (!kdPath || !jmPath) {
  console.error('usage: node scripts/build-kanji.mjs <kanjidic2.xml.gz> <JMdict.gz>');
  process.exit(1);
}

/** Default study list (JLPT N5) with German meanings. */
const N5_DE = {
  日: 'Tag, Sonne', 一: 'eins', 国: 'Land', 人: 'Mensch, Person', 年: 'Jahr', 大: 'groß', 十: 'zehn', 二: 'zwei',
  本: 'Buch; Ursprung', 中: 'Mitte, innen', 長: 'lang; Leiter', 出: 'hinausgehen', 三: 'drei', 時: 'Zeit, Stunde',
  行: 'gehen', 見: 'sehen', 月: 'Mond, Monat', 後: 'nach, hinten', 前: 'vor, vorne', 生: 'Leben, geboren werden',
  五: 'fünf', 間: 'Zwischenraum, Zeitraum', 上: 'oben', 東: 'Osten', 四: 'vier', 今: 'jetzt', 金: 'Gold, Geld',
  九: 'neun', 入: 'hineingehen', 学: 'lernen', 高: 'hoch, teuer', 円: 'Yen; Kreis', 子: 'Kind', 外: 'draußen',
  八: 'acht', 六: 'sechs', 下: 'unten', 来: 'kommen', 気: 'Geist, Stimmung', 小: 'klein', 七: 'sieben', 山: 'Berg',
  話: 'sprechen, Gespräch', 女: 'Frau', 北: 'Norden', 午: 'Mittag', 百: 'hundert', 書: 'schreiben',
  先: 'vorher, voraus', 名: 'Name', 川: 'Fluss', 千: 'tausend', 水: 'Wasser', 半: 'halb', 男: 'Mann', 西: 'Westen',
  電: 'Elektrizität', 校: 'Schule', 語: 'Sprache, Wort', 土: 'Erde, Boden', 木: 'Baum, Holz', 聞: 'hören, fragen',
  食: 'essen', 車: 'Auto, Wagen', 何: 'was', 南: 'Süden', 万: 'zehntausend', 毎: 'jeder', 白: 'weiß', 天: 'Himmel',
  母: 'Mutter', 火: 'Feuer', 右: 'rechts', 読: 'lesen', 友: 'Freund', 左: 'links', 休: 'ruhen', 父: 'Vater',
  雨: 'Regen', 分: 'Minute; teilen; verstehen', 曜: 'Wochentag', 週: 'Woche', 会: 'treffen; Versammlung',
  社: 'Firma; Schrein', 店: 'Laden', 駅: 'Bahnhof', 道: 'Weg, Straße', 新: 'neu', 古: 'alt', 安: 'billig; ruhig',
  多: 'viel', 少: 'wenig', 立: 'stehen', 買: 'kaufen', 飲: 'trinken', 言: 'sagen', 手: 'Hand', 目: 'Auge',
  口: 'Mund', 足: 'Fuß, Bein', 耳: 'Ohr', 花: 'Blume', 空: 'Himmel; leer',
};

/**
 * Everyday beginner words, preferred as examples (in this order): "word:reading:German".
 * Each one is verified against JMdict (the reading must exist there) – mismatches are reported.
 */
const BASIC_SRC = `
日本:にほん:Japan|毎日:まいにち:jeden Tag|今日:きょう:heute|明日:あした:morgen|日曜日:にちようび:Sonntag|月曜日:げつようび:Montag
火曜日:かようび:Dienstag|水曜日:すいようび:Mittwoch|木曜日:もくようび:Donnerstag|金曜日:きんようび:Freitag|土曜日:どようび:Samstag
一人:ひとり:eine Person; allein|二人:ふたり:zwei Personen|一つ:ひとつ:eins (Stück)|二つ:ふたつ:zwei (Stück)|三つ:みっつ:drei (Stück)
四つ:よっつ:vier (Stück)|五つ:いつつ:fünf (Stück)|六つ:むっつ:sechs (Stück)|七つ:ななつ:sieben (Stück)|八つ:やっつ:acht (Stück)
九つ:ここのつ:neun (Stück)|一日:いちにち:ein Tag|二日:ふつか:der Zweite; zwei Tage|三日:みっか:der Dritte; drei Tage
一月:いちがつ:Januar|二月:にがつ:Februar|三月:さんがつ:März|四月:しがつ:April|五月:ごがつ:Mai|六月:ろくがつ:Juni|七月:しちがつ:Juli
八月:はちがつ:August|九月:くがつ:September|十月:じゅうがつ:Oktober|十:じゅう:zehn|百:ひゃく:hundert|千:せん:tausend|万:まん:zehntausend
一万:いちまん:zehntausend|百円:ひゃくえん:100 Yen|千円:せんえん:1000 Yen|三百:さんびゃく:dreihundert|六百:ろっぴゃく:sechshundert
八百:はっぴゃく:achthundert|三千:さんぜん:dreitausend|円:えん:Yen|何:なに:was|何時:なんじ:wie viel Uhr|何人:なんにん:wie viele Personen
何曜日:なんようび:welcher Wochentag|何月:なんがつ:welcher Monat|今:いま:jetzt|今月:こんげつ:diesen Monat|今週:こんしゅう:diese Woche
今年:ことし:dieses Jahr|先月:せんげつ:letzten Monat|先週:せんしゅう:letzte Woche|来月:らいげつ:nächsten Monat|来週:らいしゅう:nächste Woche
来年:らいねん:nächstes Jahr|毎週:まいしゅう:jede Woche|毎月:まいつき:jeden Monat|毎年:まいとし:jedes Jahr|先生:せんせい:Lehrer(in)
学生:がくせい:Student(in)|大学:だいがく:Universität|大学生:だいがくせい:Student(in)|学校:がっこう:Schule|小学校:しょうがっこう:Grundschule
高校:こうこう:Oberschule|会社:かいしゃ:Firma|会社員:かいしゃいん:Firmenangestellte(r)|社員:しゃいん:Angestellte(r)|社長:しゃちょう:Firmenchef(in)
銀行:ぎんこう:Bank|電車:でんしゃ:Zug|電話:でんわ:Telefon|電気:でんき:Strom; Licht|時間:じかん:Zeit|時計:とけい:Uhr|天気:てんき:Wetter
元気:げんき:gesund, munter|外国:がいこく:Ausland|外国人:がいこくじん:Ausländer(in)|中国:ちゅうごく:China|日本人:にほんじん:Japaner(in)
日本語:にほんご:Japanisch|英語:えいご:Englisch|本:ほん:Buch|本屋:ほんや:Buchhandlung|辞書:じしょ:Wörterbuch|図書館:としょかん:Bibliothek
入口:いりぐち:Eingang|出口:でぐち:Ausgang|名前:なまえ:Name|有名:ゆうめい:berühmt|午前:ごぜん:vormittags|午後:ごご:nachmittags
半分:はんぶん:Hälfte|半:はん:halb|上手:じょうず:geschickt, gut (in etw.)|下手:へた:ungeschickt, schlecht (in etw.)|上:うえ:oben, auf
下:した:unten, unter|中:なか:innen, in|外:そと:draußen|前:まえ:vorne, vor|後ろ:うしろ:hinten|右:みぎ:rechts|左:ひだり:links
東:ひがし:Osten|西:にし:Westen|南:みなみ:Süden|北:きた:Norden|東京:とうきょう:Tokyo|山:やま:Berg|富士山:ふじさん:Berg Fuji
川:かわ:Fluss|花:はな:Blume|花見:はなみ:Kirschblütenschau|雨:あめ:Regen|水:みず:Wasser|木:き:Baum|お金:おかね:Geld|空:そら:Himmel
魚:さかな:Fisch|車:くるま:Auto|自転車:じてんしゃ:Fahrrad|駅:えき:Bahnhof|駅前:えきまえ:vor dem Bahnhof|店:みせ:Laden|道:みち:Weg, Straße
新聞:しんぶん:Zeitung|新しい:あたらしい:neu|古い:ふるい:alt|高い:たかい:hoch; teuer|安い:やすい:billig|大きい:おおきい:groß
小さい:ちいさい:klein|長い:ながい:lang|白い:しろい:weiß|多い:おおい:viel|少ない:すくない:wenig|少し:すこし:ein bisschen
見る:みる:sehen|見せる:みせる:zeigen|聞く:きく:hören; fragen|書く:かく:schreiben|読む:よむ:lesen|話す:はなす:sprechen
話:はなし:Gespräch, Geschichte|言う:いう:sagen|行く:いく:gehen|来る:くる:kommen|出る:でる:hinausgehen|入る:はいる:hineingehen
食べる:たべる:essen|飲む:のむ:trinken|買う:かう:kaufen|休む:やすむ:sich ausruhen|休み:やすみ:Pause, Ferien|立つ:たつ:stehen
会う:あう:treffen|分かる:わかる:verstehen|生まれる:うまれる:geboren werden|手:て:Hand|目:め:Auge|耳:みみ:Ohr|口:くち:Mund
足:あし:Fuß, Bein|父:ちち:(mein) Vater|母:はは:(meine) Mutter|お父さん:おとうさん:Vater (fremder)|お母さん:おかあさん:Mutter (fremde)
友達:ともだち:Freund(in)|子供:こども:Kind|男:おとこ:Mann|女:おんな:Frau|男の子:おとこのこ:Junge|女の子:おんなのこ:Mädchen
男の人:おとこのひと:Mann|女の人:おんなのひと:Frau|大人:おとな:Erwachsene(r)|人:ひと:Mensch|国:くに:Land|年:とし:Jahr
月:つき:Mond; Monat|日:ひ:Tag; Sonne|食べ物:たべもの:Essen|飲み物:のみもの:Getränk|買い物:かいもの:Einkauf|食事:しょくじ:Mahlzeit
生活:せいかつ:Alltag, Leben|人間:にんげん:Mensch|一年:いちねん:ein Jahr|先:さき:vorne; zuerst|白:しろ:Weiß
`;
const BASIC = BASIC_SRC.split(/[|\n]/).map((x) => x.trim()).filter(Boolean).map((line) => {
  const [w, r, de] = line.split(':');
  return { w, r, de };
});
const basicRank = new Map(BASIC.map((b, i) => [`${b.w}:${b.r}`, i]));
const basicDe = new Map(BASIC.map((b) => [`${b.w}:${b.r}`, b.de]));
const basicFound = new Set();

// ---------------------------------------------------------------- KANJIDIC2
const kd = gunzipSync(readFileSync(kdPath)).toString('utf8');
const info = new Map();
for (const m of kd.matchAll(/<character>([\s\S]*?)<\/character>/g)) {
  const c = m[1];
  const lit = /<literal>(.+?)<\/literal>/.exec(c)?.[1];
  if (!lit) continue;
  const grade = Number(/<grade>(\d+)<\/grade>/.exec(c)?.[1] ?? 0);
  const jlpt = Number(/<jlpt>(\d)<\/jlpt>/.exec(c)?.[1] ?? 0);
  const strokes = Number(/<stroke_count>(\d+)<\/stroke_count>/.exec(c)?.[1] ?? 0);
  const on = [...c.matchAll(/<reading r_type="ja_on">(.+?)<\/reading>/g)].map((x) => x[1]);
  const kun = [...c.matchAll(/<reading r_type="ja_kun">(.+?)<\/reading>/g)].map((x) => x[1]);
  const en = [...c.matchAll(/<meaning>(.+?)<\/meaning>/g)].map((x) => x[1]);
  info.set(lit, { grade, jlpt, strokes, on, kun, en });
}

const set = new Set(Object.keys(N5_DE));
for (const [k, v] of info) if (v.jlpt === 4 || v.jlpt === 3 || (v.grade >= 1 && v.grade <= 2)) set.add(k);

// ---------------------------------------------------------------- JMdict
const jm = gunzipSync(readFileSync(jmPath)).toString('utf8');
const isKanji = (ch) => /\p{Script=Han}/u.test(ch);
const words = []; // { w, r, en, de, score }
for (const m of jm.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
  const e = m[1];
  const kebs = [...e.matchAll(/<k_ele>([\s\S]*?)<\/k_ele>/g)].map((k) => ({
    keb: /<keb>(.+?)<\/keb>/.exec(k[1])?.[1] ?? '',
    pri: [...k[1].matchAll(/<ke_pri>(.+?)<\/ke_pri>/g)].map((p) => p[1]),
  }));
  const rebs = [...e.matchAll(/<r_ele>([\s\S]*?)<\/r_ele>/g)].map((r) => ({
    reb: /<reb>(.+?)<\/reb>/.exec(r[1])?.[1] ?? '',
    restr: [...r[1].matchAll(/<re_restr>(.+?)<\/re_restr>/g)].map((x) => x[1]),
    nokanji: /<re_nokanji\/>/.test(r[1]),
  }));
  const firstSense = /<sense>([\s\S]*?)<\/sense>/.exec(e)?.[1] ?? '';
  const en = [...e.matchAll(/<gloss>(.+?)<\/gloss>/g)].slice(0, 2).map((g) => g[1]).join('; ');
  const de = [...e.matchAll(/<gloss xml:lang="ger">(.+?)<\/gloss>/g)].slice(0, 2).map((g) => g[1]).join('; ');
  // hand-picked beginner words can be any spelling of the entry (e.g. 入口 next to 入り口)
  for (const { keb } of kebs) {
    const basic = rebs.find((x) => basicRank.has(`${keb}:${x.reb}`));
    if (!basic) continue;
    const key = `${keb}:${basic.reb}`;
    if (!basicFound.has(key)) {
      basicFound.add(key);
      words.push({ w: keb, r: basic.reb, en, de: basicDe.get(key), score: basicRank.get(key) / 1000 });
    }
  }
  // other common words: main spelling only, 2–3 characters, only kanji from the set.
  // (No German here – JMdict's German glosses are too uneven to show without checking.)
  if (/&uk;/.test(firstSense)) continue; // usually written in kana – not a good kanji example
  const { keb, pri } = kebs[0] ?? {};
  if (!keb || basicFound.has(`${keb}:${rebs[0]?.reb}`)) continue;
  const len = [...keb].length;
  if (len < 2 || len > 3) continue;
  if (!pri.some((p) => p === 'news1' || p === 'ichi1' || p === 'spec1')) continue;
  if (![...keb].some(isKanji) || ![...keb].every((ch) => !isKanji(ch) || set.has(ch))) continue;
  const r = rebs.find((x) => !x.nokanji && (!x.restr.length || x.restr.includes(keb)));
  if (!r) continue;
  const nf = Number(pri.find((p) => p.startsWith('nf'))?.slice(2) ?? 48);
  words.push({ w: keb, r: r.reb, en, score: 10 + nf + (pri.includes('ichi1') ? 0 : 6) + len * 3 });
}
const missingBasic = BASIC.filter((b) => !basicFound.has(`${b.w}:${b.r}`)).map((b) => `${b.w}(${b.r})`);
if (missingBasic.length) console.warn('not found in JMdict with that reading:', missingBasic.join(' '));
words.sort((a, b) => a.score - b.score);

// ---------------------------------------------------------------- output
const out = [];
for (const k of set) {
  const i = info.get(k);
  if (!i) continue;
  const ex = [];
  for (const w of words) {
    if (ex.length >= 3) break;
    if (!w.w.includes(k) || ex.some((e) => e.w === w.w)) continue;
    ex.push({ w: w.w, r: w.r, en: w.en, ...(w.de ? { de: w.de } : {}) });
  }
  out.push({
    kanji: k,
    strokes: i.strokes,
    grade: i.grade || undefined,
    jlpt: i.jlpt || undefined,
    n5: k in N5_DE,
    on: i.on.slice(0, 4),
    kun: i.kun.slice(0, 5),
    en: i.en.slice(0, 4),
    ...(N5_DE[k] ? { de: N5_DE[k] } : {}),
    examples: ex,
  });
}
out.sort((a, b) => Number(b.n5) - Number(a.n5) || (a.grade ?? 9) - (b.grade ?? 9) || a.strokes - b.strokes);
writeFileSync(join(root, 'src/modules/kanji/kanji.json'), JSON.stringify(out));
console.log(`wrote ${out.length} kanji (${out.filter((k) => k.n5).length} in the default N5 list), ${words.length} candidate words`);
