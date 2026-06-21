import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/common';
import { useAuth } from '@/auth/AuthProvider';
import { useSync } from '@/sync/SyncProvider';
import {
  getDefaultDiners,
  setDefaultDiners,
  setEditLocked,
  getDurationWindowDays,
  setDurationWindowDays,
  getDocExpiryWarningDays,
  setDocExpiryWarningDays,
  setShowFaultsButton,
  setShowDocumentsButton,
  setShowDurationSection,
  setShowResourcesSection,
  setShowExpiringSection,
} from '@/auth/session';
import { useEditLocked } from '@/hooks/useEditLocked';
import { useDashboardPrefs } from '@/hooks/useDashboardPrefs';
import { downloadBackup, importBackup } from '@/db/backup';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { relativeFromNow } from '@/lib/time';
import { t } from '@/text';

/** Ajustos: nom, comensals, sync, backup, instal·lació, sessió. */
export function Settings() {
  const { userName, setName, signOut } = useAuth();
  const { lastSyncedAt, pendingCount, syncNow, status } = useSync();
  const navigate = useNavigate();
  const [name, setNameField] = useState(userName ?? '');
  const [diners, setDiners] = useState(getDefaultDiners());
  const [durationWindow, setDurationWindow] = useState(getDurationWindowDays());
  const [docExpiryWarning, setDocExpiryWarning] = useState(getDocExpiryWarningDays());
  const editLocked = useEditLocked();
  const dashboardPrefs = useDashboardPrefs();
  const { canInstall, promptInstall, isIOS } = useInstallPrompt();
  const [importMsg, setImportMsg] = useState<string | null>(null);

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const added = await importBackup(await file.text());
      setImportMsg(t.settings.importedEvents(added));
    } catch {
      setImportMsg(t.settings.importError);
    }
  }

  return (
    <div className="flex flex-col gap-4 pt-2">
      <h1 className="text-xl font-bold">{t.settings.title}</h1>

      <Card className="flex flex-col gap-2">
        <label className="text-sm font-medium text-boat-700">{t.settings.yourName}</label>
        <div className="flex gap-2">
          <input
            className="min-w-0 flex-1 rounded-xl border border-boat-100 px-4 py-3"
            value={name}
            onChange={(e) => setNameField(e.target.value)}
          />
          <Button onClick={() => setName(name)} className="!w-auto shrink-0 px-4">{t.common.save}</Button>
        </div>
      </Card>

      <Card className="flex items-center justify-between">
        <label className="text-sm font-medium text-boat-700">{t.settings.defaultDiners}</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            className="w-20 rounded-xl border border-boat-100 px-3 py-2"
            value={diners}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10) || 1;
              setDiners(n);
              setDefaultDiners(n);
            }}
          />
        </div>
      </Card>

      <Card className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-boat-700">
          {t.settings.durationWindowLabel}
          <span className="block text-xs font-normal text-boat-500">
            {t.settings.durationWindowHint}
          </span>
        </label>
        <input
          type="number"
          min={1}
          className="w-20 flex-shrink-0 rounded-xl border border-boat-100 px-3 py-2"
          value={durationWindow}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10) || 1;
            setDurationWindow(n);
            setDurationWindowDays(n);
          }}
        />
      </Card>

      <Card className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setEditLocked(!editLocked)}
          className="flex items-center justify-between gap-3 text-left"
        >
          <span className="flex flex-col">
            <span className="text-sm font-medium text-boat-700">{t.settings.lockEdit}</span>
            <span className="text-xs text-boat-500">{t.settings.lockEditHint}</span>
          </span>
          <span
            className={`relative h-7 w-12 flex-shrink-0 rounded-full transition-colors ${
              editLocked ? 'bg-boat-700' : 'bg-boat-100'
            }`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                editLocked ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </span>
        </button>
      </Card>

      <Card className="flex flex-col gap-3">
        <div>
          <span className="text-sm font-medium text-boat-700">{t.settings.dashboard}</span>
          <span className="block text-xs text-boat-500">{t.settings.dashboardHint}</span>
        </div>
        <Toggle
          label={t.settings.showFaultsButton}
          hint={t.settings.showFaultsButtonHint}
          checked={dashboardPrefs.showFaultsButton}
          onChange={setShowFaultsButton}
        />
        <Toggle
          label={t.settings.showDocumentsButton}
          hint={t.settings.showDocumentsButtonHint}
          checked={dashboardPrefs.showDocumentsButton}
          onChange={setShowDocumentsButton}
        />
        <Toggle
          label={t.settings.showDurationSection}
          hint={t.settings.showDurationSectionHint}
          checked={dashboardPrefs.showDurationSection}
          onChange={setShowDurationSection}
        />
        <Toggle
          label={t.settings.showResourcesSection}
          hint={t.settings.showResourcesSectionHint}
          checked={dashboardPrefs.showResourcesSection}
          onChange={setShowResourcesSection}
        />
        <Toggle
          label={t.settings.showExpiringSection}
          hint={t.settings.showExpiringSectionHint}
          checked={dashboardPrefs.showExpiringSection}
          onChange={setShowExpiringSection}
        />
      </Card>

      <Card className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-boat-700">
          {t.settings.docExpiryWarningLabel}
          <span className="block text-xs font-normal text-boat-500">
            {t.settings.docExpiryWarningHint}
          </span>
        </label>
        <input
          type="number"
          min={1}
          className="w-20 flex-shrink-0 rounded-xl border border-boat-100 px-3 py-2"
          value={docExpiryWarning}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10) || 1;
            setDocExpiryWarning(n);
            setDocExpiryWarningDays(n);
          }}
        />
      </Card>

      <Card className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-boat-700">{t.settings.sync}</span>
          <span className="text-xs text-boat-500">
            {status === 'not-configured'
              ? t.settings.localMode
              : lastSyncedAt
                ? t.settings.lastSync(relativeFromNow(lastSyncedAt))
                : t.settings.neverSynced}
          </span>
        </div>
        {pendingCount > 0 && (
          <span className="text-xs text-amber-700">{t.settings.pendingChanges(pendingCount)}</span>
        )}
        <Button variant="secondary" onClick={() => void syncNow()}>
          {t.settings.syncNow}
        </Button>
        <Button variant="secondary" onClick={() => navigate('/settings/diagnostics')}>
          {t.settings.syncDiagnostics}
        </Button>
      </Card>

      <Card className="flex flex-col gap-2">
        <span className="text-sm font-medium text-boat-700">{t.settings.backup}</span>
        <Button variant="secondary" onClick={() => void downloadBackup()}>
          {t.settings.exportJson}
        </Button>
        <label className="btn-touch w-full cursor-pointer bg-boat-100 text-boat-900">
          {t.settings.importJson}
          <input type="file" accept="application/json" className="hidden" onChange={onImport} />
        </label>
        {importMsg && <p className="text-xs text-boat-600">{importMsg}</p>}
      </Card>

      {(canInstall || isIOS) && (
        <Card className="flex flex-col gap-2">
          <span className="text-sm font-medium text-boat-700">{t.settings.installApp}</span>
          {canInstall ? (
            <Button onClick={() => void promptInstall()}>{t.settings.installOnDevice}</Button>
          ) : (
            <p className="text-xs text-boat-600">{t.settings.installIosHint}</p>
          )}
        </Card>
      )}

      <Card className="flex flex-col gap-2">
        <Button variant="secondary" onClick={() => navigate('/history')}>
          {t.settings.viewHistory}
        </Button>
        <Button variant="danger" onClick={() => void signOut()}>
          {t.settings.signOut}
        </Button>
      </Card>
    </div>
  );
}

/** Interruptor reutilitzable (mateix estil que el de "bloquejar edició"). */
function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-3 text-left"
    >
      <span className="flex flex-col">
        <span className="text-sm font-medium text-boat-700">{label}</span>
        {hint && <span className="text-xs text-boat-500">{hint}</span>}
      </span>
      <span
        className={`relative h-7 w-12 flex-shrink-0 rounded-full transition-colors ${
          checked ? 'bg-boat-700' : 'bg-boat-100'
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </span>
    </button>
  );
}
