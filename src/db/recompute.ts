import { db } from './db';
import { getAllEvents } from './repositories/events.repo';
import { deriveInventory } from '@/domain/inventory/derive';
import { deriveDefinitions } from '@/domain/inventory/deriveDefinitions';
import { deriveResourceConfig } from '@/domain/resources/deriveResourceConfig';
import { deriveResources } from '@/domain/resources/deriveResources';
import { deriveFaults } from '@/domain/faults/deriveFaults';
import { deriveShoppingList } from '@/domain/shopping/deriveShoppingList';
import { deriveDocuments } from '@/domain/documents/deriveDocuments';

/**
 * Recalcula tot l'estat derivat a partir del log d'esdeveniments i el desa a les caus
 * de Dexie (inventory + taules de definició).
 *
 * Estratègia: recompute-from-scratch (PLA.md secció 3.4). Amb el volum d'aquest
 * projecte (centenars/pocs milers d'esdeveniments) és submil·lisegon i fa que els
 * esdeveniments tardans i el reordenament siguin trivialment correctes.
 *
 * S'invoca: després de cada escriptura local d'esdeveniment i després de cada pull de
 * sincronització.
 */
export async function recomputeAll(): Promise<void> {
  const events = await getAllEvents();

  // 1) Derivar definicions primer (l'inventari les necessita per a la caducitat).
  const defs = deriveDefinitions(events);

  // 2) Derivar inventari amb les definicions d'objecte (per a la política de lots).
  const inventory = deriveInventory(events, defs.objects);

  // 3) Descartar l'inventari d'objectes ja eliminats: els seus stock_delta romanen al
  //    log però l'objecte ja no existeix com a definició, així que no ha de figurar a
  //    l'inventari derivat.
  for (const objectId of inventory.keys()) {
    if (!defs.objects.has(objectId)) inventory.delete(objectId);
  }

  // 4) Derivar els recursos continus (gasoil, aigua de tancs, gas) amb la seva config.
  const resourceConfigs = deriveResourceConfig(events);
  const resourceStates = deriveResources(events, resourceConfigs);

  // 5) Derivar les avaries (estat actiu/resolt + updates) a partir dels events fault_*.
  const faults = deriveFaults(events);

  // 6) Derivar la llista de la compra (quantitats agregades) dels events shopping_*.
  const shopping = deriveShoppingList(events);

  // 7) Derivar la documentació tècnica (versions + comentaris) dels events document_*.
  const documents = deriveDocuments(events);

  await db.transaction(
    'rw',
    [
      db.objects,
      db.locations,
      db.recipes,
      db.checklistTemplates,
      db.inventory,
      db.resourceConfigs,
      db.resourceStates,
      db.faults,
      db.shoppingItems,
      db.documents,
    ],
    async () => {
      // Reemplaçar completament les caus (recompute-from-scratch).
      await Promise.all([
        db.objects.clear(),
        db.locations.clear(),
        db.recipes.clear(),
        db.checklistTemplates.clear(),
        db.inventory.clear(),
        db.resourceConfigs.clear(),
        db.resourceStates.clear(),
        db.faults.clear(),
        db.shoppingItems.clear(),
        db.documents.clear(),
      ]);

      await Promise.all([
        db.objects.bulkPut([...defs.objects.values()]),
        db.locations.bulkPut([...defs.locations.values()]),
        db.recipes.bulkPut([...defs.recipes.values()]),
        db.checklistTemplates.bulkPut([...defs.checklistTemplates.values()]),
        db.inventory.bulkPut([...inventory.values()]),
        db.resourceConfigs.bulkPut([...resourceConfigs.values()]),
        db.resourceStates.bulkPut([...resourceStates.values()]),
        db.faults.bulkPut([...faults.values()]),
        db.shoppingItems.bulkPut([...shopping.values()]),
        db.documents.bulkPut([...documents.values()]),
      ]);
    },
  );
}
