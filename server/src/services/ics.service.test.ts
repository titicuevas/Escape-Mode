import { describe, expect, it } from 'vitest';
import { icsEscape, icsFold } from './ics.service.js';

describe('ics helpers', () => {
  it('escapes ICS special characters', () => {
    expect(icsEscape('A, B; C\\D\nE')).toBe('A\\, B\\; C\\\\D\\nE');
  });

  it('folds long lines', () => {
    const long = `SUMMARY:${'x'.repeat(90)}`;
    const folded = icsFold(long);
    const lines = folded.split('\r\n');
    expect(lines[0]!.length).toBeLessThanOrEqual(75);
    expect(lines[1]!.startsWith(' ')).toBe(true);
  });
});
