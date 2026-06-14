import { useEffect, useState } from 'react';

/**
 * Hook reactiu a una media query CSS. Retorna si la query es compleix ara mateix i
 * s'actualitza quan canvia (resize, rotació del dispositiu).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** Pantalla gran = breakpoint `lg` de Tailwind (≥ 1024px). Sidebar + modals centrats. */
export function useIsLargeScreen(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}
