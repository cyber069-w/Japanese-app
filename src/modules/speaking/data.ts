/**
 * Choices for the self-introduction form. Japanese is written in the grammar
 * notation (漢字[かんじ]) so it gets furigana – see grammar/sentence.ts.
 */
import type { Meaning } from '../../core/types';

export interface Country extends Meaning {
  id: string;
  ja: string;
  /** "aus der Schweiz" / "from Switzerland" */
  from: Meaning;
  /** Main language, for 何語が分かりますか. */
  lang: string;
  common?: boolean;
}

const c = (id: string, ja: string, de: string, en: string, fromDe: string, fromEn: string, lang: string, common = false): Country => ({
  id, ja, de, en, from: { de: fromDe, en: fromEn }, lang, common,
});

export const COUNTRIES: Country[] = [
  c('ch', 'スイス', 'Schweiz', 'Switzerland', 'aus der Schweiz', 'from Switzerland', 'ドイツ語[ご]', true),
  c('de', 'ドイツ', 'Deutschland', 'Germany', 'aus Deutschland', 'from Germany', 'ドイツ語[ご]', true),
  c('at', 'オーストリア', 'Österreich', 'Austria', 'aus Österreich', 'from Austria', 'ドイツ語[ご]', true),
  c('li', 'リヒテンシュタイン', 'Liechtenstein', 'Liechtenstein', 'aus Liechtenstein', 'from Liechtenstein', 'ドイツ語[ご]', true),
  c('it', 'イタリア', 'Italien', 'Italy', 'aus Italien', 'from Italy', 'イタリア語[ご]'),
  c('fr', 'フランス', 'Frankreich', 'France', 'aus Frankreich', 'from France', 'フランス語[ご]'),
  c('es', 'スペイン', 'Spanien', 'Spain', 'aus Spanien', 'from Spain', 'スペイン語[ご]'),
  c('pt', 'ポルトガル', 'Portugal', 'Portugal', 'aus Portugal', 'from Portugal', 'ポルトガル語[ご]'),
  c('nl', 'オランダ', 'Niederlande', 'the Netherlands', 'aus den Niederlanden', 'from the Netherlands', 'オランダ語[ご]'),
  c('be', 'ベルギー', 'Belgien', 'Belgium', 'aus Belgien', 'from Belgium', 'フランス語[ご]'),
  c('lu', 'ルクセンブルク', 'Luxemburg', 'Luxembourg', 'aus Luxemburg', 'from Luxembourg', 'フランス語[ご]'),
  c('gb', 'イギリス', 'Großbritannien', 'the UK', 'aus Großbritannien', 'from the UK', '英語[えいご]'),
  c('ie', 'アイルランド', 'Irland', 'Ireland', 'aus Irland', 'from Ireland', '英語[えいご]'),
  c('us', 'アメリカ', 'USA', 'the USA', 'aus den USA', 'from the USA', '英語[えいご]'),
  c('ca', 'カナダ', 'Kanada', 'Canada', 'aus Kanada', 'from Canada', '英語[えいご]'),
  c('au', 'オーストラリア', 'Australien', 'Australia', 'aus Australien', 'from Australia', '英語[えいご]'),
  c('br', 'ブラジル', 'Brasilien', 'Brazil', 'aus Brasilien', 'from Brazil', 'ポルトガル語[ご]'),
  c('mx', 'メキシコ', 'Mexiko', 'Mexico', 'aus Mexiko', 'from Mexico', 'スペイン語[ご]'),
  c('pl', 'ポーランド', 'Polen', 'Poland', 'aus Polen', 'from Poland', 'ポーランド語[ご]'),
  c('cz', 'チェコ', 'Tschechien', 'Czechia', 'aus Tschechien', 'from Czechia', 'チェコ語[ご]'),
  c('hu', 'ハンガリー', 'Ungarn', 'Hungary', 'aus Ungarn', 'from Hungary', 'ハンガリー語[ご]'),
  c('hr', 'クロアチア', 'Kroatien', 'Croatia', 'aus Kroatien', 'from Croatia', 'クロアチア語[ご]'),
  c('rs', 'セルビア', 'Serbien', 'Serbia', 'aus Serbien', 'from Serbia', 'セルビア語[ご]'),
  c('ro', 'ルーマニア', 'Rumänien', 'Romania', 'aus Rumänien', 'from Romania', 'ルーマニア語[ご]'),
  c('gr', 'ギリシャ', 'Griechenland', 'Greece', 'aus Griechenland', 'from Greece', 'ギリシャ語[ご]'),
  c('tr', 'トルコ', 'Türkei', 'Turkey', 'aus der Türkei', 'from Turkey', 'トルコ語[ご]'),
  c('se', 'スウェーデン', 'Schweden', 'Sweden', 'aus Schweden', 'from Sweden', 'スウェーデン語[ご]'),
  c('no', 'ノルウェー', 'Norwegen', 'Norway', 'aus Norwegen', 'from Norway', 'ノルウェー語[ご]'),
  c('dk', 'デンマーク', 'Dänemark', 'Denmark', 'aus Dänemark', 'from Denmark', 'デンマーク語[ご]'),
  c('fi', 'フィンランド', 'Finnland', 'Finland', 'aus Finnland', 'from Finland', 'フィンランド語[ご]'),
  c('ua', 'ウクライナ', 'Ukraine', 'Ukraine', 'aus der Ukraine', 'from Ukraine', 'ウクライナ語[ご]'),
  c('ru', 'ロシア', 'Russland', 'Russia', 'aus Russland', 'from Russia', 'ロシア語[ご]'),
  c('cn', '中国[ちゅうごく]', 'China', 'China', 'aus China', 'from China', '中国語[ちゅうごくご]'),
  c('tw', '台湾[たいわん]', 'Taiwan', 'Taiwan', 'aus Taiwan', 'from Taiwan', '中国語[ちゅうごくご]'),
  c('kr', '韓国[かんこく]', 'Südkorea', 'South Korea', 'aus Südkorea', 'from South Korea', '韓国語[かんこくご]'),
  c('jp', '日本[にほん]', 'Japan', 'Japan', 'aus Japan', 'from Japan', '日本語[にほんご]'),
  c('in', 'インド', 'Indien', 'India', 'aus Indien', 'from India', 'ヒンディー語[ご]'),
  c('th', 'タイ', 'Thailand', 'Thailand', 'aus Thailand', 'from Thailand', 'タイ語[ご]'),
  c('vn', 'ベトナム', 'Vietnam', 'Vietnam', 'aus Vietnam', 'from Vietnam', 'ベトナム語[ご]'),
  c('id', 'インドネシア', 'Indonesien', 'Indonesia', 'aus Indonesien', 'from Indonesia', 'インドネシア語[ご]'),
  c('sg', 'シンガポール', 'Singapur', 'Singapore', 'aus Singapur', 'from Singapore', '英語[えいご]'),
];

