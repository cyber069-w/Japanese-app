/**
 * Common A1 oral-exam questions (Minna no Nihongo lessons 1–10 grammar) with model
 * answers. Answers that are about you are built from your self-introduction;
 * time and date questions use the real clock.
 */
import type { Meaning } from '../../core/types';
import { readDate, readTime, WEEKDAYS } from '../numbers/readings';
import { hobbiesJa, listJoin, type Field, type Resolved } from './intro';

export type Topic = 'me' | 'daily' | 'time' | 'likes';
export interface ModelAnswer extends Meaning { ja: string }

export interface OralQuestion extends Meaning {
  id: string;
  topic: Topic;
  lesson: number;
  /** Question in grammar notation. */
  q: string;
  /** Profile fields the model answer is built from. */
  uses?: Field[];
  answers: (r: Resolved, now: Date) => ModelAnswer[];
  tip?: Meaning;
}

export const TOPICS: Record<Topic, { label: string; sub: string }> = {
  me: { label: '自己紹介', sub: 'about you' },
  daily: { label: '毎日', sub: 'daily life' },
  time: { label: '時間', sub: 'time & dates' },
  likes: { label: '好き', sub: 'likes & opinions' },
};

const MONTHS_DE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const a = (ja: string, de: string, en: string): ModelAnswer => ({ ja, de, en });

