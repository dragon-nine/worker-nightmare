import {
  fetchMyAssets,
  fetchMyLoadouts,
  getStoredToken,
  syncMyAssets,
  syncMyLoadouts,
} from './api';
import { isAdRemoved } from './billing';
import { storage } from './storage';

function canSync(): boolean {
  return !!getStoredToken();
}

type AssetSnapshot = {
  asset_type: string;
  asset_id: string;
  quantity: number;
};

type LoadoutSnapshot = {
  slot_key: string;
  target_type: string;
  target_id: string;
};

type SyncRequest = {
  replaceAssetTypes?: string[];
  replaceLoadoutSlots?: string[];
};

const pendingAssetTypes = new Set<string>();
const pendingLoadoutSlots = new Set<string>();
let scheduledFlush: Promise<void> | null = null;

function buildAssetSnapshotForType(assetType: string): AssetSnapshot[] {
  switch (assetType) {
    case 'currency':
      return [
        { asset_type: 'currency', asset_id: 'coin', quantity: storage.getNum('coins') },
        { asset_type: 'currency', asset_id: 'gem', quantity: storage.getNum('gems') },
      ];
    case 'character':
      return storage.getOwnedCharacters().map((assetId) => ({
        asset_type: 'character',
        asset_id: assetId,
        quantity: 1,
      }));
    case 'entitlement':
      return [
        {
          asset_type: 'entitlement',
          asset_id: 'ad_remove',
          quantity: isAdRemoved() ? 1 : 0,
        },
      ];
    default:
      return [];
  }
}

function buildLoadoutSnapshotForSlot(slotKey: string): LoadoutSnapshot[] {
  switch (slotKey) {
    case 'active_character':
      return [{
        slot_key: 'active_character',
        target_type: 'character',
        target_id: storage.getSelectedCharacter(),
      }];
    default:
      return [];
  }
}

async function flushPendingSync(): Promise<void> {
  if (!canSync()) return;
  const replaceAssetTypes = [...pendingAssetTypes];
  const replaceLoadoutSlots = [...pendingLoadoutSlots];
  pendingAssetTypes.clear();
  pendingLoadoutSlots.clear();

  const assets = replaceAssetTypes.flatMap(buildAssetSnapshotForType);
  const loadouts = replaceLoadoutSlots.flatMap(buildLoadoutSnapshotForSlot);

  await Promise.all([
    replaceAssetTypes.length > 0
      ? syncMyAssets({ assets, replace_types: replaceAssetTypes })
      : Promise.resolve(),
    replaceLoadoutSlots.length > 0
      ? syncMyLoadouts({ loadouts, replace_slots: replaceLoadoutSlots })
      : Promise.resolve(),
  ]);
}

function queueSync(request: SyncRequest): Promise<void> {
  if (!canSync()) return Promise.resolve();
  request.replaceAssetTypes?.forEach((value) => pendingAssetTypes.add(value));
  request.replaceLoadoutSlots?.forEach((value) => pendingLoadoutSlots.add(value));

  if (!scheduledFlush) {
    scheduledFlush = Promise.resolve()
      .then(() => flushPendingSync())
      .catch((e) => {
        console.warn('[assets] sync failed:', e);
      })
      .finally(() => {
        scheduledFlush = null;
        if (pendingAssetTypes.size > 0 || pendingLoadoutSlots.size > 0) {
          void queueSync({});
        }
      });
  }

  return scheduledFlush;
}

export async function syncCurrenciesFromStorage(): Promise<void> {
  await queueSync({ replaceAssetTypes: ['currency'] });
}

export async function syncOwnedCharactersFromStorage(): Promise<void> {
  await queueSync({ replaceAssetTypes: ['character'] });
}

export async function syncSelectedCharacterFromStorage(): Promise<void> {
  await queueSync({ replaceLoadoutSlots: ['active_character'] });
}

export async function syncAdRemoveFromStorage(): Promise<void> {
  await queueSync({ replaceAssetTypes: ['entitlement'] });
}

export async function bootstrapLocalStateFromServerAssets(): Promise<void> {
  if (!canSync()) return;
  try {
    const [assets, loadouts] = await Promise.all([fetchMyAssets(), fetchMyLoadouts()]);

    const coin = assets.find((a) => a.asset_type === 'currency' && a.asset_id === 'coin');
    const gem = assets.find((a) => a.asset_type === 'currency' && a.asset_id === 'gem');
    if (coin) storage.setNum('coins', coin.quantity);
    if (gem) storage.setNum('gems', gem.quantity);

    const ownedCharacters = assets
      .filter((a) => a.asset_type === 'character' && a.quantity > 0)
      .map((a) => a.asset_id);
    if (ownedCharacters.length > 0) storage.setOwnedCharacters(ownedCharacters);

    const activeCharacter = loadouts.find((l) => l.slot_key === 'active_character' && l.target_type === 'character');
    if (activeCharacter) storage.setSelectedCharacter(activeCharacter.target_id);
  } catch (e) {
    console.warn('[assets] bootstrap failed:', e);
  }
}

export async function syncAllAssetsFromStorage(): Promise<void> {
  await queueSync({
    replaceAssetTypes: ['currency', 'character', 'entitlement'],
    replaceLoadoutSlots: ['active_character'],
  });
}
