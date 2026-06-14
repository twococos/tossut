# CONTEXT.md — boat-stock-manager

> **Per a l'agent que llegeix això:** aquest fitxer és el teu briefing complet per
> començar a treballar en aquest projecte sense context previ. Llegeix-lo sencer abans
> de fer res. L'usuari te'l donarà a cada conversa nova. Hi ha un document de disseny
> més extens a [PLA.md](PLA.md) si necessites detalls fins al gra.
>
> **Idioma:** parla SEMPRE en **català** amb l'usuari. El codi font (noms de variables,
> tipus, funcions) en anglès; els comentaris i el text d'UI, en català.

---

## 1. Propòsit

PWA per gestionar l'estiva i les provisions d'un **veler de 10 m**. La fa servir el
propietari + convidats rotatius (màx. 4-5 usuaris, volum de dades petit). **Crew-only,
NO es publica a stores**, s'instal·la des d'una URL (Android + iPhone).

Dos objectius:
1. **Trobar les coses** — molts compartiments en llocs estranys; cada objecte té
   ubicació etiquetada.
2. **Gestionar el menjar (el més usat)** — existències, caducitats, receptes.

**Requisit no negociable: offline total.** El vaixell passa dies sense cobertura.
Tot funciona offline i sincronitza quan torna la connexió; diverses persones poden
treballar offline alhora.

---

## 2. Stack (tancat — no canviar sense acord explícit)

| Capa | Tecnologia |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| PWA | vite-plugin-pwa (Workbox), precache de l'app shell |
| Estils | Tailwind CSS (mobile-first, botons grans) |
| BD local | Dexie.js (IndexedDB) |
| Núvol | Supabase (Postgres + Auth + Storage), free tier |
| Routing | react-router-dom amb **HashRouter** (per a hosting estàtic) |
| Hosting | Cloudflare Pages (principal) / GitHub Pages (alternativa) |
| Tests | Vitest (només el domini pur) |

**Entorn:** Windows, PowerShell. Node 20. Comandes: `npm run dev`, `npm test`,
`npm run build`, `npm run typecheck`.

---

## 3. L'arquitectura central — LLEGEIX AIXÒ ABANS DE TOCAR LÒGICA D'ESTOC

**Event sourcing.** Tot canvi és un **esdeveniment append-only** (`AppEvent`). L'event
log és l'ÚNICA font de veritat. L'inventari i les taules de definició es **deriven**
reproduint el log. Res guarda "l'estoc actual" de forma autoritzada.

### La regla d'or (criteri d'acceptació, té tests)
L'estoc **MAI és negatiu**. La saturació a 0 s'aplica **a cada pas, en ordre
cronològic** (un *fold*), NO sumant tots els deltes i saturant al final.

```
Esdeveniments: +2, −3, −1, +1
✗ SUM-i-saturar → 0   (perd la compra final!)
✓ Fold per pas  → 2 → 0 → 0 → 1
```

