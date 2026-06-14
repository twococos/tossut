import { useEffect, useState } from 'react';
import { getDocExpiryWarningDays } from '@/auth/session';

/**
 * Llindar (en dies) d'avís de caducitat de documents, reactiu i per dispositiu. Llegeix el
 * valor de localStorage i es manté sincronitzat amb l'event `doc-expiry-warning-change`
 * (mateixa pestanya, emès pel setter de session.ts) i `storage` (altres pestanyes). Mirall de
 * `useDashboardPrefs`. Veure session.ts.
 */
export function useDocExpiryWarning(): number {
  const [days, setDays] = useState<number>(getDocExpiryWarningDays);

  useEffect(() => {
    const update = () => setDays(getDocExpiryWarningDays());
    window.addEventListener('doc-expiry-warning-change', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('doc-expiry-warning-change', update);
      window.removeEventListener('storage', update);
    };
  }, []);

  return days;
}
