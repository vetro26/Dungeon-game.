/* ============================================================ */
/* SECTION 01 - ITEM DEFINITIONS                                */
/* Add new modular items here.                                  */
/* Each item can define chest appearance and onUse behavior.    */
/* ============================================================ */
const ITEM_DEFINITIONS = {
  smallHealthPotion: {
    id: "smallHealthPotion",
    name: "Small Health Potion",
    description: "Restores 20 health.",
    canAppearInChests: true,
    onUse(player) {
      player.health += 20;
      return "You used a Small Health Potion and gained 20 health.";
    }
  },

  largeHealthPotion: {
    id: "largeHealthPotion",
    name: "Large Health Potion",
    description: "Restores 50 health.",
    canAppearInChests: true,
    onUse(player) {
      player.health += 50;
      return "You used a Large Health Potion and gained 50 health.";
    }
  },

  manaPotion: {
    id: "manaPotion",
    name: "Mana Potion",
    description: "Restores 30 mana.",
    canAppearInChests: true,
    onUse(player) {
      player.mana += 30;
      return "You used a Mana Potion and restored 30 mana.";
    }
  },

    tomeOfFrostLance: {
    id: "tomeOfFrostLance",
    name: "Tome of Frost Lance",
    description: "Teaches the Frost Lance spell when used.",
    canAppearInChests: true,
    teachesSpellId: "frostLance",
    onUse(player, item) {
      if (!item.teachesSpellId) {
        return "This tome does nothing.";
      }

      return addSpellToPlayer(player, item.teachesSpellId);
    }
  },

  tomeOfChainLightning: {
    id: "tomeOfChainLightning",
    name: "Tome of Chain Lightning",
    description: "Teaches the Chain Lightning spell when used.",
    canAppearInChests: true,
    teachesSpellId: "chainLightning",
    onUse(player, item) {
      if (!item.teachesSpellId) {
        return "This tome does nothing.";
      }

      return addSpellToPlayer(player, item.teachesSpellId);
    }
  },

  tomeOfPoisonCloud: {
    id: "tomeOfPoisonCloud",
    name: "Tome of Poison Cloud",
    description: "Teaches the Poison Cloud spell when used.",
    canAppearInChests: true,
    teachesSpellId: "poisonCloud",
    onUse(player, item) {
      if (!item.teachesSpellId) {
        return "This tome does nothing.";
      }

      return addSpellToPlayer(player, item.teachesSpellId);
    }
  },

   manaRegenPotion: {
    id: "manaRegenPotion",
    name: "Mana Regen Potion",
    description: "Grants 10 mana per turn for 5 turns.",
    canAppearInChests: true,
    onUse(player) {
      return addBuffToPlayer(player, "manaRegen", { duration: 5 });
    }
  },

  largeManaRegenPotion: {
    id: "largeManaRegenPotion",
    name: "Large Mana Regen Potion",
    description: "Grants 15 mana per turn for 8 turns.",
    canAppearInChests: true,
    onUse(player) {
      return addBuffToPlayer(player, "largeManaRegen", { duration: 15 });
    }
  },

  tomeOfManaBolt: {
    id: "tomeOfManaBolt",
    name: "Tome of ManaBolt",
    description: "Teaches the Mana Bolt spell when used.",
    canAppearInChests: true,
    teachesSpellId: "manaBolt",
    onUse(player, item) {
      if (!item.teachesSpellId) {
        return "This tome does nothing.";
      }

      return addSpellToPlayer(player, item.teachesSpellId);
    }
  }
};

/* ============================================================ */
/* SECTION 02 - ITEM OWNERSHIP HELPERS                          */
/* Utility checks for player inventory state.                   */
/* ============================================================ */
function playerHasItem(player, itemId) {
  return player.items.some(item => item.id === itemId);
}

/* ============================================================ */
/* SECTION 03 - ITEM TYPE HELPERS                               */
/* Used to identify special items like spell tomes.             */
/* ============================================================ */
function itemIsSpellTome(itemDefinition) {
  return typeof itemDefinition.teachesSpellId === "string";
}

/* ============================================================ */
/* SECTION 04 - CHEST APPEARANCE RULES                          */
/* Controls whether a specific item can appear in a chest.      */
/* ============================================================ */
function canItemAppearInChest(itemDefinition, player) {
  if (!itemDefinition.canAppearInChests) {
    return false;
  }

  if (itemIsSpellTome(itemDefinition)) {
    const alreadyKnowsSpell = playerHasSpell(player, itemDefinition.teachesSpellId);
    const alreadyHasTome = playerHasItem(player, itemDefinition.id);

    if (alreadyKnowsSpell || alreadyHasTome) {
      return false;
    }
  }

  return true;
}

/* ============================================================ */
/* SECTION 05 - CHEST ITEM POOL                                 */
/* Returns all valid items that can currently appear in chests. */
/* ============================================================ */
function getChestItemPool(player) {
  return Object.values(ITEM_DEFINITIONS).filter(itemDefinition =>
    canItemAppearInChest(itemDefinition, player)
  );
}

/* ============================================================ */
/* SECTION 06 - ITEM INSTANCE CREATION                          */
/* Converts item definitions into actual inventory objects.     */
/* ============================================================ */
function createItemInstance(itemId) {
  const definition = ITEM_DEFINITIONS[itemId];
  if (!definition) return null;

  return {
    id: definition.id,
    name: definition.name,
    description: definition.description,
    teachesSpellId: definition.teachesSpellId || null
  };
}

/* ============================================================ */
/* SECTION 07 - RANDOM CHEST LOOT GENERATION                    */
/* Each chest gets 1 to 2 unique items.                         */
/* ============================================================ */
function generateChestLoot(player) {
  const loot = [];
  const itemCount = Math.floor(Math.random() * 2) + 1;

  for (let i = 0; i < itemCount; i++) {
    const validPool = getChestItemPool(player).filter(itemDefinition => {
      const alreadyInThisChest = loot.some(item => item.id === itemDefinition.id);
      return !alreadyInThisChest;
    });

    if (validPool.length === 0) {
      break;
    }

    const randomItem = validPool[Math.floor(Math.random() * validPool.length)];
    const instance = createItemInstance(randomItem.id);

    if (instance) {
      loot.push(instance);
    }
  }

  return loot;
}

/* ============================================================ */
/* SECTION 08 - ITEM USE LOGIC                                  */
/* Resolves the effect of using an item by its id.              */
/* ============================================================ */
function useItemById(itemId, player, itemInstance = null) {
  const definition = ITEM_DEFINITIONS[itemId];

  if (!definition || typeof definition.onUse !== "function") {
    return "That item cannot be used.";
  }

  return definition.onUse(player, itemInstance);
}