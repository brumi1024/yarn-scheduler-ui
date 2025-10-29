import { renderHook, act } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTheme } from './use-theme';
import { ThemeProvider } from './theme-provider';

const matchMediaMock = () => ({
  matches: false,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn(),
  dispatchEvent: vi.fn(),
  onchange: null,
  media: '(prefers-color-scheme: dark)',
});

describe('useTheme', () => {
  beforeAll(() => {
    // @ts-expect-error jsdom partial mock
    window.matchMedia = vi.fn().mockImplementation(matchMediaMock);
  });

  beforeEach(() => {
    document.documentElement.className = '';
    window.localStorage.clear();
  });

  it('throws when used outside ThemeProvider', () => {
    expect(() => renderHook(() => useTheme())).toThrowError(
      'useTheme must be used within a ThemeProvider',
    );
  });

  it('provides theme value and setter inside ThemeProvider', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider storageKey="test-theme">{children}</ThemeProvider>,
    });

    expect(result.current.theme).toBe('system');

    act(() => {
      result.current.setTheme('dark');
    });

    expect(result.current.theme).toBe('dark');
    expect(window.localStorage.getItem('test-theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
