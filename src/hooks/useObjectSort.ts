import { useEffect, useState } from 'react';
import { getObjectSort, setObjectSort, type ObjectSort } from '@/auth/session';

/**
 * Criteri d'ordenació de la llista d'objectes, reactiu. Llegeix de localStorage i es manté
 * sincronitzat amb l'event `object-sort-change` (mateixa pestanya) i `storage` (altres).
 * Retorna el valor actual i un setter que el desa. Veure session.ts.
 */
export function useObjectSort(): [ObjectSort, (sort: ObjectSort) => void] {
  const [sort, setSort] = useState<ObjectSort>(getObjectSort);

  useEffect(() => {
    const update = () => setSort(getObjectSort());
    window.addEventListener('object-sort-change', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('object-sort-change', update);
      window.removeEventListener('storage', update);
    };
  }, []);

  return [sort, setObjectSort];
}