export const QUESTIONS: OralQuestion[] = [
  // ------------------------------------------------------------------ about you
  {
    id: 'name', topic: 'me', lesson: 1, q: 'お名前[なまえ]{は}？', de: 'Wie heißen Sie?', en: 'What’s your name?', uses: ['name'],
    answers: (r) => [a(`${r.name.ja}です。`, `Ich heiße ${r.name.latin}.`, `I’m ${r.name.latin}.`), a(`私[わたし]{は} ${r.name.ja}です。`, `Ich bin ${r.name.latin}.`, `I am ${r.name.latin}.`)],
    tip: { de: 'Nie さん an den eigenen Namen hängen.', en: 'Never add さん to your own name.' },
  },
  {
    id: 'country', topic: 'me', lesson: 3, q: 'お国[くに]{は} どちらですか。', de: 'Woher kommen Sie?', en: 'Where are you from?', uses: ['country'],
    answers: (r) => [
      a(`${r.country.ja}{から} 来[き]ました。`, `Ich komme ${r.country.from.de}.`, `I’m ${r.country.from.en}.`),
      a(`${r.country.ja}です。`, `${r.country.de}.`, `${r.country.en}.`),
    ],
    tip: { de: 'どちら ist die höfliche Form von どこ.', en: 'どちら is the polite form of どこ.' },
  },
  {
    id: 'nationality', topic: 'me', lesson: 1, q: '何人[なにじん]ですか。', de: 'Welche Staatsangehörigkeit haben Sie?', en: 'What’s your nationality?', uses: ['country'],
    answers: (r) => [a(`${r.country.ja}人[じん]です。`, `Ich komme ${r.country.from.de}.`, `I’m ${r.country.from.en}.`)],
    tip: { de: 'Land + 人(じん) = Staatsangehörigkeit: ドイツ人, スイス人.', en: 'Country + 人 (じん) = nationality: ドイツ人, スイス人.' },
  },
  {
    id: 'job', topic: 'me', lesson: 1, q: 'お仕事[しごと]{は}？', de: 'Was machen Sie beruflich?', en: 'What do you do?', uses: ['uni'],
    answers: (r) => [
      a('学生[がくせい]です。', 'Ich bin Student(in).', 'I’m a student.'),
      a(`${r.uni.ja}{の} 学生[がくせい]です。`, `Ich studiere an der Universität ${r.uni.latin}.`, `I’m a student at the University of ${r.uni.latin}.`),
    ],
  },
  {
    id: 'student', topic: 'me', lesson: 2, q: '学生[がくせい]ですか。', de: 'Sind Sie Student(in)?', en: 'Are you a student?', uses: ['uni'],
    answers: (r) => [
      a('はい、 そうです。', 'Ja, genau.', 'Yes, I am.'),
      a(`はい、 ${r.uni.ja}{の} 学生[がくせい]です。`, `Ja, ich studiere an der Universität ${r.uni.latin}.`, `Yes, I’m a student at the University of ${r.uni.latin}.`),
    ],
  },
  {
    id: 'uni', topic: 'me', lesson: 3, q: 'どこ{の} 大学[だいがく]ですか。', de: 'An welcher Universität sind Sie?', en: 'Which university are you at?', uses: ['uni'],
    answers: (r) => [a(`${r.uni.ja}です。`, `An der Universität ${r.uni.latin}.`, `The University of ${r.uni.latin}.`)],
  },
  {
    id: 'major', topic: 'me', lesson: 1, q: '専攻[せんこう]{は} 何[なん]ですか。', de: 'Was studieren Sie?', en: 'What’s your major?', uses: ['major'],
    answers: (r) => [a(`${r.major.ja}です。`, `${r.major.de}.`, `${r.major.en}.`), a(`専攻[せんこう]{は} ${r.major.ja}です。`, `Mein Studienfach ist ${r.major.de}.`, `My major is ${r.major.en}.`)],
  },
  {
    id: 'year', topic: 'me', lesson: 1, q: '何年生[なんねんせい]ですか。', de: 'In welchem Studienjahr sind Sie?', en: 'What year are you in?', uses: ['year'],
    answers: (r) => (r.year ? [a(`${r.year.ja}です。`, `Ich bin ${r.year.de}.`, `I’m ${r.year.en}.`)] : [a('2年生[にねんせい]です。', 'Ich bin im zweiten Studienjahr.', 'I’m a second-year student.')]),
  },
  {
    id: 'age', topic: 'me', lesson: 1, q: '何歳[なんさい]ですか。', de: 'Wie alt sind Sie?', en: 'How old are you?', uses: ['age'],
    answers: (r) => [a(`${r.age.ja}です。`, `Ich bin ${r.age.n} Jahre alt.`, `I’m ${r.age.n}.`)],
    tip: { de: 'Höflicher: おいくつですか. 20 Jahre = はたち; 1, 8, 10 → いっさい, はっさい, じゅっさい.', en: 'More polite: おいくつですか. 20 = はたち; 1, 8, 10 → いっさい, はっさい, じゅっさい.' },
  },
  {
    id: 'birthday', topic: 'me', lesson: 5, q: '誕生日[たんじょうび]{は} いつですか。', de: 'Wann haben Sie Geburtstag?', en: 'When is your birthday?', uses: ['birthday'],
    answers: (r) => [a(`${r.birthday.ja}です。`, `${r.birthday.de[0].toUpperCase()}${r.birthday.de.slice(1)}.`, `${r.birthday.en[0].toUpperCase()}${r.birthday.en.slice(1)}.`)],
    tip: { de: 'Achtung bei 1.–10., 14., 20. und 24.: ついたち, ふつか … とおか, じゅうよっか, はつか.', en: 'Watch out for the 1st–10th, 14th, 20th and 24th: ついたち, ふつか … とおか, じゅうよっか, はつか.' },
  },
  {
    id: 'languages', topic: 'me', lesson: 9, q: '何語[なにご]{が} 分[わ]かりますか。', de: 'Welche Sprachen verstehen Sie?', en: 'Which languages do you understand?', uses: ['country'],
    answers: (r) => {
      const native = r.country.lang;
      if (native === '日本語[にほんご]') return [a('日本語[にほんご]{と} 英語[えいご]{が} 分[わ]かります。', 'Ich verstehe Japanisch und Englisch.', 'I understand Japanese and English.')];
      const first = native === '英語[えいご]' ? '英語[えいご]{が}' : `${native}{と} 英語[えいご]{が}`;
      const de = native === '英語[えいご]' ? 'Englisch' : `${r.country.langName.de} und Englisch`;
      const en = native === '英語[えいご]' ? 'English' : `${r.country.langName.en} and English`;
      return [a(`${first} 分[わ]かります。 日本語[にほんご]{も} 少[すこ]し 分[わ]かります。`, `Ich verstehe ${de}. Japanisch verstehe ich auch ein bisschen.`, `I understand ${en}. I also understand a little Japanese.`)];
    },
  },
  {
    id: 'home', topic: 'me', lesson: 10, q: 'うち{は} どこですか。', de: 'Wo wohnen Sie?', en: 'Where do you live?', uses: ['uni'],
    answers: (r) => [a(`${r.uni.city}です。 大学[だいがく]{の} 近[ちか]くです。`, `In ${r.uni.latin}. In der Nähe der Universität.`, `In ${r.uni.latin}, near the university.`)],
  },

  // ------------------------------------------------------------------ daily life
  {
    id: 'wake', topic: 'daily', lesson: 4, q: '毎朝[まいあさ] 何時[なんじ]{に} 起[お]きますか。', de: 'Wann stehen Sie morgens auf?', en: 'What time do you get up every morning?',
    answers: () => [a('7時[しちじ]{に} 起[お]きます。', 'Ich stehe um 7 Uhr auf.', 'I get up at 7.'), a('6時半[ろくじはん]{に} 起[お]きます。', 'Ich stehe um halb sieben auf.', 'I get up at half past six.')],
    tip: { de: 'Uhrzeit + に: 7時に. Achtung: 4時 よじ, 7時 しちじ, 9時 くじ.', en: 'Time + に: 7時に. Careful: 4時 よじ, 7時 しちじ, 9時 くじ.' },
  },
  {
    id: 'sleep', topic: 'daily', lesson: 4, q: '毎晩[まいばん] 何時[なんじ]{に} 寝[ね]ますか。', de: 'Wann gehen Sie abends schlafen?', en: 'What time do you go to bed every night?',
    answers: () => [a('11時[じゅういちじ]{に} 寝[ね]ます。', 'Ich gehe um 11 Uhr schlafen.', 'I go to bed at 11.'), a('12時[じゅうにじ]{に} 寝[ね]ます。', 'Ich gehe um 12 Uhr schlafen.', 'I go to bed at 12.')],
  },
  {
    id: 'commute', topic: 'daily', lesson: 5, q: '何[なん]{で} 大学[だいがく]{へ} 来[き]ますか。', de: 'Womit kommen Sie zur Universität?', en: 'How do you get to university?',
    answers: () => [
      a('電車[でんしゃ]{で} 来[き]ます。', 'Ich komme mit dem Zug.', 'I come by train.'),
      a('バス{で} 来[き]ます。', 'Ich komme mit dem Bus.', 'I come by bus.'),
      a('自転車[じてんしゃ]{で} 来[き]ます。', 'Ich komme mit dem Fahrrad.', 'I come by bike.'),
      a('歩[ある]いて 来[き]ます。', 'Ich komme zu Fuß.', 'I walk.'),
    ],
    tip: { de: 'Verkehrsmittel + で – aber 歩いて (zu Fuß) ohne で.', en: 'Transport + で – but 歩いて (on foot) without で.' },
  },
  {
    id: 'yesterday', topic: 'daily', lesson: 6, q: 'きのう 何[なに]{を} しましたか。', de: 'Was haben Sie gestern gemacht?', en: 'What did you do yesterday?',
    answers: () => [
      a('図書館[としょかん]{で} 日本語[にほんご]{を} 勉強[べんきょう]しました。', 'Ich habe in der Bibliothek Japanisch gelernt.', 'I studied Japanese in the library.'),
      a('友達[ともだち]{と} 映画[えいが]{を} 見[み]ました。', 'Ich habe mit Freunden einen Film gesehen.', 'I watched a film with friends.'),
    ],
    tip: { de: 'Vergangenheit: ～ました. Ort der Handlung + で.', en: 'Past: ～ました. Place of an action + で.' },
  },
  {
    id: 'sunday', topic: 'daily', lesson: 6, q: '日曜日[にちようび]{は} 何[なに]{を} しますか。', de: 'Was machen Sie am Sonntag?', en: 'What do you do on Sundays?', uses: ['hobbies'],
    answers: (r) => [
      ...r.hobbies.slice(0, 2).map((h) => a(`${h.act.ja}。`, `Am Sonntag ${h.act.de}.`, `On Sundays ${h.act.en}.`)),
      a('友達[ともだち]{と} 昼[ひる]ごはん{を} 食[た]べます。', 'Ich esse mit Freunden zu Mittag.', 'I have lunch with friends.'),
    ],
  },
  {
    id: 'where-study', topic: 'daily', lesson: 6, q: 'どこ{で} 日本語[にほんご]{を} 勉強[べんきょう]しますか。', de: 'Wo lernen Sie Japanisch?', en: 'Where do you study Japanese?',
    answers: () => [a('大学[だいがく]{で} 勉強[べんきょう]します。', 'An der Universität.', 'At university.'), a('うち{で}{も} 勉強[べんきょう]します。', 'Ich lerne auch zu Hause.', 'I also study at home.')],
  },
  {
    id: 'breakfast', topic: 'daily', lesson: 6, q: '朝[あさ]ごはん{は} 何[なに]{を} 食[た]べますか。', de: 'Was essen Sie zum Frühstück?', en: 'What do you have for breakfast?',
    answers: () => [a('パン{を} 食[た]べます。 それから コーヒー{を} 飲[の]みます。', 'Ich esse Brot. Danach trinke ich Kaffee.', 'I eat bread. Then I drink coffee.')],
  },
  {
    id: 'holiday', topic: 'daily', lesson: 5, q: '休[やす]み{は} どこ{へ} 行[い]きますか。', de: 'Wohin fahren Sie in den Ferien?', en: 'Where are you going in the holidays?', uses: ['country'],
    answers: (r) => [
      ...(r.country.id === 'jp' ? [] : [a(`${r.country.ja}{へ} 帰[かえ]ります。`, `Ich fahre nach Hause (${r.country.de}).`, `I’m going back home (${r.country.en}).`)]),
      a('日本[にほん]{へ} 行[い]きます。', 'Ich fahre nach Japan.', 'I’m going to Japan.'),
    ],
    tip: { de: 'Richtung + へ (gesprochen „e“): 日本へ行きます.', en: 'Direction + へ (said “e”): 日本へ行きます.' },
  },

  // ------------------------------------------------------------------ time & dates
  {
    id: 'now', topic: 'time', lesson: 4, q: '今[いま] 何時[なんじ]ですか。', de: 'Wie spät ist es jetzt?', en: 'What time is it now?',
    answers: (_r, now) => {
      const h = now.getHours(), m = now.getMinutes();
      const h12 = h % 12 || 12;
      const part = h < 12 ? '午前[ごぜん]' : '午後[ごご]';
      const read = readTime(h12, m).kana;
      const clock = m === 0 ? `${h12}時[${read}]` : `${h12}時${m}分[${read}]`;
      const hhmm = `${h}:${String(m).padStart(2, '0')}`;
      return [a(`${part} ${clock}です。`, `Es ist ${hhmm} Uhr.`, `It’s ${hhmm}.`)];
    },
    tip: { de: 'Die Antwort zeigt die echte Uhrzeit. ぷん/ふん: 1, 3, 4, 6, 8, 10 → ぷん.', en: 'The answer uses the real time. ぷん/ふん: 1, 3, 4, 6, 8, 10 → ぷん.' },
  },
  {
    id: 'weekday', topic: 'time', lesson: 4, q: 'きょう{は} 何曜日[なんようび]ですか。', de: 'Welcher Wochentag ist heute?', en: 'What day of the week is it today?',
    answers: (_r, now) => {
      const w = WEEKDAYS[(now.getDay() + 6) % 7];
      return [a(`${w.kanji}[${w.kana}]です。`, `Heute ist ${w.de}.`, `It’s ${w.en}.`)];
    },
  },
  {
    id: 'date', topic: 'time', lesson: 5, q: 'きょう{は} 何月[なんがつ] 何日[なんにち]ですか。', de: 'Welches Datum ist heute?', en: 'What’s the date today?',
    answers: (_r, now) => {
      const m = now.getMonth() + 1, d = now.getDate();
      return [a(`${m}月${d}日[${readDate(m, d).kana}]です。`, `Heute ist der ${d}. ${MONTHS_DE[m - 1]}.`, `It’s ${MONTHS_EN[m - 1]} ${d}.`)];
    },
  },
  {
    id: 'uni-hours', topic: 'time', lesson: 4, q: '大学[だいがく]{は} 何時[なんじ]{から} 何時[なんじ]{まで}ですか。', de: 'Von wann bis wann ist die Uni?', en: 'From what time to what time is university?',
    answers: () => [a('9時[くじ]{から} 5時[ごじ]{まで}です。', 'Von 9 bis 17 Uhr.', 'From 9 to 5.')],
    tip: { de: '～から ～まで = von … bis …', en: '～から ～まで = from … to …' },
  },
  {
    id: 'class-day', topic: 'time', lesson: 4, q: '日本語[にほんご]{の} クラス{は} 何曜日[なんようび]ですか。', de: 'An welchem Tag ist der Japanischkurs?', en: 'Which day is your Japanese class?',
    answers: () => [a('月曜日[げつようび]{と} 木曜日[もくようび]です。', 'Am Montag und am Donnerstag.', 'On Monday and Thursday.')],
  },

  // ------------------------------------------------------------------ likes & opinions
  {
    id: 'japanese', topic: 'likes', lesson: 8, q: '日本語[にほんご]{は} どうですか。', de: 'Wie finden Sie Japanisch?', en: 'How do you find Japanese?',
    answers: () => [a('難[むずか]しいです{が}、 おもしろいです。', 'Es ist schwierig, aber interessant.', 'It’s difficult, but interesting.'), a('とても おもしろいです。', 'Sehr interessant.', 'Very interesting.')],
    tip: { de: '～が、～ = …, aber … (Lektion 8).', en: '～が、～ = …, but … (lesson 8).' },
  },
  {
    id: 'hobby', topic: 'likes', lesson: 9, q: '趣味[しゅみ]{は} 何[なん]ですか。', de: 'Was sind Ihre Hobbys?', en: 'What are your hobbies?', uses: ['hobbies'],
    answers: (r) => [
      a(`${hobbiesJa(r.hobbies)}です。`, `${listJoin(r.hobbies.map((x) => x.de), 'und')}.`, `${listJoin(r.hobbies.map((x) => x.en), 'and')}.`),
    ],
  },
  {
    id: 'food', topic: 'likes', lesson: 9, q: 'どんな 食[た]べ物[もの]{が} 好[す]きですか。', de: 'Welches Essen mögen Sie?', en: 'What kind of food do you like?',
    answers: () => [a('すし{が} 好[す]きです。', 'Ich mag Sushi.', 'I like sushi.'), a('イタリア料理[りょうり]{が} 好[す]きです。', 'Ich mag italienisches Essen.', 'I like Italian food.')],
    tip: { de: 'Mit 好き steht が, nicht を.', en: '好き takes が, not を.' },
  },
  {
    id: 'sport', topic: 'likes', lesson: 9, q: 'どんな スポーツ{が} 好[す]きですか。', de: 'Welchen Sport mögen Sie?', en: 'What sports do you like?', uses: ['hobbies'],
    answers: (r) => {
      const sports = r.hobbies.filter((h) => h.sport && h.id !== 'sports');
      const mine = sports.map((h) => a(`${h.ja}{が} 好[す]きです。`, `Ich mag ${h.de}.`, `I like ${h.en}.`));
      return mine.length ? mine : [a('サッカー{が} 好[す]きです。', 'Ich mag Fußball.', 'I like football.'), a('スキー{が} 好[す]きです。', 'Ich mag Skifahren.', 'I like skiing.')];
    },
  },
  {
    id: 'music', topic: 'likes', lesson: 9, q: 'どんな 音楽[おんがく]{が} 好[す]きですか。', de: 'Welche Musik mögen Sie?', en: 'What kind of music do you like?',
    answers: () => [a('ジャズ{が} 好[す]きです。', 'Ich mag Jazz.', 'I like jazz.'), a('クラシック{が} 好[す]きです。', 'Ich mag klassische Musik.', 'I like classical music.')],
  },
  {
    id: 'japanese-food', topic: 'likes', lesson: 9, q: '日本[にほん]{の} 食[た]べ物[もの]{が} 好[す]きですか。', de: 'Mögen Sie japanisches Essen?', en: 'Do you like Japanese food?',
    answers: () => [a('はい、 好[す]きです。 すし{と} ラーメン{が} 好[す]きです。', 'Ja. Ich mag Sushi und Ramen.', 'Yes. I like sushi and ramen.')],
  },
  {
    id: 'town', topic: 'likes', lesson: 8, q: '大学[だいがく]{の} 町[まち]{は} どんな 町[まち]ですか。', de: 'Was für eine Stadt ist Ihre Unistadt?', en: 'What kind of town is your university town?',
    answers: () => [a('小[ちい]さいです{が}、 きれいな 町[まち]です。', 'Sie ist klein, aber schön.', 'It’s small, but a pretty town.'), a('にぎやかな 町[まち]です。', 'Es ist eine lebhafte Stadt.', 'It’s a lively town.')],
    tip: { de: 'な-Adjektive vor Nomen mit な: きれいな町.', en: 'な-adjectives take な before a noun: きれいな町.' },
  },
];

