/* ============================================================ */
/* SECTION 01 - BUFF DEFINITIONS                                */
/* Add new modular buffs here later.                            */
/* Each buff can define a name, description, duration, and      */
/* optional hooks for future gameplay effects.                  */
/* ============================================================ */
const BUFF_DEFINITIONS = {
 manaRegen: {
  id: "manaRegen",
  name: "Mana Regeneration",
  description: "Gain 2 mana per turn.",
  defaultDuration: 5,
  isStackable: false,

  onTurn: function(player, buff) {
    player.mana += 10;
  }
},

  largeManaRegen: {
    id: "largeManaRegen",
    name: "Large Mana Regeneration",
    description: "Gain 5 mana per turn.",
    defaultDuration: 8,
    isStackable: false,

    onTurn: function(player, buff) {
      player.mana += 15;
    }
  },
};

/* ============================================================ */
/* SECTION 02 - BUFF LOOKUP HELPERS                             */
/* Safely gets a buff definition by id.                         */
/* ============================================================ */
function getBuffById(buffId) {
  return BUFF_DEFINITIONS[buffId] || null;
}

/* ============================================================ */
/* SECTION 03 - BUFF INSTANCE CREATION                          */
/* Converts a buff definition into a player-owned buff object.  */
/* ============================================================ */
function createBuffInstance(buffId, overrides = {}) {
  const definition = getBuffById(buffId);
  if (!definition) return null;

  return {
    id: definition.id,
    name: definition.name,
    description: definition.description || "",
    duration:
      typeof overrides.duration === "number"
        ? overrides.duration
        : (typeof definition.defaultDuration === "number" ? definition.defaultDuration : null),
    stacks:
      typeof overrides.stacks === "number"
        ? overrides.stacks
        : 1
  };
}

/* ============================================================ */
/* SECTION 04 - PLAYER BUFF HELPERS                             */
/* Utility checks for player buff state.                        */
/* ============================================================ */
function playerHasBuff(player, buffId) {
  return player.buffs.some(buff => buff.id === buffId);
}

function getPlayerBuff(buffId, player) {
  return player.buffs.find(buff => buff.id === buffId) || null;
}

/* ============================================================ */
/* SECTION 05 - BUFF MANAGEMENT                                 */
/* Adds, removes, and updates player buffs.                     */
/* ============================================================ */
function addBuffToPlayer(player, buffId, overrides = {}) {
  const definition = getBuffById(buffId);
  if (!definition) {
    return "That buff does not exist.";
  }

  const existingBuff = getPlayerBuff(buffId, player);
  const isStackable = Boolean(definition.isStackable);

  if (existingBuff && !isStackable) {
    if (typeof overrides.duration === "number") {
      existingBuff.duration = overrides.duration;
    } else if (typeof definition.defaultDuration === "number") {
      existingBuff.duration = definition.defaultDuration;
    }

    return `${definition.name} was refreshed.`;
  }

  if (existingBuff && isStackable) {
    existingBuff.stacks += typeof overrides.stacks === "number" ? overrides.stacks : 1;

    if (typeof overrides.duration === "number") {
      existingBuff.duration = overrides.duration;
    }

    return `${definition.name} gained a stack.`;
  }

  const buffInstance = createBuffInstance(buffId, overrides);
  if (!buffInstance) {
    return "That buff could not be added.";
  }

  player.buffs.push(buffInstance);
  return `${buffInstance.name} was added.`;
}

function removeBuffFromPlayer(player, buffId) {
  const index = player.buffs.findIndex(buff => buff.id === buffId);
  if (index === -1) {
    return false;
  }

  player.buffs.splice(index, 1);
  return true;
}

function clearExpiredBuffs(player) {
  player.buffs = player.buffs.filter(buff => {
    return buff.duration === null || buff.duration > 0;
  });
}

function tickBuffDurations(player) {
  for (const buff of player.buffs) {

    // Apply per-turn effect
    const definition = getBuffById(buff.id);
    if (definition && typeof definition.onTurn === "function") {
      definition.onTurn(player, buff);
    }

    // Reduce duration
    if (typeof buff.duration === "number" && buff.duration > 0) {
      buff.duration -= 1;
    }
  }

  clearExpiredBuffs(player);
}

/* ============================================================ */
/* SECTION 06 - BUFF PANEL RENDERING                            */
/* Dedicated renderer for the Character Panel Buffs section.    */
/* ============================================================ */
function renderBuffsList(container, data) {
  if (!container) return;

  container.innerHTML = "";

  if (!Array.isArray(data) || data.length === 0) {
    const emptyEntry = document.createElement("div");
    emptyEntry.className = "empty-entry";
    emptyEntry.textContent = "";
    container.appendChild(emptyEntry);
    return;
  }

  const list = document.createElement("ul");
  list.className = "character-list";

  for (const buff of data) {
    const li = document.createElement("li");

    const buffName = buff && buff.name ? buff.name : "Unknown Buff";
    const hasStacks = typeof buff.stacks === "number" && buff.stacks > 1;
    const hasDuration = typeof buff.duration === "number";

    let label = buffName;

    if (hasStacks) {
      label += ` x${buff.stacks}`;
    }

    if (hasDuration) {
      label += ` (${buff.duration})`;
    }

    li.textContent = label;

    if (buff && buff.description) {
      li.title = buff.description;
    }

    list.appendChild(li);
  }

  container.appendChild(list);
}