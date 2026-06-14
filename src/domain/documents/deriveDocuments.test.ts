import { describe, it, expect } from 'vitest';
import {
  deriveDocuments,
  activeDocuments,
  visibleComments,
  documentsByCategory,
  daysUntilExpiry,
  expiringCount,
} from './deriveDocuments';
import type { DocCategory, DocVersionData } from '@/types/entities';
import type { AppEvent, OrderKey } from '@/types/events';

// ── helpers ────────────────────────────────────────────────────────────────────
let seq = 0;
function base(occurredAt: string, deviceId = 'd', userName = 't') {
  return { id: `e${++seq}`, occurredAt, deviceId, userName, seq };
}
function create(
  occurredAt: string,
  docId: string,
  category: DocCategory,
  opts: {
    title?: string;
    description?: string;
    data?: DocVersionData;
    userName?: string;
  } = {},
): AppEvent {
  return {
    ...base(occurredAt, 'd', opts.userName ?? 't'),
    id: docId, // conveni: docId === id del create
    type: 'document_create',
    docId,
    title: opts.title ?? 'Document',
    description: opts.description ?? 'desc',
    category,
    data: opts.data ?? {},
  };
}
function edit(
  occurredAt: string,
  docId: string,
  category: DocCategory,
  opts: { title?: string; description?: string; data?: DocVersionData } = {},
): AppEvent {
  return {
    ...base(occurredAt),
    type: 'document_edit',
    docId,
    title: opts.title ?? 'Document',
    description: opts.description ?? 'desc',
    category,
    data: opts.data ?? {},
  };
}
function renew(occurredAt: string, docId: string, data: DocVersionData): AppEvent {
  return { ...base(occurredAt), type: 'document_renew', docId, data };
}
function comment(
  occurredAt: string,
  docId: string,
  versionSeq: number,
  text: string,
): AppEvent {
  const ev = base(occurredAt);
  return { ...ev, type: 'document_comment', docId, versionSeq, text };
}
function commentDelete(occurredAt: string, docId: string, commentId: string): AppEvent {
  return { ...base(occurredAt), type: 'document_comment_delete', docId, commentId };
}
function del(occurredAt: string, docId: string, userName = 't'): AppEvent {
  return { ...base(occurredAt, 'd', userName), type: 'document_delete', docId };
}
function restore(occurredAt: string, docId: string, userName = 't'): AppEvent {
  return { ...base(occurredAt, 'd', userName), type: 'document_restore', docId };
}
function barrier(occurredAt: string, cut: OrderKey): AppEvent {
  return { ...base(occurredAt), type: 'document_barrier', cut };
}

