import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { StowageLocation } from '@/types/entities';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/common';
import { Archive, Pencil } from '@/components/ui/icons';
import { LocationForm } from '@/features/locations/LocationForm';
import { useLocations, useHeaderLocation } from '@/hooks/useData';
import { useLocationPhoto } from '@/hooks/useLocationPhoto';
import { Photo } from '@/components/ui/Photo';
import { commitLocationUpsert } from '@/db/commands';
import { useAuth } from '@/auth/AuthProvider';
import { useEditLocked } from '@/hooks/useEditLocked';
import { enqueuePhoto } from '@/sync/photoQueue';
import { resizeImageToBlob } from '@/lib/image';
import { nowISO } from '@/lib/time';
import { HEADER_LOCATION_ID } from '@/features/locations/headerLocation';
import { t } from '@/text';

/** Llista de llocs d'estiva. En tocar-ne un, s'obre la vista del compartiment. */
export function LocationsList() {
  const { userName } = useAuth();
  const navigate = useNavigate();
  const locations = useLocations() ?? [];
  const editLocked = useEditLocked();
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);

  // Foto de capçalera global, sincronitzada: viu al photoPath d'un lloc reservat.
  const headerLocation = useHeaderLocation();
  const headerUrl = useLocationPhoto(headerLocation?.photoPath);

  async function onPickHeader(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !userName) return;
    setBusy(true);
    try {
      const blob = await resizeImageToBlob(file, 1280);
      const path = await enqueuePhoto(blob, 'location', HEADER_LOCATION_ID);
      const now = nowISO();
      // Upsert del lloc reservat amb la nova ruta: se sincronitza com qualsevol lloc.
      await commitLocationUpsert(userName, {
        id: HEADER_LOCATION_ID,
        name: '__capçalera__',
        photoPath: path,
        createdAt: headerLocation?.createdAt ?? now,
        updatedAt: now,
      });
    } catch {
      // Imatge no vàlida: s'ignora.
    } finally {
      setBusy(false);
    }
  }

  async function save(l: StowageLocation) {
    if (!userName) return;
    await commitLocationUpsert(userName, l);
    setCreating(false);
  }

  return (
    <div className="flex flex-col gap-3 pt-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t.locations.title}</h1>
        {!editLocked && (
          <label className="flex cursor-pointer items-center gap-1 text-sm text-boat-600 active:scale-95">
            <Pencil size={16} />
            {busy ? t.locations.processing : headerUrl ? t.locations.changePhoto : t.locations.addPhoto}
            <input type="file" accept="image/*" className="hidden" onChange={onPickHeader} />
          </label>
        )}
      </div>

      {headerUrl && (
        <div className="overflow-hidden rounded-3xl shadow-sm">
          <Photo src={headerUrl} alt={t.locations.headerAlt} className="max-h-48 w-full object-cover" />
        </div>
      )}

      {locations.length === 0 ? (
        <EmptyState icon={Archive} text={t.locations.empty} />
      ) : (
        <ul className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-4">
          {locations.map((l) => (
            <li key={l.id}>
              <button
                onClick={() => navigate(`/locations/${l.id}`)}
                className="flex min-h-touch w-full flex-col items-start justify-center gap-1 rounded-2xl bg-white p-3 shadow-sm active:scale-[0.98]"
              >
                <Archive size={26} className="text-boat-700" />
                <span className="font-semibold">{l.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!editLocked && <Button onClick={() => setCreating(true)}>{t.locations.newLocation}</Button>}

      <Sheet open={creating} onClose={() => setCreating(false)} title={t.locations.newLocationTitle}>
        <LocationForm onSave={save} onCancel={() => setCreating(false)} />
      </Sheet>
    </div>
  );
}
