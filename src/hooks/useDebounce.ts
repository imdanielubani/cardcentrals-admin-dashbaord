import { useState, useEffect } from 'react';

/**
 * Delays updating `value` by `delay` ms after it stops changing.
 * Use for search inputs to avoid API calls on every keystroke.
 */
export function useDebounce<T>(value: T, delay = 350): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
