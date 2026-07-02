import { describe, it, expect } from 'vitest';
import { deriveGuide } from './deriveGuide';
import type { AppEvent } from '@/types/events';
import type { GuideSection } from '@/types/entities';

// ── helpers ────────────────────────────────────────────────────────────────────
let seq = 0;
function base(occurredAt: string, deviceId = 'd', userName = 't') {
  return { id: `e${++seq}`, occurredAt, deviceId, userName, seq };
}
function section(id: string, opts: Partial<GuideSection> = {}): GuideSection {
  return {
    id,
    title: opts.title ?? `Secció ${id}`,
    icon: opts.icon ?? 'book',
    blocks: opts.blocks ?? [{ kind: 'paragraph', text: 'text' }],
    order: opts.order ?? 0,
    createdAt: opts.createdAt ?? '2026-01-01T00:00:00.000Z',
    updatedAt: opts.updatedAt ?? '2026-01-01T00:00:00.000Z',
    deleted: opts.deleted,
  };
}
function upsert(occurredAt: string, payload: GuideSection): AppEvent {
  return { ...base(occurredAt), type: 'guide_upsert', payload };
}
function del(occurredAt: string, sectionId: string): AppEvent {
  return { ...base(occurredAt), type: 'guide_delete', sectionId };
}

describe('deriveGuide', () => {
  it('un upsert crea una secció', () => {
    const s = section('a', { title: 'WC' });
    const result = deriveGuide([upsert('2026-02-01T00:00:00.000Z', s)]);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('a');
    expect(result[0]!.title).toBe('WC');
  });

  it('un upsert posterior reemplaça (last-writer-wins)', () => {
    const events = [
      upsert('2026-02-01T00:00:00.000Z', section('a', { title: 'Vell' })),
      upsert('2026-02-02T00:00:00.000Z', section('a', { title: 'Nou' })),
    ];
    const result = deriveGuide(events);
    expect(result).toHaveLength(1);
    expect(result[0]!.title).toBe('Nou');
  });

  it("l'ordre dels events NO importa: mana la clau d'ordre, no l'ordre d'entrada", () => {
    // El més recent es passa primer; ha de guanyar igualment.
    const events = [
      upsert('2026-02-02T00:00:00.000Z', section('a', { title: 'Nou' })),
      upsert('2026-02-01T00:00:00.000Z', section('a', { title: 'Vell' })),
    ];
    expect(deriveGuide(events)[0]!.title).toBe('Nou');
  });

  it('un delete amaga la secció', () => {
    const events = [
      upsert('2026-02-01T00:00:00.000Z', section('a')),
      del('2026-02-02T00:00:00.000Z', 'a'),
    ];
    expect(deriveGuide(events)).toHaveLength(0);
  });

  it('un re-upsert posterior a un delete torna a crear la secció', () => {
    const events = [
      upsert('2026-02-01T00:00:00.000Z', section('a')),
      del('2026-02-02T00:00:00.000Z', 'a'),
      upsert('2026-02-03T00:00:00.000Z', section('a', { title: 'Renascuda' })),
    ];
    const result = deriveGuide(events);
    expect(result).toHaveLength(1);
    expect(result[0]!.title).toBe('Renascuda');
  });

  it('la marca deleted al payload també exclou la secció', () => {
    const events = [upsert('2026-02-01T00:00:00.000Z', section('a', { deleted: true }))];
    expect(deriveGuide(events)).toHaveLength(0);
  });

  it('les seccions surten ordenades per order, després createdAt, després id', () => {
    const events = [
      upsert('2026-02-01T00:00:00.000Z', section('c', { order: 2 })),
      upsert('2026-02-01T00:00:00.000Z', section('a', { order: 0 })),
      upsert('2026-02-01T00:00:00.000Z', section('b', { order: 1 })),
    ];
    expect(deriveGuide(events).map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });

  it('desempat per createdAt quan order és igual', () => {
    const events = [
      upsert('2026-02-01T00:00:00.000Z', section('x', { order: 0, createdAt: '2026-01-02T00:00:00.000Z' })),
      upsert('2026-02-01T00:00:00.000Z', section('y', { order: 0, createdAt: '2026-01-01T00:00:00.000Z' })),
    ];
    expect(deriveGuide(events).map((s) => s.id)).toEqual(['y', 'x']);
  });
});
