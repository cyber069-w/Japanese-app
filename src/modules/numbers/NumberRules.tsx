/** Reference tables for numbers, time, dates and counters – every cell plays its reading. */
import type { StudyContext } from '../../core/types';
import { speak } from '../../lib/speech';
import { toRomaji } from '../../lib/romaji';
import {
  COUNTERS, RULES, readAge, readCounter, readDay, readHour, readMinutes, readMonth, readNumber, type Counter, type Reading,
} from './readings';

const IRREGULAR = new Set([300, 600, 800, 3000, 8000, 1000, 100, 10000]);

function Cell({ label, r, ctx, hl }: { label: string; r: Reading; ctx: StudyContext; hl?: boolean }) {
  return (
    <button className={`rule-cell${hl ? ' hl' : ''}`} onClick={() => speak(r.kana, ctx.settings.voiceRate)} title="Play">
      <span className="rule-num">{label}</span>
      <span className="rule-kana" lang="ja">{r.kana}</span>
      {r.alts.length > 0 && <span className="rule-alt" lang="ja">{r.alts.slice(0, 2).join(' / ')}</span>}
      <span className="rule-romaji">{toRomaji(r.kana)}</span>
    </button>
  );
}

function Block({ title, note, children, cols = 5 }: { title: string; note?: string; children: React.ReactNode; cols?: number }) {
  return (
    <section className="card card-pad">
      <h2>{title}</h2>
      {note && <p className="muted small" style={{ marginTop: 4 }}>{note}</p>}
      <div className="rule-grid" style={{ '--cols': cols } as React.CSSProperties}>{children}</div>
    </section>
  );
}

export function NumberRules({ ctx }: { ctx: StudyContext }) {
  const units = [1, 10, 100, 1000];
  return (
    <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
      <Block title="0 – 10" note="4, 7 and 9 have two readings. Use よん, なな and きゅう in almost all compounds.">
        {Array.from({ length: 11 }, (_, n) => (
          <Cell key={n} label={String(n)} r={readNumber(n)} ctx={ctx} hl={[4, 7, 9].includes(n)} />
        ))}
      </Block>

      <Block title="Tens, hundreds, thousands" note="Highlighted = sound change. Everything else is simply digit + じゅう / ひゃく / せん." cols={4}>
        {Array.from({ length: 9 }, (_, i) => i + 1).flatMap((d) =>
          units.map((u) => <Cell key={d * u} label={(d * u).toLocaleString('en-US')} r={readNumber(d * u)} ctx={ctx} hl={IRREGULAR.has(d * u)} />),
        )}
      </Block>

      <Block title="Big numbers" note="Japanese groups by 10,000 (まん), not 1,000. 10,000 always needs いち." cols={3}>
        {[10000, 20000, 25000, 50000, 99999, 100000].map((n) => (
          <Cell key={n} label={n.toLocaleString('en-US')} r={readNumber(n)} ctx={ctx} hl={n === 10000} />
        ))}
      </Block>

      <Block title="Hours 〜じ" note="4 = よじ, 7 = しちじ, 9 = くじ." cols={4}>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
          <Cell key={h} label={`${h}時`} r={readHour(h)} ctx={ctx} hl={[4, 7, 9].includes(h)} />
        ))}
      </Block>

      <Block title="Minutes 〜ふん / ぷん" note={RULES.pun} cols={4}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 30, 40, 45, 50].map((m) => (
          <Cell key={m} label={`${m}分`} r={readMinutes(m)} ctx={ctx} hl={[1, 3, 4, 6, 8, 10].includes(m % 10 === 0 ? 10 : m)} />
        ))}
      </Block>

      <Block title="Days of the month 〜にち" note={`${RULES['date-special']} ${RULES['date-14-24']}`} cols={4}>
        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
          <Cell key={d} label={`${d}日`} r={readDay(d)} ctx={ctx} hl={d <= 10 || d === 14 || d === 20 || d === 24} />
        ))}
      </Block>

      <Block title="Months 〜がつ" note="April = しがつ, July = しちがつ, September = くがつ." cols={4}>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
          <Cell key={m} label={`${m}月`} r={readMonth(m)} ctx={ctx} hl={[4, 7, 9].includes(m)} />
        ))}
      </Block>

      {(['tsu', 'nin', 'mai', 'hon', 'sai', 'kai'] as Counter[]).map((c) => (
        <Block key={c} title={`Counter 〜${COUNTERS[c].kanji} · ${COUNTERS[c].en}`} note={c === 'tsu' ? RULES.tsu : c === 'nin' ? RULES.nin : c === 'hon' ? RULES.hon : c === 'sai' ? `${RULES.sai} ${RULES.hatachi}` : c === 'kai' ? RULES.kai : 'Regular: number + まい.'}>
          {(c === 'sai' ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 18, 20, 21, 30] : Array.from({ length: 10 }, (_, i) => i + 1)).map((n) => {
            const r = c === 'sai' ? readAge(n) : readCounter(n, c);
            return <Cell key={n} label={`${n}${COUNTERS[c].kanji}`} r={r} ctx={ctx} hl={r.rules.length > 0 && !(c === 'mai')} />;
          })}
        </Block>
      ))}
    </div>
  );
}
