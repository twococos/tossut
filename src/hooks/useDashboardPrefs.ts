import { useEffect, useState } from 'react';
import {
  getShowFaultsButton,
  getShowDocumentsButton,
  getShowDurationSection,
  getShowResourcesSection,
  getShowExpiringSection,
} from '@/auth/session';

export interface DashboardPrefs {
  showFaultsButton: boolean;
  showDocumentsButton: boolean;
  showDurationSection: boolean;
  showResourcesSection: boolean;
  showExpiringSection: boolean;
}

function read(): DashboardPrefs {
  return {
    showFaultsButton: getShowFaultsButton(),
    showDocumentsButton: getShowDocumentsButton(),
    showDurationSection: getShowDurationSection(),
    showResourcesSection: getShowResourcesSection(),
    showExpiringSection: getShowExpiringSection(),
  };
}

/**
 * Preferències de visibilitat del dashboard, reactives. Llegeix els flags de localStorage i
 * es manté sincronitzat amb l'event `dashboard-prefs-change` (mateixa pestanya, emès pels
 * setters de session.ts) i `storage` (altres pestanyes). Veure session.ts.
 */
export function useDashboardPrefs(): DashboardPrefs {
  const [prefs, setPrefs] = useState<DashboardPrefs>(read);

  useEffect(() => {
    const update = () => setPrefs(read());
    window.addEventListener('dashboard-prefs-change', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('dashboard-prefs-change', update);
      window.removeEventListener('storage', update);
    };
  }, []);

  return prefs;
}
