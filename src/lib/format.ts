import type { QuantityType } from '@/types/entities';

/** Formata una quantitat amb la seva unitat de forma llegible. */
export function formatQuantity(qty: number, type: QuantityType): string {
  const rounded = Math.round(qty * 100) / 100;
  switch (type) {
    case 'units':
      return `${rounded}`;
    case 'kg':
      return `${rounded} kg`;
    case 'L':
      return `${rounded} L`;
  }
}

/** Treu diacrítics combinants i passa a minúscules, per cercar/ordenar sense accents. */
export function normalizeText(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Formata una quantitat per a RECEPTES: el pes va en grams (té més sentit a cuina) i la
 * unitat surt a la dreta per a pes/volum. A diferència de `formatQuantity`, NO arrodoneix
 * (l'usuari vol quantitats exactes); només neteja el soroll binari de la coma flotant.
 */
export function formatRecipeQuantity(qty: number, type: QuantityType): string {
  switch (type) {
    case 'units':
      return `${cleanFloat(qty)}`;
    case 'kg':
      return `${cleanFloat(qty * 1000)} g`;
    case 'L':
      return `${cleanFloat(qty)} L`;
  }
}

/** Neteja el soroll de coma flotant (p.ex. 0.1*3 → 0.3) sense arrodonir de debò. */
function cleanFloat(n: number): number {
  return Math.round(n * 1000) / 1000;
}
