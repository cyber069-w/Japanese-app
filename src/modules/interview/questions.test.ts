import { describe, expect, it } from 'vitest';
import { feedbackPrompt, mergeQuestions, packPrompt, parseInterviewPack, sparPrompt } from './questions';

const pack = '```json\n{"questions":[{"question":"Walk me through a DCF","deck":"Technical","topic":"Valuation","model_answer_points":["FCF forecast","WACC","terminal value"],"difficulty":"hard"},{"question":"Why us?","deck":"firm","topic":"Culture","model_answer_points":["x"],"firm":"Nomura"},{"question":"","deck":"technical","model_answer_points":["a"]},{"question":"No points","deck":"technical"}]}\n```';
describe('interview packs', () => {
  it('imports valid questions and reports skipped ones', () => {
    const r = parseInterviewPack(pack);
    expect(r.questions.map((q) => [q.deck, q.difficulty])).toEqual([['technical', 3], ['firm', 2]]);
    expect(r.questions[1].firm).toBe('Nomura');
    expect(r.errors).toHaveLength(2);
  });
  it('uses defaults for the deck and the linked application', () => {
    const r = parseInterviewPack('[{"question":"Why this firm?","model_answer_points":["a"]}]', { deck: 'firm', firm: 'EQT', applicationId: 'app1' });
    expect(r.questions[0]).toMatchObject({ deck: 'firm', firm: 'EQT', applicationId: 'app1' });
  });
  it('rejects non-JSON', () => expect(parseInterviewPack('hello').errors[0]).toMatch(/not valid JSON/));
  it('the same question replaces itself on re-import', () => {
    const a = parseInterviewPack(pack).questions;
    expect(mergeQuestions(a, a)).toHaveLength(2);
  });
});
describe('prompts', () => {
  it('ask for 20 original questions per topic and JSON only', () => {
    const p = packPrompt({ deck: 'technical', topics: ['LBO basics'] });
    expect(p).toMatch(/20 original questions per topic/);
    expect(p).toMatch(/paid interview guides/);
    expect(p).toMatch(/ONE JSON object only/);
  });
  it('feedback and spar prompts carry question and transcript', () => {
    const q = { question: 'Why IB?', model_answer_points: ['a', 'b'] };
    expect(feedbackPrompt(q, 'my answer', '95 s, 120 wpm')).toContain('my answer');
    expect(feedbackPrompt(q, '')).toContain('(no transcript)');
    expect(sparPrompt(q, 'text')).toMatch(/5 rounds/);
  });
});

import { questionFromMarket } from './questions';
describe('market log → card', () => {
  it('makes a technical card with a stable id', () => {
    const q = questionFromMarket({ id: 'm1', date: '2026-10-19', text: 'Fed holds rates', tag: 'market' });
    expect(q).toMatchObject({ id: 'technical-market-m1', deck: 'technical', topic: 'Markets and current deals' });
    expect(q.question).toContain('Fed holds rates');
    expect(questionFromMarket({ id: 'd', date: 'x', text: 'A buys B', tag: 'deal' }).question).toMatch(/deal/);
  });
});
