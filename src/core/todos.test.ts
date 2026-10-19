import { describe, expect, it } from 'vitest';
import { newTodo, sortTodos } from './todos';

describe('todos', () => {
  it('sorts open before done, dated before undated', () => {
    const a = { ...newTodo('a', undefined, 1) }, b = newTodo('b', '2026-10-20', 2), c = { ...newTodo('c', '2026-10-19', 3), done: true }, d = newTodo('d', '2026-10-19', 4);
    expect(sortTodos([a, b, c, d]).map((t) => t.text)).toEqual(['d', 'b', 'a', 'c']);
  });
  it('trims text and drops an empty date', () => {
    expect(newTodo('  x  ', '').text).toBe('x');
    expect(newTodo('x', '').due).toBeUndefined();
  });
});
