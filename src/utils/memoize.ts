/**
 * Simple memoization utility for caching function results
 */

type AnyFunction = (...args: unknown[]) => unknown;

type MemoizedFunction<T extends AnyFunction> = T & {
  clear: () => void;
};

export function memoize<T extends AnyFunction>(
  fn: T,
  getKey: (...args: Parameters<T>) => string,
): MemoizedFunction<T> {
  const cache = new Map<string, ReturnType<T>>();

  const memoized = ((...args: Parameters<T>): ReturnType<T> => {
    const key = getKey(...args);

    if (cache.has(key)) {
      return cache.get(key)! as ReturnType<T>;
    }

    const result = fn(...args) as ReturnType<T>;
    cache.set(key, result);

    // Limit cache size to prevent memory leaks
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      if (firstKey !== undefined) {
        cache.delete(firstKey);
      }
    }

    return result;
  }) as MemoizedFunction<T>;

  memoized.clear = () => cache.clear();

  return memoized;
}
