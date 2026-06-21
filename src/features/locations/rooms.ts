/**
 * Estàncies del vaixell on s'agrupen els llocs d'estiva.
 *
 * És una llista FIXA al codi (com `DOC_CATEGORIES`): cada lloc guarda a quina
 * estància pertany via el camp `room` de `StowageLocation`. No són entitats
 * sincronitzades.
 *
 * Cada estància té una FOTO pròpia, pujable per la tripulació. Reaprofitem el
 * truc del "lloc reservat" (com `HEADER_LOCATION_ID`): la foto viu al `photoPath`
 * d'un `StowageLocation` amb un UUID fix i reservat per estància. Així viatja per
 * la sincronització sense afegir cap tipus d'esdeveniment nou. Aquests "llocs"
 * reservats es filtren de `useLocations` perquè ningú els tracti com a reals.
 */
import { Table, CookingPot, Bed, Toilet, Sun, Archive } from '@/components/ui/icons';
import type { LucideIcon } from '@/components/ui/icons';
import type { RoomId, StowageLocation } from '@/types/entities';

export type { RoomId };

export interface RoomDef {
  id: RoomId;
  icon: LucideIcon;
  /** UUID v4 fix i reservat que porta la foto d'aquesta estància. */
  photoLocationId: string;
}

/**
 * Les estàncies en ordre de presentació. Els `photoLocationId` són UUID v4 vàlids
 * i fixos (han de ser-ho: el trigger de mirall de Supabase fa el cast a uuid en
 * aplicar un `location_upsert`). Sufix reconeixible 0010..0017.
 *
 * "Altres" (`other`) és l'estància on cauen els llocs sense estància assignada
 * (camp `room` buit). En el formulari es tria "Sense estància" (room = undefined);
 * mai es desa el literal `other`, però `roomIdOf` hi mapeja aquests llocs.
 */
export const ROOMS: RoomDef[] = [
  { id: 'salon', icon: Table, photoLocationId: '00000000-0000-4000-8000-000000000010' },
  { id: 'kitchen', icon: CookingPot, photoLocationId: '00000000-0000-4000-8000-000000000011' },
  { id: 'cabin_bow', icon: Bed, photoLocationId: '00000000-0000-4000-8000-000000000012' },
  { id: 'cabin_starboard', icon: Bed, photoLocationId: '00000000-0000-4000-8000-000000000013' },
  { id: 'cabin_port', icon: Bed, photoLocationId: '00000000-0000-4000-8000-000000000014' },
  { id: 'bathroom', icon: Toilet, photoLocationId: '00000000-0000-4000-8000-000000000015' },
  { id: 'deck', icon: Sun, photoLocationId: '00000000-0000-4000-8000-000000000016' },
  { id: 'other', icon: Archive, photoLocationId: '00000000-0000-4000-8000-000000000017' },
];

/** Estàncies que es trien al formulari (totes menys "Altres", que és el calaix per defecte). */
export const SELECTABLE_ROOMS: RoomDef[] = ROOMS.filter((r) => r.id !== 'other');

const BY_ID = new Map(ROOMS.map((r) => [r.id, r]));

export function getRoom(id: RoomId): RoomDef | undefined {
  return BY_ID.get(id);
}

export function isRoomId(value: string | null | undefined): value is RoomId {
  return value != null && BY_ID.has(value as RoomId);
}

/** Estància efectiva d'un lloc: la seva, o "Altres" si no en té (o és invàlida). */
export function roomIdOf(location: Pick<StowageLocation, 'room'>): RoomId {
  return isRoomId(location.room) ? location.room : 'other';
}

/** Tots els IDs reservats per a fotos d'estància (per filtrar-los de les llistes). */
export const ROOM_PHOTO_LOCATION_IDS: string[] = ROOMS.map((r) => r.photoLocationId);
