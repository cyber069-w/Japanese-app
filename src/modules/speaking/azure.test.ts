import { describe, expect, it } from 'vitest';
import { assessmentHeader, azureError, parseAssessment, scoreTone } from '../../lib/azurePronunciation';
import { progress } from './attempts';

describe('azure pronunciation', () => {
  it('parses the nested response shape', () => {
    const a = parseAssessment({ NBest: [{ PronunciationAssessment: { AccuracyScore: 90, FluencyScore: 80, CompletenessScore: 100, PronScore: 88 },
      Words: [{ Word: 'ねこ', PronunciationAssessment: { AccuracyScore: 95, ErrorType: 'None' } }, { Word: 'が', PronunciationAssessment: { AccuracyScore: 0, ErrorType: 'Omission' } }] }] });
    expect(a).toMatchObject({ accuracy: 90, fluency: 80, completeness: 100, overall: 88 });
    expect(a?.words).toEqual([{ word: 'ねこ', accuracy: 95, error: 'None' }, { word: 'が', accuracy: 0, error: 'Omission' }]);
  });
  it('parses the flat shape and nothing', () => {
    expect(parseAssessment({ NBest: [{ AccuracyScore: 70, PronScore: 65, Words: [{ Word: 'x', AccuracyScore: 50, ErrorType: 'Mispronunciation' }] }] })?.words[0].error).toBe('Mispronunciation');
    expect(parseAssessment({ RecognitionStatus: 'NoMatch' })).toBeNull();
  });
  it('header carries the reference text', () => {
    const j = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(assessmentHeader('ねこがいます')), (c) => c.charCodeAt(0))));
    expect(j).toMatchObject({ ReferenceText: 'ねこがいます', Granularity: 'Word', EnableMiscue: 'True' });
  });
  it('colours and errors', () => {
    expect([scoreTone(85), scoreTone(65), scoreTone(10)]).toEqual(['good', 'warn', 'bad']);
    expect(azureError(401)).not.toMatch(/key=|[0-9a-f]{20}/);
  });
  it('progress is best and last per sentence', () => {
    const at = (overall: number, sentence = 's') => ({ sentence, at: 0, accuracy: 0, fluency: 0, completeness: 0, overall });
    expect(progress([at(50), at(80), at(70), at(99, 'other')], 's')).toEqual({ n: 3, best: 80, last: 70 });
    expect(progress([], 's')).toBeNull();
  });
});
