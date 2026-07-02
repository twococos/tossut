/**
 * Sessió local lleugera.
 *
 * El model d'accés és: contrasenya compartida del vaixell (autentica "tripulant" via
 * Supabase) + nom lliure (registra "qui" fa cada acció). El nom visible és només del
 * client i es desa aquí; s'estampa a `userName` de cada esdeveniment. Es pot canviar
 * sense tornar a autenticar (convidats rotatius al mateix mòbil). Veure PLA.md
 * (seccions 7 i 12).
 */
const NAME_KEY = 'boat-stock-manager.userName';
const DINERS_KEY = 'boat-stock-manager.defaultDiners';
const EDIT_LOCKED_KEY = 'boat-stock-manager.editLocked';
const DURATION_WINDOW_KEY = 'boat-stock-manager.durationWindowDays';
const SHOW_FAULTS_BUTTON_KEY = 'boat-stock-manager.showFaultsButton';
const SHOW_DOCUMENTS_BUTTON_KEY = 'boat-stock-manager.showDocumentsButton';
const SHOW_DURATION_KEY = 'boat-stock-manager.showDurationSection';
const SHOW_RESOURCES_KEY = 'boat-stock-manager.showResourcesSection';
const SHOW_EXPIRING_KEY = 'boat-stock-manager.showExpiringSection';
const DOC_EXPIRY_WARNING_KEY = 'boat-stock-manager.docExpiryWarningDays';
const OBJECT_SORT_KEY = 'boat-stock-manager.objectSort';

export function getUserName(): string | null {
  return localStorage.getItem(NAME_KEY);
}

export function setUserName(name: string): void {
  localStorage.setItem(NAME_KEY, name.trim());
}

export function clearUserName(): void {
  localStorage.removeItem(NAME_KEY);
}

/** Comensals per defecte (gent a bord ara) per preomplir "cuinar per N". */
export function getDefaultDiners(): number {
  const v = localStorage.getItem(DINERS_KEY);
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 2;
}

export function setDefaultDiners(n: number): void {
  localStorage.setItem(DINERS_KEY, String(Math.max(1, Math.round(n))));
}

/**
 * Mode "bloquejar edició": quan és actiu, s'amaguen els botons d'afegir/editar/
 * eliminar definicions (objectes, llocs, receptes, checklists) per evitar canvis
 * accidentals. Comprar, cuinar, ajustar estoc i el progrés de checklists segueixen
 * disponibles. Per defecte ESTÀ ACTIU (true) si no s'ha desat mai.
 */
export function getEditLocked(): boolean {
  const v = localStorage.getItem(EDIT_LOCKED_KEY);
  return v === null ? true : v === '1';
}

export function setEditLocked(locked: boolean): void {
  localStorage.setItem(EDIT_LOCKED_KEY, locked ? '1' : '0');
  // Notifica els components reactius (mateixa pestanya; `storage` cobreix les altres).
  window.dispatchEvent(new CustomEvent('editlock-change'));
}

/**
 * Finestra (en dies) per estimar el ritme de consum al dashboard. Es pot ajustar a
 * Ajustos; per defecte 3 dies. S'aplica tant a l'aigua agregada com a la resta
 * d'objectes amb estimació de durada.
 */
export function getDurationWindowDays(): number {
  const v = localStorage.getItem(DURATION_WINDOW_KEY);
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 3;
}

export function setDurationWindowDays(days: number): void {
  localStorage.setItem(DURATION_WINDOW_KEY, String(Math.max(1, Math.round(days))));
  window.dispatchEvent(new CustomEvent('duration-window-change'));
}

/**
 * Preferències de visibilitat del dashboard (per dispositiu). Cada tripulant configura la
 * seva vista. Es desen a localStorage; en canviar-les es dispara `dashboard-prefs-change`
 * perquè la portada hi reaccioni a l'instant (l'event `storage` cobreix les altres pestanyes).
 */
function getFlag(key: string, fallback: boolean): boolean {
  const v = localStorage.getItem(key);
  return v === null ? fallback : v === '1';
}
function setFlag(key: string, value: boolean): void {
  localStorage.setItem(key, value ? '1' : '0');
  window.dispatchEvent(new CustomEvent('dashboard-prefs-change'));
}

/** Mostrar el botó d'avaries al dashboard. Per defecte NO. */
export const getShowFaultsButton = (): boolean => getFlag(SHOW_FAULTS_BUTTON_KEY, false);
export const setShowFaultsButton = (v: boolean): void => setFlag(SHOW_FAULTS_BUTTON_KEY, v);

/** Mostrar el botó de documentació al dashboard. Per defecte NO. */
export const getShowDocumentsButton = (): boolean =>
  getFlag(SHOW_DOCUMENTS_BUTTON_KEY, false);
export const setShowDocumentsButton = (v: boolean): void =>
  setFlag(SHOW_DOCUMENTS_BUTTON_KEY, v);

/** Mostrar la secció de durada estimada. Per defecte SÍ. */
export const getShowDurationSection = (): boolean => getFlag(SHOW_DURATION_KEY, true);
export const setShowDurationSection = (v: boolean): void => setFlag(SHOW_DURATION_KEY, v);

/** Mostrar la secció de recursos (gasoil, aigua, gas). Per defecte NO. */
export const getShowResourcesSection = (): boolean => getFlag(SHOW_RESOURCES_KEY, false);
export const setShowResourcesSection = (v: boolean): void => setFlag(SHOW_RESOURCES_KEY, v);

/** Mostrar la secció de productes que caduquen aviat. Per defecte SÍ. */
export const getShowExpiringSection = (): boolean => getFlag(SHOW_EXPIRING_KEY, true);
export const setShowExpiringSection = (v: boolean): void => setFlag(SHOW_EXPIRING_KEY, v);

/**
 * Llindar (en dies) per avisar que un document tècnic caduca aviat. Per dispositiu (NO se
 * sincronitza): cada tripulant tria el seu. Per defecte 30 dies. En canviar-lo es dispara
 * `doc-expiry-warning-change` perquè la portada i la pàgina de documents hi reaccionin.
 */
export function getDocExpiryWarningDays(): number {
  const v = localStorage.getItem(DOC_EXPIRY_WARNING_KEY);
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 30;
}

export function setDocExpiryWarningDays(days: number): void {
  localStorage.setItem(DOC_EXPIRY_WARNING_KEY, String(Math.max(1, Math.round(days))));
  window.dispatchEvent(new CustomEvent('doc-expiry-warning-change'));
}

/**
 * Criteri d'ordenació de la llista d'objectes (per dispositiu). Per defecte alfabètic.
 * En canviar-lo es dispara `object-sort-change` perquè la llista hi reaccioni.
 */
export type ObjectSort = 'alpha' | 'category' | 'recent' | 'stock';

export function getObjectSort(): ObjectSort {
  const v = localStorage.getItem(OBJECT_SORT_KEY);
  return v === 'category' || v === 'recent' || v === 'stock' ? v : 'alpha';
}

export function setObjectSort(sort: ObjectSort): void {
  localStorage.setItem(OBJECT_SORT_KEY, sort);
  window.dispatchEvent(new CustomEvent('object-sort-change'));
}