describe('deriveDocuments', () => {
  it('un create apareix com a document actiu amb la seva versió 0', () => {
    const events = [
      create('2026-01-02T00:00:00Z', 'd1', 'inspection', {
        title: 'ITB',
        description: 'Inspecció',
        data: { validUntil: '2027-01-01T00:00:00Z', reference: 'ABC' },
        userName: 'Aimar',
      }),
    ];
    const d = deriveDocuments(events).get('d1')!;
    expect(d.title).toBe('ITB');
    expect(d.category).toBe('inspection');
    expect(d.createdBy).toBe('Aimar');
    expect(d.current.seq).toBe(0);
    expect(d.current.reference).toBe('ABC');
    expect(d.versions).toHaveLength(1);
    expect(d.deleted).toBe(false);
  });

  it('editar NO crea una versió nova; substitueix les dades de la vigent', () => {
    const events = [
      create('2026-01-02T00:00:00Z', 'd1', 'inspection', {
        data: { reference: 'OLD' },
      }),
      edit('2026-01-03T00:00:00Z', 'd1', 'customs', {
        title: 'Nou títol',
        data: { reference: 'NEW' },
      }),
    ];
    const d = deriveDocuments(events).get('d1')!;
    expect(d.versions).toHaveLength(1);
    expect(d.title).toBe('Nou títol');
    expect(d.category).toBe('customs');
    expect(d.current.reference).toBe('NEW');
  });

  it('renovar crea una versió nova i la vigent passa a ser la més recent', () => {
    const events = [
      create('2026-01-02T00:00:00Z', 'd1', 'license', {
        data: { validUntil: '2026-06-01T00:00:00Z' },
      }),
      renew('2026-05-01T00:00:00Z', 'd1', { validUntil: '2031-05-01T00:00:00Z' }),
    ];
    const d = deriveDocuments(events).get('d1')!;
    expect(d.versions).toHaveLength(2);
    expect(d.current.seq).toBe(1);
    expect(d.current.validUntil).toBe('2031-05-01T00:00:00Z');
    expect(d.versions[0]!.validUntil).toBe('2026-06-01T00:00:00Z');
  });

  it('els comentaris de versions antigues surten de la targeta en renovar però queden a l\'historial', () => {
    const events = [
      create('2026-01-02T00:00:00Z', 'd1', 'safety'),
      comment('2026-01-03T00:00:00Z', 'd1', 0, 'sobre v0'),
      renew('2026-02-01T00:00:00Z', 'd1', {}),
      comment('2026-02-02T00:00:00Z', 'd1', 1, 'sobre v1'),
    ];
    const d = deriveDocuments(events).get('d1')!;
    expect(d.comments).toHaveLength(2); // tots a l'historial
    expect(visibleComments(d).map((c) => c.text)).toEqual(['sobre v1']);
  });

  it('eliminar un comentari el treu de la targeta però el conserva a l\'historial', () => {
    const events = [
      create('2026-01-02T00:00:00Z', 'd1', 'other'),
      comment('2026-01-03T00:00:00Z', 'd1', 0, 'visible'),
    ];
    const map1 = deriveDocuments(events);
    const cId = map1.get('d1')!.comments[0]!.id;
    const events2 = [...events, commentDelete('2026-01-04T00:00:00Z', 'd1', cId)];
    const d = deriveDocuments(events2).get('d1')!;
    expect(d.comments).toHaveLength(1);
    expect(d.comments[0]!.deleted).toBe(true);
    expect(visibleComments(d)).toHaveLength(0);
  });

  it('eliminar el document el treu de la llista d\'actius però queda al mapa', () => {
    const events = [
      create('2026-01-02T00:00:00Z', 'd1', 'insurance'),
      del('2026-01-05T00:00:00Z', 'd1', 'Marc'),
    ];
    const map = deriveDocuments(events);
    const d = map.get('d1')!;
    expect(d.deleted).toBe(true);
    expect(d.deletedBy).toBe('Marc');
    expect(activeDocuments(map)).toHaveLength(0);
  });

  it('reinstaurar torna un document eliminat a la llista d\'actius', () => {
    const events = [
      create('2026-01-02T00:00:00Z', 'd1', 'insurance'),
      del('2026-01-05T00:00:00Z', 'd1'),
      restore('2026-01-06T00:00:00Z', 'd1', 'Aimar'),
    ];
    const map = deriveDocuments(events);
    const d = map.get('d1')!;
    expect(d.deleted).toBe(false);
    expect(d.deletedAt).toBeUndefined();
    expect(activeDocuments(map)).toHaveLength(1);
  });

  it('la barrera de reset ignora els events anteriors al tall', () => {
    const cut: OrderKey = { occurredAt: '2026-02-01T00:00:00Z', deviceId: 'd', seq: 999 };
    const events = [
      create('2026-01-02T00:00:00Z', 'd1', 'inspection'), // abans → ignorat
      barrier('2026-02-01T00:00:00Z', cut),
      create('2026-02-02T00:00:00Z', 'd2', 'customs'), // després → es manté
    ];
    const map = deriveDocuments(events);
    expect(map.has('d1')).toBe(false);
    expect(map.has('d2')).toBe(true);
  });

  it('els events arribats desordenats deriven el mateix (ordre determinista)', () => {
    const ordered = [
      create('2026-01-02T00:00:00Z', 'd1', 'license', { data: { validUntil: '2026-06-01T00:00:00Z' } }),
      renew('2026-05-01T00:00:00Z', 'd1', { validUntil: '2031-05-01T00:00:00Z' }),
    ];
    const shuffled = [ordered[1]!, ordered[0]!];
    const a = deriveDocuments(ordered).get('d1')!;
    const b = deriveDocuments(shuffled).get('d1')!;
    expect(b.current.seq).toBe(a.current.seq);
    expect(b.current.validUntil).toBe(a.current.validUntil);
  });

  it('documentsByCategory agrupa només els actius', () => {
    const events = [
      create('2026-01-02T00:00:00Z', 'd1', 'inspection'),
      create('2026-01-02T00:00:00Z', 'd2', 'inspection'),
      create('2026-01-02T00:00:00Z', 'd3', 'customs'),
      del('2026-01-03T00:00:00Z', 'd3'),
    ];
    const byCat = documentsByCategory(deriveDocuments(events));
    expect(byCat.get('inspection')).toHaveLength(2);
    expect(byCat.has('customs')).toBe(false);
  });

  it('daysUntilExpiry i expiringCount tenen en compte el llindar', () => {
    const now = '2026-01-01T00:00:00Z';
    const events = [
      create('2025-12-01T00:00:00Z', 'd1', 'license', { data: { validUntil: '2026-01-10T00:00:00Z' } }), // 9 dies
      create('2025-12-01T00:00:00Z', 'd2', 'license', { data: { validUntil: '2026-03-01T00:00:00Z' } }), // lluny
      create('2025-12-01T00:00:00Z', 'd3', 'license'), // sense validesa
    ];
    const map = deriveDocuments(events);
    expect(Math.round(daysUntilExpiry(map.get('d1')!, now)!)).toBe(9);
    expect(daysUntilExpiry(map.get('d3')!, now)).toBeNull();
    expect(expiringCount(map.values(), 30, now)).toBe(1);
  });
});
