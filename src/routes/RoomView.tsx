import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { StowageLocation } from '@/types/entities';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/common';
import { Archive, Pencil, Trash2 } from '@/components/ui/icons';
import { Photo } from '@/components/ui/Photo';
import { LocationForm } from '@/features/locations/LocationForm';
import { getRoom, isRoomId, roomIdOf } from '@/features/locations/rooms';
import { useLocations, useRoomPhotoLocation } from '@/hooks/useData';
import { useLocationPhoto } from '@/hooks/useLocationPhoto';
import { commitLocationUpsert } from '@/db/commands';
import { useAuth } from '@/auth/AuthProvider';
import { useEditLocked } from '@/hooks/useEditLocked';
import { enqueuePhoto } from '@/sync/photoQueue';
import { resizeImageToBlob } from '@/lib/image';
import { nowISO } from '@/lib/time';
import { t } from '@/text';

/**
 * Vista d'una estància: foto pròpia (sincronitzada via lloc reservat) i la llista
 * de llocs d'estiva que hi pertanyen. En tocar un lloc, s'obre la seva vista.
 */
export function RoomView() {
  const { room: roomParam } = useParams();
  const navigate = useNavigate();
  const { userName } = useAuth();
  const locations = useLocations() ?? [];
  const editLocked = useEditLocked();
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);

  const room = isRoomId(roomParam) ? getRoom(roomParam) : undefined;

  // Foto de l'estància: viu al photoPath d'un lloc reservat (un per estància).
  const photoLocation = useRoomPhotoLocation(room);
  const photoUrl = useLocationPhoto(photoLocation?.photoPath);

  const here = useMemo(
    () => locations.filter((l) => roomIdOf(l) === room?.id),
    [locations, room?.id],
  );

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !userName || !room) return;
    setBusy(true);
    try {
      const blob = await resizeImageToBlob(file, 1280);
      const path = await enqueuePhoto(blob, 'location', room.photoLocationId);
      const now = nowISO();
      // Upsert del lloc reservat amb la nova ruta: se sincronitza com qualsevol lloc.
      await commitLocationUpsert(userName, {
        id: room.photoLocationId,
        name: `__estança_${room.id}__`,
        photoPath: path,
        createdAt: photoLocation?.createdAt ?? now,
        updatedAt: now,
      });
    } catch {
      // Imatge no vàlida: s'ignora.
    } finally {
      setBusy(false);
    }
  }

  async function removePhoto() {
    if (!userName || !room || !photoLocation) return;
    const now = nowISO();
    // Upsert del lloc reservat sense photoPath: esborra la referència a la foto.
    await commitLocationUpsert(userName, {
      id: room.photoLocationId,
      name: `__estança_${room.id}__`,
      photoPath: undefined,
      createdAt: photoLocation.createdAt ?? now,
      updatedAt: now,
    });
  }

  async function save(l: StowageLocation) {
    if (!userName) return;
    await commitLocationUpsert(userName, l);
    setCreating(false);
  }

  if (!room) {
    return <EmptyState text={t.roomView.notFound} />;
  }

  const Icon = room.icon;

  return (
    <div className="flex flex-col gap-3 pt-2">
      <button onClick={() => navigate('/locations')} className="self-start text-sm text-boat-600">
        {t.roomView.back}
      </button>

      <div className="flex items-center justify-between gap-2">
        <h1 className="flex min-w-0 items-center gap-2 text-xl font-bold">
          <Icon size={22} className="flex-shrink-0 text-boat-700" />
          <span className="truncate">{t.rooms[room.id]}</span>
        </h1>
        {!editLocked && (
          <div className="flex flex-shrink-0 items-center gap-3">
            <label className="flex cursor-pointer items-center gap-1 text-sm text-boat-600 active:scale-95">
              <Pencil size={16} />
              {busy ? t.roomView.processing : photoUrl ? t.roomView.changePhoto : t.roomView.addPhoto}
              <input type="file" accept="image/*" className="hidden" onChange={onPickPhoto} />
            </label>
            {photoUrl && (
              <button
                onClick={() => void removePhoto()}
                className="flex items-center gap-1 text-sm text-red-600 active:scale-95"
              >
                <Trash2 size={16} />
                {t.roomView.removePhoto}
              </button>
            )}
          </div>
        )}
      </div>

      {photoUrl && (
        <div className="overflow-hidden rounded-3xl shadow-sm">
          <Photo src={photoUrl} alt={t.roomView.photoAlt(t.rooms[room.id])} className="max-h-64 w-full object-cover" />
        </div>
      )}

      {here.length === 0 ? (
        <EmptyState icon={Archive} text={t.roomView.empty} />
      ) : (
        <ul className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-4">
          {here.map((l) => (
            <li key={l.id} className="flex">
              <button
                onClick={() => navigate(`/locations/${l.id}`)}
                className="flex h-full min-h-touch w-full flex-col items-start gap-1 rounded-2xl bg-white p-3 text-left shadow-sm active:scale-[0.98]"
              >
                <span className="flex items-center gap-2">
                  <Archive size={20} className="flex-shrink-0 text-boat-700" />
                  <span className="text-xs text-boat-500">{t.rooms[room.id]}</span>
                </span>
                <span className="w-full text-sm font-semibold leading-tight">{l.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!editLocked && <Button onClick={() => setCreating(true)}>{t.roomView.newLocation}</Button>}

      <Sheet open={creating} onClose={() => setCreating(false)} title={t.locations.newLocationTitle}>
        <LocationForm
          initialRoom={room.id === 'other' ? undefined : room.id}
          onSave={save}
          onCancel={() => setCreating(false)}
        />
      </Sheet>
    </div>
  );
}
