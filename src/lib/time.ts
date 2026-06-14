import type { ISOTimestamp } from '@/types/entities';

/** Marca de temps ISO 8601 del moment actual (rellotge del dispositiu). */
export function nowISO(): ISOTimestamp {
  return new Date().toISOString();
}

/** Suma `days` dies a una marca de temps ISO i retorna la nova marca ISO. */
export function addDaysISO(iso: ISOTimestamp, days: number): ISOTimestamp {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/** Dies (pot ser fraccionari) entre dues marques ISO: `to - from`. */
export function diffDays(from: ISOTimestamp, to: ISOTimestamp): number {
  const ms = new Date(to).getTime() - new Date(from).getTime();
  return ms / (1000 * 60 * 60 * 24);
}

/** Converteix una marca ISO al valor d'un `<input type="date">` (YYYY-MM-DD), o ''. */
export function isoToDateInput(iso?: ISOTimestamp): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

/** Converteix el valor d'un `<input type="date">` (YYYY-MM-DD) a marca ISO, o undefined. */
export function dateInputToISO(value: string): ISOTimestamp | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

/** Format de data curt en català (dd/mm/aaaa) a partir d'una marca ISO. */
export function formatDate(iso?: ISOTimestamp): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Format relatiu curt en català: "fa 3 min", "fa 2 h", "ara mateix". */
export function relativeFromNow(iso: ISOTimestamp): string {
  const secs = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 30) return 'ara mateix';
  if (secs < 60) return `fa ${secs} s`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `fa ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `fa ${hours} h`;
  const days = Math.round(hours / 24);
  return `fa ${days} d`;
}
