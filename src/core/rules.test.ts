import { describe, expect, it } from 'vitest';
import { ectsHoursPerWeek, entryKey, markOutcome, registerShown, ruleStats, settleIgnored } from './rules';

const t0 = new Date(2026, 9, 19, 9).getTime();
describe('rule log', () => {
  it('registers once per day and marks outcomes', () => {
    let l = registerShown({}, [{ id: 'cards:CFA', kind: 'cards' }, { id: 'dl:1', kind: 'deadline' }], t0);
    l = registerShown(l, [{ id: 'cards:CFA', kind: 'cards' }], t0 + 1000);
    expect(Object.keys(l)).toHaveLength(2);
    l = markOutcome(l, 'dl:1', 'acted', t0 + 5000);
    expect(l[entryKey('dl:1', t0)].outcome).toBe('acted');
    expect(registerShown(l, [{ id: 'cards:CFA', kind: 'cards' }], t0 + 86_400_000)).not.toBe(l); // next day counts again
  });
  it('settles vanished suggestions as ignored, not fresh ones', () => {
    const l = registerShown({}, [{ id: 'a', kind: 'file' }, { id: 'b', kind: 'file' }], t0);
    const s = settleIgnored(l, [entryKey('a', t0)], t0 + 120_000);
    expect(s[entryKey('a', t0)].outcome).toBe('shown');
    expect(s[entryKey('b', t0)].outcome).toBe('ignored');
    expect(settleIgnored(l, [entryKey('b', t0)], t0 + 5_000)[entryKey('a', t0)].outcome).toBe('shown');
  });
  it('dismiss rate per kind counts only finished suggestions', () => {
    let l = registerShown({}, [1, 2, 3, 4].map((n) => ({ id: `f${n}`, kind: 'file' })).concat([{ id: 'c', kind: 'cards' }]), t0);
    l = markOutcome(markOutcome(markOutcome(l, 'f1', 'dismissed', t0), 'f2', 'dismissed', t0), 'f3', 'acted', t0);
    const stat = ruleStats(l).find((s) => s.kind === 'file')!;
    expect(stat).toMatchObject({ total: 4, dismissed: 2, acted: 1, open: 1 });
    expect(stat.dismissRate).toBeCloseTo(2 / 3);
    expect(ruleStats(l).find((s) => s.kind === 'cards')!.dismissRate).toBeNull();
  });
  it('ECTS → weekly hours', () => {
    expect(ectsHoursPerWeek(6)).toBe(12);   // 165 h / 14 = 11.8
    expect(ectsHoursPerWeek(3)).toBe(6);
  });
});
