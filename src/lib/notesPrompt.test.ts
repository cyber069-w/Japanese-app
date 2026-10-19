import { describe, expect, it } from 'vitest';
import { notesRequest } from './notesPrompt';

describe('notesRequest', () => {
  it('picks the answer format by subject', () => {
    expect(notesRequest('Japanisch', 'L6', false).task).toMatch(/CSV/);
    expect(notesRequest('CFA', 'LM3', true).task).toMatch(/JSON/);
    expect(notesRequest('Mikro', 'W3', true).task).toMatch(/Zusammenfassung/);
  });
});
