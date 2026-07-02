import type { ID, GuideSection } from '@/types/entities';
import type { AppEvent } from '@/types/events';
import { sortEvents } from '@/domain/inventory/ordering';

/**
 * Deriva les seccions de la guia del vaixell reproduint els esdeveniments
 * `guide_upsert` / `guide_delete` en ordre cronològic.
 *
 * Estratègia: last-writer-wins, idèntica a {@link deriveDefinitions}. Com que els
 * esdeveniments es processen en l'ordre determinista de {@link sortEvents}, l'últim
 * upsert/delete d'una secció guanya de forma idèntica a tots els dispositius. Un
 * `guide_delete` posterior a un upsert treu la secció; un re-upsert posterior la torna a
 * crear.
 *
 * Retorna un array JA ORDENAT per a la vista i el recompute: `(order, createdAt, id)`,
 * excloent les seccions eliminades.
 */
export function deriveGuide(events: readonly AppEvent[]): GuideSection[] {
  const sections = new Map<ID, GuideSection>();

  for (const ev of sortEvents(events)) {
    switch (ev.type) {
      case 'guide_upsert':
        sections.set(ev.payload.id, ev.payload);
        break;
      case 'guide_delete':
        sections.delete(ev.sectionId);
        break;
      // La resta d'esdeveniments no afecten la guia.
    }
  }

  return [...sections.values()]
    .filter((s) => !s.deleted)
    .sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
}
