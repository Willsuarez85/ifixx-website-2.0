import { describe, expect, it } from 'vitest';
import { SERVICE_AREAS } from '../src/lib/business-facts';

describe('test runner', () => {
  it('reads business facts from src/lib', () => {
    expect(SERVICE_AREAS.length).toBe(9);
  });
});
