import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { StowageLocation } from '@/types/entities';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { Pencil, Trash2 } from '@/components/ui/icons';
import { LocationForm } from '@/features/locations/LocationForm';
import { ROOMS, roomIdOf } from '@/features/locations/rooms';
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

  // Recompte de llocs per estància (els llocs sense estància no es mostren a cap targeta).
  const countByRoom = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of locations) {
      const id = roomIdOf(l);
      m.set(id, (m.get(id) ?? 0) + 1);
    }
    return m;
  }, [locations]);

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

  async function removeHeader() {
    if (!userName || !headerLocation) return;
    const now = nowISO();
    // Upsert del lloc reservat sense photoPath: esborra la referència a la foto.
    await commitLocationUpsert(userName, {
      id: HEADER_LOCATION_ID,
      name: '__capçalera__',
      photoPath: undefined,
      createdAt: headerLocation.createdAt ?? now,
      updatedAt: now,
    });
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
          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-1 text-sm text-boat-600 active:scale-95">
              <Pencil size={16} />
              {busy ? t.locations.processing : headerUrl ? t.locations.changePhoto : t.locations.addPhoto}
              <input type="file" accept="image/*" className="hidden" onChange={onPickHeader} />
            </label>
            {headerUrl && (
              <button
                onClick={() => void removeHeader()}
                className="flex items-center gap-1 text-sm text-red-600 active:scale-95"
              >
                <Trash2 size={16} />
                {t.locations.removePhoto}
              </button>
            )}
          </div>
        )}
      </div>

      {headerUrl && (
        <div className="overflow-hidden rounded-3xl shadow-sm">
          <Photo src={headerUrl} alt={t.locations.headerAlt} className="max-h-48 w-full object-cover" />
        </div>
      )}

      <ul className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-4">
        {ROOMS.map((r) => {
          const Icon = r.icon;
          const count = countByRoom.get(r.id) ?? 0;
          return (
            <li key={r.id} className="flex">
              <button
                onClick={() => navigate(`/locations/room/${r.id}`)}
                className="flex h-full min-h-touch w-full flex-col items-start justify-start gap-2 rounded-2xl bg-white p-4 shadow-sm active:scale-[0.98]"
              >
                <Icon size={28} className="text-boat-700" />
                <span className="w-full text-left text-base font-semibold leading-tight">{t.rooms[r.id]}</span>
                <span className="w-full text-left text-sm text-boat-500">
                  {t.locations.roomCount(count)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {!editLocked && <Button onClick={() => setCreating(true)}>{t.locations.newLocation}</Button>}

      <Sheet open={creating} onClose={() => setCreating(false)} title={t.locations.newLocationTitle}>
        <LocationForm onSave={save} onCancel={() => setCreating(false)} />
      </Sheet>
    </div>
  );
}
