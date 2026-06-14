import { describe, it, expect } from 'vitest';
import {
  deriveFaults,
  activeFaults,
  highestActiveSeverity,
} from './deriveFaults';
import type { AppEvent, OrderKey } from '@/types/events';

// ── helpers ────────────────────────────────────────────────────────────────────
let seq = 0;
function base(occurredAt: string, deviceId = 'd', userName = 't') {
  return { id: `e${++seq}`, occurredAt, deviceId, userName, seq };
}
function report(
  occurredAt: string,
  faultId: string,
  severity: 'yellow' | 'orange' | 'red',
  opts: { title?: string; description?: string; userName?: string } = {},
): AppEvent {
  return {
    ...base(occurredAt, 'd', opts.userName ?? 't'),
    id: faultId, // perquè faultId === id del report (no s'usa per a la lògica, però és el conveni)
    type: 'fault_report',
    faultId,
    title: opts.title ?? 'Avaria',
    description: opts.description ?? 'desc',
    severity,
  };
}
function update(occurredAt: string, faultId: string, text: string, userName = 't'): AppEvent {
  return { ...base(occurredAt, 'd', userName), type: 'fault_update', faultId, text };
}
function resolve(occurredAt: string, faultId: string, userName = 't'): AppEvent {
  return { ...base(occurredAt, 'd', userName), type: 'fault_resolve', faultId };
}
function reopen(occurredAt: string, faultId: string, userName = 't'): AppEvent {
  return { ...base(occurredAt, 'd', userName), type: 'fault_reopen', faultId };
}
function barrier(occurredAt: string, cut: OrderKey): AppEvent {
  return { ...base(occurredAt), type: 'fault_barrier', cut };
}

describe('deriveFaults', () => {
  it('un report apareix com a avaria activa amb les seves dades', () => {
    const events = [
      report('2026-01-02T00:00:00Z', 'f1', 'orange', {
        title: 'Motor',
        description: 'No arrenca',
        userName: 'Aimar',
      }),
    ];
    const f = deriveFaults(events).get('f1')!;
    expect(f.title).toBe('Motor');
    expect(f.description).toBe('No arrenca');
    expect(f.severity).toBe('orange');
    expect(f.reportedBy).toBe('Aimar');
    expect(f.resolved).toBe(false);
    expect(f.updates).toEqual([]);
  });

  it('els updates s\'ordenen cronològicament encara que arribin desordenats', () => {
    const events = [
      report('2026-01-02T00:00:00Z', 'f1', 'yellow'),
      update('2026-01-04T00:00:00Z', 'f1', 'segon'),
      update('2026-01-03T00:00:00Z', 'f1', 'primer'),
    ];
    const f = deriveFaults(events).get('f1')!;
    expect(f.updates.map((u) => u.text)).toEqual(['primer', 'segon']);
  });

  it('resolve marca resolt i la treu de les actives', () => {
    const events = [
      report('2026-01-02T00:00:00Z', 'f1', 'red'),
      resolve('2026-01-05T00:00:00Z', 'f1', 'Marc'),
    ];
    const map = deriveFaults(events);
    const f = map.get('f1')!;
    expect(f.resolved).toBe(true);
    expect(f.resolvedBy).toBe('Marc');
    expect(activeFaults(map)).toHaveLength(0);
  });

  it('reobrir torna una avaria resolta a les actives', () => {
    const events = [
      report('2026-01-02T00:00:00Z', 'f1', 'red'),
      resolve('2026-01-05T00:00:00Z', 'f1'),
      reopen('2026-01-06T00:00:00Z', 'f1', 'Aimar'),
    ];
    const map = deriveFaults(events);
    const f = map.get('f1')!;
    expect(f.resolved).toBe(false);
    expect(f.resolvedAt).toBeUndefined();
    expect(activeFaults(map)).toHaveLength(1);
  });

  it('un update d\'una avaria resolta s\'admet i no la reviu', () => {
    const events = [
      report('2026-01-02T00:00:00Z', 'f1', 'red'),
      resolve('2026-01-05T00:00:00Z', 'f1'),
      update('2026-01-06T00:00:00Z', 'f1', 'post'),
    ];
    const f = deriveFaults(events).get('f1')!;
    expect(f.resolved).toBe(true);
    expect(f.updates.map((u) => u.text)).toEqual(['post']);
  });

  it('la barrera de reset ignora els events anteriors al tall', () => {
    const cut: OrderKey = { occurredAt: '2026-02-01T00:00:00Z', deviceId: 'd', seq: 999 };
    const events = [
      report('2026-01-02T00:00:00Z', 'f1', 'red'), // abans del tall → ignorada
      barrier('2026-02-01T00:00:00Z', cut),
      report('2026-02-02T00:00:00Z', 'f2', 'yellow'), // després → es manté
    ];
    const map = deriveFaults(events);
    expect(map.has('f1')).toBe(false);
    expect(map.has('f2')).toBe(true);
  });

  it('activeFaults ordena per gravetat (vermell → taronja → groc)', () => {
    const events = [
      report('2026-01-02T00:00:00Z', 'fy', 'yellow'),
      report('2026-01-02T00:00:00Z', 'fr', 'red'),
      report('2026-01-02T00:00:00Z', 'fo', 'orange'),
    ];
    const order = activeFaults(deriveFaults(events)).map((f) => f.id);
    expect(order).toEqual(['fr', 'fo', 'fy']);
  });

  it('highestActiveSeverity ignora les resoltes', () => {
    const events = [
      report('2026-01-02T00:00:00Z', 'fr', 'red'),
      resolve('2026-01-03T00:00:00Z', 'fr'),
      report('2026-01-02T00:00:00Z', 'fy', 'yellow'),
    ];
    expect(highestActiveSeverity(deriveFaults(events))).toBe('yellow');
  });
});