export interface Choice extends Meaning { id: string; ja: string }

export const MAJORS: Choice[] = [
  { id: 'econ', ja: '経済学[けいざいがく]', de: 'Volkswirtschaftslehre', en: 'Economics' },
  { id: 'bwl', ja: '経営学[けいえいがく]', de: 'Betriebswirtschaftslehre', en: 'Business administration' },
  { id: 'finance', ja: '金融[きんゆう]', de: 'Finance', en: 'Finance' },
  { id: 'accounting', ja: '会計学[かいけいがく]', de: 'Rechnungswesen', en: 'Accounting' },
  { id: 'marketing', ja: 'マーケティング', de: 'Marketing', en: 'Marketing' },
  { id: 'law', ja: '法学[ほうがく]', de: 'Rechtswissenschaft', en: 'Law' },
  { id: 'ir', ja: '国際関係学[こくさいかんけいがく]', de: 'Internationale Beziehungen', en: 'International relations' },
  { id: 'politics', ja: '政治学[せいじがく]', de: 'Politikwissenschaft', en: 'Political science' },
  { id: 'cs', ja: '情報科学[じょうほうかがく]', de: 'Informatik', en: 'Computer science' },
  { id: 'data', ja: 'データサイエンス', de: 'Data Science', en: 'Data science' },
  { id: 'math', ja: '数学[すうがく]', de: 'Mathematik', en: 'Mathematics' },
  { id: 'physics', ja: '物理学[ぶつりがく]', de: 'Physik', en: 'Physics' },
  { id: 'chem', ja: '化学[かがく]', de: 'Chemie', en: 'Chemistry' },
  { id: 'bio', ja: '生物学[せいぶつがく]', de: 'Biologie', en: 'Biology' },
  { id: 'med', ja: '医学[いがく]', de: 'Medizin', en: 'Medicine' },
  { id: 'pharma', ja: '薬学[やくがく]', de: 'Pharmazie', en: 'Pharmacy' },
  { id: 'eng', ja: '工学[こうがく]', de: 'Ingenieurwesen', en: 'Engineering' },
  { id: 'arch', ja: '建築学[けんちくがく]', de: 'Architektur', en: 'Architecture' },
  { id: 'env', ja: '環境学[かんきょうがく]', de: 'Umweltwissenschaften', en: 'Environmental science' },
  { id: 'psych', ja: '心理学[しんりがく]', de: 'Psychologie', en: 'Psychology' },
  { id: 'soc', ja: '社会学[しゃかいがく]', de: 'Soziologie', en: 'Sociology' },
  { id: 'edu', ja: '教育学[きょういくがく]', de: 'Erziehungswissenschaft', en: 'Education' },
  { id: 'lit', ja: '文学[ぶんがく]', de: 'Literaturwissenschaft', en: 'Literature' },
  { id: 'ling', ja: '言語学[げんごがく]', de: 'Sprachwissenschaft', en: 'Linguistics' },
  { id: 'jap', ja: '日本学[にほんがく]', de: 'Japanologie', en: 'Japanese studies' },
  { id: 'hist', ja: '歴史学[れきしがく]', de: 'Geschichte', en: 'History' },
  { id: 'phil', ja: '哲学[てつがく]', de: 'Philosophie', en: 'Philosophy' },
  { id: 'art', ja: '美術[びじゅつ]', de: 'Kunst', en: 'Fine arts' },
  { id: 'music', ja: '音楽[おんがく]', de: 'Musik', en: 'Music' },
];

