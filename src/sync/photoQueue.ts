import { db, type PendingPhoto } from '@/db/db';
import { supabase } from './supabase';
import { newId } from '@/lib/id';
import { nowISO } from '@/lib/time';

const BUCKET = 'boat-photos';

/**
 * Cua de fotos offline.
 *
 * Les fotos es poden fer sense cobertura: es guarden com a Blob a Dexie i es pugen
 * soles quan torna la connexió. Veure PLA.md (secció 7, punt fotos i secció 14.8).
 */

/**
 * Encua un fitxer (foto o document) per pujar més tard. Retorna la ruta destí prevista a
 * Storage. Per defecte tracta el blob com una foto JPEG (compatibilitat amb les crides
 * existents). Per a documents (PDF o imatge) cal passar `mime`/`ext` perquè el fitxer es
 * pugi amb el contentType correcte i la ruta tingui l'extensió adequada.
 */
export async function enqueuePhoto(
  blob: Blob,
  targetType: 'object' | 'location' | 'app' | 'fault' | 'document',
  targetId: string,
  opts?: { mime?: string; ext?: string },
): Promise<string> {
  const id = newId();
  const ext = opts?.ext ?? 'jpg';
  const path = `${targetType}s/${targetId}/${id}.${ext}`;
  const photo: PendingPhoto = {
    id: path, // la clau és la ruta destí (estable, dedup)
    blob,
    targetType,
    targetId,
    createdAt: nowISO(),
    mime: opts?.mime ?? 'image/jpeg',
    ext,
  };
  await db.pendingPhotos.put(photo);
  return path;
}

/**
 * Puja totes les fotos pendents a Supabase Storage. Es crida des del motor de sync
 * quan hi ha connexió. Les fotos pujades amb èxit es treuen de la cua.
 *
 * @returns nombre de fotos pujades.
 */
export async function flushPendingPhotos(): Promise<number> {
  if (!supabase) return 0;
  const pending = await db.pendingPhotos.toArray();
  let uploaded = 0;

  for (const photo of pending) {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(photo.id, photo.blob, {
        upsert: true,
        contentType: photo.mime ?? 'image/jpeg',
      });
    if (!error) {
      await db.pendingPhotos.delete(photo.id);
      uploaded++;
    }
    // Si falla, es queda a la cua per al pròxim intent.
  }
  return uploaded;
}

/** URL pública/signada d'una foto a partir de la seva ruta a Storage. */
export async function getPhotoUrl(path: string): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
