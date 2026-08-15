import { GenericSystem } from './generic.js';
import { buildL5r5eRanges, buildL5r5eTokenRanges } from './l5r5e-range.js';

function rangeBands() {
  return game.l5r5e?.rangeBands ?? null;
}

function itemKey(item, index = 0) {
  return item?.uuid ?? item?.id ?? `${item?.type ?? 'item'}-${index}`;
}

function isHeldWeapon(item) {
  return item?.type === 'weapon' && Boolean(item.system?.equipped && item.system?.readied);
}

function tokenCombatant(token) {
  const direct = token?.document?.combatant ?? token?.combatant;
  if (direct) return direct;
  return Array.from(game.combat?.combatants ?? []).find(
    (combatant) =>
      combatant?.tokenId === token?.document?.id ||
      combatant?.token?.id === token?.document?.id ||
      combatant?.actorId === token?.actor?.id,
  );
}

function movementRemaining(token) {
  const fallback = 3;
  const turns = game.l5r5e?.turns;
  const combatant = tokenCombatant(token);
  if (!turns?.getState || !combatant) return fallback;

  try {
    const state = turns.getState(combatant);
    const fromGetters = turns.getters?.(state)?.movementRemaining;
    const budget = Number(state?.freeMovement?.budget);
    const spent = Number(state?.freeMovement?.spent);
    const value = Number.isFinite(Number(fromGetters))
      ? Number(fromGetters)
      : Number.isFinite(budget) && Number.isFinite(spent)
        ? Math.max(0, budget - spent)
        : fallback;
    return Math.max(0, value);
  } catch (error) {
    console.warn('Tactical Grid | Could not read the L5R5e movement budget; using 3 fields.', error);
    return fallback;
  }
}

export default class L5r5eSystem extends GenericSystem {
  static _rangesFor(source, id) {
    return buildL5r5eRanges(source, rangeBands(), {
      id,
      sceneDistance: canvas.scene?.grid?.distance ?? 1,
      gridless: canvas.grid?.type === CONST.GRID_TYPES.GRIDLESS,
    });
  }

  /** @override */
  static getTokenRange(token) {
    const weapons = Array.from(token?.actor?.items ?? []).filter(isHeldWeapon);
    return buildL5r5eTokenRanges(weapons, {
      movement: movementRemaining(token),
      sceneDistance: canvas.scene?.grid?.distance ?? 1,
      gridless: canvas.grid?.type === CONST.GRID_TYPES.GRIDLESS,
    });
  }

  /** @override */
  static getItemRange(item) {
    if (!item || !['weapon', 'technique'].includes(item.type)) return [];
    return this._rangesFor(item, itemKey(item));
  }

  /** @override */
  static onInit() {
    super.onInit();
    this._registerActorSheetListeners();
  }

  static _registerActorSheetListeners() {
    const bind = (actorSheet, element) => {
      $(element)
        .off('.l5r5eTacticalGrid')
        .on('mouseenter.l5r5eTacticalGrid', '[data-item-id]', (event) => {
          const itemId = $(event.currentTarget).closest('[data-item-id]').data('itemId');
          this.hoverItem({ itemId, actorSheet });
        })
        .on('mouseleave.l5r5eTacticalGrid', '[data-item-id]', () => this.hoverLeaveItem({ actorSheet }));
    };

    Hooks.on('renderActorSheet', bind);
    Hooks.on('renderActorSheetV2', bind);
  }

  /** @override */
  static getItemFromMacro(macro, actor) {
    const command = String(macro?.command ?? '');
    const uuid = command.match(/Hotbar\.toggleDocumentSheet\(["']([^"']+)["']\)/)?.[1];
    if (uuid) {
      const document = globalThis.fromUuidSync?.(uuid);
      if (document?.type === 'weapon' || document?.type === 'technique') return document;
      const id = uuid.split('.').at(-1);
      return actor?.items?.get?.(id) ?? Array.from(actor?.items ?? []).find((item) => item.id === id);
    }

    const itemId = macro?.getFlag?.('l5r5e', 'itemId');
    return itemId ? actor?.items?.get?.(itemId) : null;
  }
}