export interface Hobby extends Choice {
  /** What you do, for 週末は何をしますか: "本[ほん]を 読[よ]みます" */
  act: { ja: string } & Meaning;
  sport?: boolean;
}

const h = (id: string, ja: string, de: string, en: string, act: string, actDe: string, actEn: string, sport = false): Hobby => ({
  id, ja, de, en, act: { ja: act, de: actDe, en: actEn }, sport,
});

export const HOBBIES: Hobby[] = [
  h('reading', '読書[どくしょ]', 'Lesen', 'reading', '本[ほん]{を} 読[よ]みます', 'lese ich Bücher', 'I read books'),
  h('movies', '映画[えいが]', 'Filme', 'films', '映画[えいが]{を} 見[み]ます', 'schaue ich Filme', 'I watch films'),
  h('music', '音楽[おんがく]', 'Musik', 'music', '音楽[おんがく]{を} 聞[き]きます', 'höre ich Musik', 'I listen to music'),
  h('travel', '旅行[りょこう]', 'Reisen', 'travelling', '旅行[りょこう]{を} します', 'reise ich', 'I travel'),
  h('cooking', '料理[りょうり]', 'Kochen', 'cooking', '料理[りょうり]{を} します', 'koche ich', 'I cook'),
  h('sports', 'スポーツ', 'Sport', 'sports', 'スポーツ{を} します', 'mache ich Sport', 'I do sports', true),
  h('soccer', 'サッカー', 'Fußball', 'football', 'サッカー{を} します', 'spiele ich Fußball', 'I play football', true),
  h('tennis', 'テニス', 'Tennis', 'tennis', 'テニス{を} します', 'spiele ich Tennis', 'I play tennis', true),
  h('ski', 'スキー', 'Skifahren', 'skiing', 'スキー{を} します', 'fahre ich Ski', 'I go skiing', true),
  h('swim', '水泳[すいえい]', 'Schwimmen', 'swimming', 'プール{で} 泳[およ]ぎます', 'schwimme ich', 'I go swimming', true),
  h('jogging', 'ジョギング', 'Joggen', 'jogging', 'ジョギング{を} します', 'gehe ich joggen', 'I go jogging', true),
  h('hiking', 'ハイキング', 'Wandern', 'hiking', '山[やま]{へ} 行[い]きます', 'gehe ich in die Berge', 'I go to the mountains', true),
  h('cycling', 'サイクリング', 'Radfahren', 'cycling', 'サイクリング{を} します', 'fahre ich Rad', 'I go cycling', true),
  h('photo', '写真[しゃしん]', 'Fotografieren', 'photography', '写真[しゃしん]{を} 撮[と]ります', 'fotografiere ich', 'I take photos'),
  h('games', 'ゲーム', 'Videospiele', 'video games', 'ゲーム{を} します', 'spiele ich Videospiele', 'I play video games'),
  h('anime', 'アニメ', 'Anime', 'anime', 'アニメ{を} 見[み]ます', 'schaue ich Anime', 'I watch anime'),
  h('manga', '漫画[まんが]', 'Manga', 'manga', '漫画[まんが]{を} 読[よ]みます', 'lese ich Manga', 'I read manga'),
  h('drawing', '絵[え]', 'Zeichnen', 'drawing', '絵[え]{を} かきます', 'zeichne ich', 'I draw'),
  h('piano', 'ピアノ', 'Klavier', 'piano', 'ピアノ{を} ひきます', 'spiele ich Klavier', 'I play the piano'),
  h('guitar', 'ギター', 'Gitarre', 'guitar', 'ギター{を} ひきます', 'spiele ich Gitarre', 'I play the guitar'),
  h('dance', 'ダンス', 'Tanzen', 'dancing', 'ダンス{を} します', 'tanze ich', 'I dance', true),
  h('yoga', 'ヨガ', 'Yoga', 'yoga', 'ヨガ{を} します', 'mache ich Yoga', 'I do yoga', true),
  h('shopping', '買[か]い物[もの]', 'Shoppen', 'shopping', '買[か]い物[もの]{を} します', 'gehe ich einkaufen', 'I go shopping'),
  h('karaoke', 'カラオケ', 'Karaoke', 'karaoke', 'カラオケ{に} 行[い]きます', 'gehe ich zum Karaoke', 'I go to karaoke'),
];

export interface Year extends Meaning { id: string; ja: string; label: string }

export const YEARS: Year[] = [
  { id: '1', label: '1st', ja: '1年生[いちねんせい]', de: 'im ersten Studienjahr', en: 'a first-year student' },
  { id: '2', label: '2nd', ja: '2年生[にねんせい]', de: 'im zweiten Studienjahr', en: 'a second-year student' },
  { id: '3', label: '3rd', ja: '3年生[さんねんせい]', de: 'im dritten Studienjahr', en: 'a third-year student' },
  { id: '4', label: '4th', ja: '4年生[よねんせい]', de: 'im vierten Studienjahr', en: 'a fourth-year student' },
  { id: 'master', label: 'Master', ja: '大学院生[だいがくいんせい]', de: 'im Master', en: 'a graduate student' },
];

export const countryById = (id: string) => COUNTRIES.find((x) => x.id === id);
export const majorById = (id: string) => MAJORS.find((x) => x.id === id);
export const hobbyById = (id: string) => HOBBIES.find((x) => x.id === id);
export const yearById = (id: string) => YEARS.find((x) => x.id === id);
