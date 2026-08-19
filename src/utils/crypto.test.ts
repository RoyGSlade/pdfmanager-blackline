import { describe, expect, it } from 'vitest';
import { computeSha256, formatBytes } from './crypto';

describe('computeSha256', () => {
  it('matches the SHA-256 known vector for abc', async () => {
    const bytes = new TextEncoder().encode('abc');

    await expect(computeSha256(bytes)).resolves.toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('hashes only the visible bytes of a typed-array view', async () => {
    const backing = new TextEncoder().encode('ignoreabcalso-ignore');
    const visible = backing.subarray(6, 9);

    await expect(computeSha256(visible)).resolves.toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});

describe('formatBytes', () => {
  it('formats zero and binary size boundaries', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1_572_864)).toBe('1.5 MB');
  });
});
