import { describe, it, expect } from 'vitest';
import { formatQueuePathLabel } from './queuePathLabel';

describe('formatQueuePathLabel', () => {
  it('returns original path when length is within limit', () => {
    const path = 'root.default.template';
    expect(formatQueuePathLabel(path)).toBe(path);
  });

  it('truncates long paths using ellipsis when exceeding default length', () => {
    const path = 'root.really-long-queue-name.for.template-management';

    const result = formatQueuePathLabel(path);

    expect(result).toBe('root.really-...te-management');
    expect(result.length).toBeLessThan(path.length);
    expect(result.includes('...')).toBe(true);
  });

  it('respects custom max length overrides', () => {
    const path = 'root.default.auto-queue-creation-v2.template';

    const result = formatQueuePathLabel(path, 16);

    expect(result).toBe('root.d...emplate');
  });
});
