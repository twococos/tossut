// ─────────────────────────────────────────────────────────────────────────────
// Punt central d'icones (lucide-react).
//
// Tots els components importen les icones d'aquí en comptes de fer servir emojis o
// importar lucide directament, perquè el conjunt d'icones de l'app sigui coherent i
// fàcil de canviar en un sol lloc.
// ─────────────────────────────────────────────────────────────────────────────
import {
  Home,
  Archive,
  Package,
  CheckSquare,
  Square,
  Settings,
  Sailboat,
  ChefHat,
  ShoppingCart,
  ClipboardList,
  Wrench,
  BookOpen,
  Book,
  Droplet,
  Cookie,
  CakeSlice,
  Croissant,
  Search,
  Flame,
  AlertTriangle,
  ThumbsUp,
  Utensils,
  Salad,
  ScrollText,
  Inbox,
  Trash2,
  Pencil,
  Minus,
  X,
  RotateCcw,
  History,
  Fuel,
  Droplets,
  Gauge,
  Anchor,
  LifeBuoy,
  MessageSquarePlus,
  CheckCircle,
  Plus,
  ImagePlus,
  FileText,
  FilePlus,
  FileCheck,
  RefreshCw,
  FolderOpen,
  Calendar,
  MapPin,
  Hash,
  Building2,
  Eye,
  Table,
  CookingPot,
  Bed,
  Toilet,
  Sun,
  type LucideIcon,
} from 'lucide-react';
import type { StockDeltaReason } from '@/types/events';
import type { ResourceKind } from '@/types/entities';

export {
  Home,
  Archive,
  Package,
  CheckSquare,
  Square,
  Settings,
  Sailboat,
  ChefHat,
  ShoppingCart,
  ClipboardList,
  Wrench,
  BookOpen,
  Book,
  Droplet,
  Cookie,
  CakeSlice,
  Croissant,
  Search,
  Flame,
  AlertTriangle,
  ThumbsUp,
  Utensils,
  Salad,
  ScrollText,
  Inbox,
  Trash2,
  Pencil,
  Minus,
  X,
  RotateCcw,
  History,
  Fuel,
  Droplets,
  Gauge,
  Anchor,
  LifeBuoy,
  MessageSquarePlus,
  CheckCircle,
  Plus,
  ImagePlus,
  FileText,
  FilePlus,
  FileCheck,
  RefreshCw,
  FolderOpen,
  Calendar,
  MapPin,
  Hash,
  Building2,
  Eye,
  Table,
  CookingPot,
  Bed,
  Toilet,
  Sun,
};
export type { LucideIcon };

/** Icona per a la raó d'un moviment d'estoc (historial). */
export function reasonIcon(reason: StockDeltaReason): LucideIcon {
  switch (reason) {
    case 'cooking':
      return ChefHat;
    case 'purchase':
      return ShoppingCart;
    case 'adjustment':
      return Wrench;
  }
}

/** Icona orientativa per a cada opció del menú de cuina. */
export type CookMode = 'recipe' | 'drink' | 'snacks' | 'dessert' | 'breakfast' | 'all';

export function cookModeIcon(mode: CookMode): LucideIcon {
  switch (mode) {
    case 'recipe':
      return BookOpen;
    case 'drink':
      return Droplet;
    case 'snacks':
      return Cookie;
    case 'dessert':
      return CakeSlice;
    case 'breakfast':
      return Croissant;
    case 'all':
      return Search;
  }
}

/** Icona per a cada recurs continu (gasoil, aigua de tancs, gas). */
export function resourceIcon(kind: ResourceKind): LucideIcon {
  switch (kind) {
    case 'fuel':
      return Fuel;
    case 'water':
      return Droplets;
    case 'gas':
      return Flame;
  }
}

/** Icona per a cada tipus d'event d'avaria a l'historial. */
export function faultEventIcon(
  type: 'report' | 'update' | 'resolve' | 'reopen',
): LucideIcon {
  switch (type) {
    case 'report':
      return AlertTriangle;
    case 'update':
      return MessageSquarePlus;
    case 'resolve':
      return CheckCircle;
    case 'reopen':
      return RotateCcw;
  }
}

/** Icona per a cada tipus d'event de document a l'historial. */
export function documentEventIcon(
  type:
    | 'create'
    | 'edit'
    | 'renew'
    | 'comment'
    | 'comment_delete'
    | 'delete'
    | 'restore',
): LucideIcon {
  switch (type) {
    case 'create':
      return FilePlus;
    case 'edit':
      return Pencil;
    case 'renew':
      return RefreshCw;
    case 'comment':
      return MessageSquarePlus;
    case 'comment_delete':
      return X;
    case 'delete':
      return Trash2;
    case 'restore':
      return RotateCcw;
  }
}

/** Icona per a cada tipus d'event de la llista de la compra a l'historial. */
export function shoppingEventIcon(
  kind: 'add' | 'bought' | 'remove',
): LucideIcon {
  switch (kind) {
    case 'add':
      return Plus;
    case 'bought':
      return CheckCircle;
    case 'remove':
      return Trash2;
  }
}