Cas canònic: 2 ous; offline A gasta −3 i B gasta −1 → 0; després +1 → **1** (el dèficit
NO s'arrossega). Implementat a [src/domain/inventory/derive.ts](src/domain/inventory/derive.ts).
Si modifiques aquesta lògica, **els tests de `derive.test.ts` han de seguir passant**.

### Ordre determinista
Clau: `(occurredAt, deviceId, seq)`. Idèntic a tots els dispositius → tots deriven el
mateix. `seq` = comptador monòton per dispositiu (robust al clock skew). `id` = UUID v7.
Veure [src/domain/inventory/ordering.ts](src/domain/inventory/ordering.ts).

### Per què no hi ha conflictes de sync
Esdeveniments immutables + additius + fold determinista i saturant = un únic resultat per
a qualsevol intercalat. **No hi ha UI de resolució de conflictes** (i no se n'ha
d'afegir).

### Recompute-from-scratch
Després de cada escriptura local i de cada pull, es recalcula TOT el derivat des de zero
([src/db/recompute.ts](src/db/recompute.ts)). El volum és minúscul; no hi ha snapshots
(deliberadament).

### Barrera de tall (rebobinar / reiniciar estoc)
L'event `stock_barrier` (mode `rewind`/`reset`) fa que la derivació **ignori** certs
`stock_delta` d'un costat del tall sense trencar la correcció (és determinista: tots els
dispositius deriven igual). Val l'última barrera per ordre `(occurredAt, deviceId, seq)`.
**Només afecta l'estoc** — objectes/llocs/receptes/checklists es conserven sempre. El reset,
a més, fa neteja física (local + RPC `reset_stock_events` al servidor) i es protegeix del cas
multi-dispositiu offline amb tres capes (check-abans-push, cascada-al-pull, barrera persistent).
Lògica a [src/domain/inventory/barrier.ts](src/domain/inventory/barrier.ts) i `derive.ts`.

---

## 4. Model de dades

**Entitats** ([src/types/entities.ts](src/types/entities.ts)):
- `StowageLocation` — lloc d'estiva (nom, descripció, foto, parentId opcional).
- `ItemObject` — definició d'objecte: `stockType` (food/consumable/tools/other),
  `quantityType` (units/kg/L), `usualLocationIds` (informatiu, l'estoc NO és per lloc),
  `foodCategory` (només menjar), `expiry` (ExpiryPolicy: never / days_from_purchase /
  define_on_add), `trackDuration` (opt-in estimació durada).
- `Recipe` — `ingredients` PER PERSONA, prepTime?, needsCooking?, steps?.
- `ChecklistTemplate` — plantilla (SE SINCRONITZA). `ChecklistProgress` — progrés
  (LOCAL, mai se sincronitza).
- `InventoryEntry` — derivat: `quantity` (>=0) + `lots?` (ExpiryLot[], FIFO).

**Esdeveniments** ([src/types/events.ts](src/types/events.ts)) — unió discriminada
`AppEvent`:
- `stock_delta` (reason: cooking/purchase/adjustment, `lines: StockDeltaLine[]`,
  recipeId?, diners?). **Cuinar/comprar/ajustar són tots stock_delta.**
- `object_upsert` / `location_upsert` / `recipe_upsert` / `checklist_upsert` — porten
  snapshot complet (`payload`); last-writer-wins per ordre.

---

## 5. Acords amb l'usuari (decisions preses — respecta-les)

- **Tot per deltes** (event sourcing per a tot, inclosos els upserts de definició).
- **Estoc mai negatiu**, saturació a 0 per pas (regla d'or, §3).
- **Arrodoniment de receptes:** `units` → `Math.ceil` després de multiplicar; `kg`/`L`
  exactes. En un sol lloc: [src/domain/recipes/scaling.ts](src/domain/recipes/scaling.ts).
- **Cuinar amb estoc insuficient:** ingredients en vermell + alerta de confirmació; si
  es cuina, va a 0 (mai negatiu).
- **Ubicacions:** quantitat total única + llocs informatius (NO estoc per lloc).
- **Caducitat per LOTS FIFO** (un objecte pot tenir compres amb dates diferents).
  [src/domain/inventory/lots.ts](src/domain/inventory/lots.ts).
- **Auth:** contrasenya compartida del vaixell (un sol usuari Supabase) + nom lliure
  client-side (registra "qui"). No hi ha comptes individuals.
- **Estimació de durada:** generalitzada a qualsevol objecte amb `trackDuration`
  (finestra de 3 dies). [src/domain/inventory/duration.ts](src/domain/inventory/duration.ts).
- **Checklists:** plantilla sincronitza, progrés NO.
- **Fotos offline:** s'encuen ([src/sync/photoQueue.ts](src/sync/photoQueue.ts)) i es
  pugen en sincronitzar.
- **Diferit (NO implementat encara):** gasoil i aigua no potable dels tancs. Encaixen
  com a objectes `consumable` amb `trackDuration`; no cal canvi d'esquema.

---

## 6. Estructura de carpetes

```
src/
  types/         entities.ts, events.ts, index.ts  ← font de veritat dels tipus
  domain/        LÒGICA PURA (sense I/O), amb tests *.test.ts
    inventory/   derive, ordering, lots, duration, deriveDefinitions
    recipes/     scaling
    events/      factories
  db/            Dexie
    db.ts        esquema IndexedDB
    recompute.ts pipeline event log → caus derivades
    commands.ts  PORTA ÚNICA D'ESCRIPTURA per a la UI (commitStockDelta, commit*Upsert)
    backup.ts    export/import JSON del log
    seed.ts      dades inicials idempotents
    repositories/ events, meta (seq monòton), read, checklistProgress
  sync/          supabase.ts, syncEngine.ts, SyncProvider.tsx, mappers, photoQueue
  auth/          AuthProvider.tsx, LoginScreen.tsx, session.ts
  hooks/         useData (useLiveQuery), useDerived, useInstallPrompt
  routes/        Layout + pantalles (Home, CookMenu, PurchaseFlow, ObjectsList,
                 Recipes, LocationsList, LocationView, Checklists, History,
                 Expiring, Settings)
  features/      cook/, purchase/, objects/, recipes/, locations/ (components)
  components/ui/ Button, Sheet, SyncIndicator, common (EmptyState, NumberStepper, etc.)
  lib/           id (uuid v7), deviceId, time, format
supabase/        migrations/0001..0007 + README (instruccions de posada en marxa)
```

---

## 7. Patrons a seguir (perquè el codi nou s'assembli a l'existent)

- **Escriure dades:** SEMPRE via les funcions de [src/db/commands.ts](src/db/commands.ts)
  (`commitStockDelta`, `commitObjectUpsert`, …). Mai escriguis a Supabase directament ni
  toquis les caus derivades a mà — les genera `recomputeAll`. Cada comanda necessita el
  `userName` (de `useAuth()`).
- **Llegir dades:** hooks `useLiveQuery` de [src/hooks/useData.ts](src/hooks/useData.ts)
  (`useObjects`, `useInventory`, `useObjectsMap`, …) i derivats a `useDerived.ts`. Són
  reactius: la UI s'actualitza sola després d'un recompute.
- **Estat global:** només `AuthProvider` i `SyncProvider`. La resta és `useState` local.
  No afegeixis Redux/Zustand.
- **Lògica de negoci nova:** posa-la a `domain/` (pura, testejable) i crida-la des de la
  UI o les comandes. Afegeix tests si toca estoc/receptes/lots.
- **Components UI:** reutilitza `Button`, `Sheet`, `EmptyState`, `NumberStepper`,
  `TileButton`, `Card` abans de crear-ne de nous. Botons grans (classe `btn-touch`).
- **Text d'UI:** TOT el text visible viu a [src/text/ca.ts](src/text/ca.ts) (objecte niat
  `ca`). Als components: `import { t } from '@/text'` i usa `t.secció.clau` (accés niat,
  tipat). Text fix → string; amb variables/plural → funció `t.secció.clau(arg)`; etiquetes
  d'enums → mapes (`t.object.stockType[…]`). **No posis literals de text a la JSX** (ni
  `placeholder`/`aria-label`/`alt`): afegeix-los a `ca.ts`. Per a un altre idioma: duplica
  `ca.ts` i registra el diccionari a [src/text/index.ts](src/text/index.ts) (el tipus
  `Dict` força que tots els idiomes tinguin les mateixes claus).

---

## 8. Estat actual del projecte

**Completat i verificat** (les 16 fases del PLA.md): scaffold, tipus, domini + tests,
Dexie, auth, migracions Supabase, motor de sync, totes les pantalles, backup, polish PWA,
configs de desplegament. `tsc` net, **36 tests passen**, build de producció OK.

**Supabase OPERATIU:** el projecte al núvol està en marxa amb **totes les migracions
aplicades (0001..0007)**. La sincronització de punta a punta funciona; per connectar-hi cal
`.env.local` (no versionat) amb les credencials. Sense `.env.local` l'app segueix funcionant en
**"mode local"** offline (el login només demana el nom; les crides al núvol són no-op).

**Historial: rebobinar i reiniciar estoc** — implementat (veure §3 "Barrera de tall"). A
[src/routes/History.tsx](src/routes/History.tsx): clicar un moviment el desplega amb "Rebobinar
fins aquí"; botó "Esborrar tot l'historial" al final. Confirmació en dos passos amb
[src/components/ui/ConfirmAction.tsx](src/components/ui/ConfirmAction.tsx).

**Avaries (gestió d'avaries del vaixell)** — event sourcing pur, com tota la resta.
Events a [src/types/events.ts](src/types/events.ts): `fault_report` (títol, descripció,
`severity` groc/taronja/vermell; el `faultId` és l'id del propi report), `fault_update`
(follow-up lligat a `faultId`), `fault_resolve` (solucionar, surt de la llista), `fault_reopen`
(reobrir una avaria solucionada — torna a actives; reversible) i `fault_barrier` (reset de
l'historial, anàleg a `stock_barrier` mode 'reset' — només barrera, sense rewind). L'estat es
deriva a [src/domain/faults/deriveFaults.ts](src/domain/faults/deriveFaults.ts) (pur, amb tests)
→ cau Dexie `faults` (regenerada a cada `recomputeAll`). Commands a
[src/db/commands.ts](src/db/commands.ts) (`commitFaultReport/Update/Resolve/Reopen/Reset`); el
reset fa barrera + neteja física (local `purgeFaultsBeforeBarrier` + RPC `reset_fault_events`,
migracions [0008](supabase/migrations/0008_fault_reset.sql) i
[0010](supabase/migrations/0010_fault_reopen.sql) que hi afegeix `fault_reopen`), igual que el
reset d'estoc, amb neteja en cascada al `syncEngine`. UI: [src/routes/Faults.tsx](src/routes/Faults.tsx)
(llista d'actives ordenada per gravetat + reportar) i
[src/routes/FaultsHistory.tsx](src/routes/FaultsHistory.tsx) (**agrupat per avaria**: cada targeta
desplega la seva cronologia; les resoltes surten apagades amb badge i botó "Reobrir"; esborrar
historial); components a `src/features/faults/` (inclòs `FaultTimeline`). Mateix patró que
l'historial de documents (documents eliminats apagats + botó "Reinstaurar", event
`document_restore`).

**Dashboard configurable** — la portada ([src/routes/Home.tsx](src/routes/Home.tsx)) té cada
secció commutable des d'Ajustos: botó d'avaries (OFF per defecte), botó de documentació (OFF
per defecte), durada estimada (ON), recursos (OFF), caduca aviat (ON). Preferències **per
dispositiu** a [src/auth/session.ts](src/auth/session.ts) (localStorage) + hook reactiu
[src/hooks/useDashboardPrefs.ts](src/hooks/useDashboardPrefs.ts). El botó d'avaries porta un
badge amb el comptador d'actives tenyit amb el color de la més greu; el de documentació, un
badge ambre amb quants documents caduquen dins el llindar configurat.

**Documentació tècnica del veler** — event sourcing pur, modelat sobre les avaries però amb
**fitxer adjunt (PDF/imatge)**, **caducitat**, **versions** (renovació) i **comentaris lligats
a la versió vigent**. Events a [src/types/events.ts](src/types/events.ts): `document_create`
(títol, descripció, `category` enum fix, `data: DocVersionData`; el `docId` és l'id del propi
create), `document_edit` (canvia metadades de la versió vigent, NO crea versió), `document_renew`
(nova versió; l'antiga queda a l'historial), `document_comment` (text XOR foto, amb `versionSeq`),
`document_comment_delete` (oculta un comentari), `document_delete` i `document_barrier` (reset,
anàleg a `fault_barrier`). L'estat es deriva a
[src/domain/documents/deriveDocuments.ts](src/domain/documents/deriveDocuments.ts) (pur, amb
tests) → cau Dexie `documents` (v5, regenerada a `recomputeAll`). Commands a
[src/db/commands.ts](src/db/commands.ts) (`commitDocument*`); el reset fa barrera + neteja física
(local `purgeDocumentsBeforeBarrier` + RPC `reset_document_events`, migració
[0009](supabase/migrations/0009_document_reset.sql)) amb cascada al `syncEngine`, igual que el
reset d'avaries. **Llindar d'avís de caducitat** ("caduca en menys de X dies"): per dispositiu,
NO sincronitzat ([src/auth/session.ts](src/auth/session.ts) + hook
[src/hooks/useDocExpiryWarning.ts](src/hooks/useDocExpiryWarning.ts)). UI:
[src/routes/Documents.tsx](src/routes/Documents.tsx) (carpetes per categoria amb badge "caduquen
aviat" + cerca/ordenació + crear) i [src/routes/DocumentsHistory.tsx](src/routes/DocumentsHistory.tsx)
(historial general **agrupat per document**); components a `src/features/documents/`
(`DocumentCard` amb expandir/editar/renovar/comentaris/historial-per-document/eliminar,
formularis i visor de fitxer). **Cua de fitxers:** la de fotos
([src/sync/photoQueue.ts](src/sync/photoQueue.ts)) s'ha generalitzat (camps `mime`/`ext` a
`PendingPhoto`) per pujar PDF al mateix bucket `boat-photos` sense canvis a Supabase.

**Icones d'objecte (Iconify offline):** el selector d'icones d'un objecte (`IconPicker`)
mostra ~6.400 icones de línia (Tabler complet + un subconjunt curat de Game Icons), totes
**offline** (cap API). `ItemObject.icon` desa una clau Iconify (`tabler:apple`,
`game-icons:fish-cooked`). La càrrega és **lazy**: els JSON van en chunks separats que el
selector demana en obrir-se (el bundle inicial no en paga res) i Workbox els precacheja.
Lògica a [src/features/objects/iconSets.ts](src/features/objects/iconSets.ts) (càrrega,
cerca català/anglès, `LEGACY_ICON_MAP` per a claus antigues); render a
[src/components/ui/ObjectIcon.tsx](src/components/ui/ObjectIcon.tsx). El subconjunt de Game
Icons es regenera amb `node scripts/build-game-icons-subset.mjs`. Les icones de la UI fixa
(navegació, botons) segueixen sent lucide a [src/components/ui/icons.tsx](src/components/ui/icons.tsx).

**El que NO està fet / pendent natural:**
- Gasoil i aigua de tancs (diferit per acord).
- Icones PWA reals (ara hi ha placeholders blaus a `public/icons/`).
- Captura/visualització de fotos a la UI: la infraestructura hi és
  (`photoQueue`, camps `photoPath`, bucket), però els formularis encara no tenen el
  control per fer/penjar foto ni es mostren a la vista de lloc/objecte.

---

## 9. Com verificar abans de donar res per fet

```powershell
npx tsc -b --noEmit        # ha de dir res (sense errors)
npx vitest run             # tots els tests han de passar (124 actualment)
npm run build              # ha de generar dist/sw.js + manifest
```

Si toques el domini d'inventari, comprova especialment `derive.test.ts` (cas dels ous) i
`lots.test.ts` (FIFO). No introdueixis estoc negatiu ni resolució de conflictes.
