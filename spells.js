/* ============================================================ */
/* SECTION 01 - SPELL DEFINITIONS                               */
/* Add new modular spells here.                                 */
/* Each spell can define targeting rules, cast behavior, and    */
/* a modular visual effect payload.                             */
/* ============================================================ */
const SPELL_DEFINITIONS = {
  manaBolt: {
    id: "manaBolt",
    name: "Mana Bolt",
    description: "Deals 100 damage to one enemy within 5 tiles.",
    manaCost: 10,
    range: 5,
    targetType: "enemy",
    highlightClass: "spell-target-mana-bolt",

    canTarget(caster, target, gameState) {
      if (!target || target.type !== "enemy" || !target.enemy) {
        return false;
      }

      return true;
    },

    onCast(caster, target, gameState) {
      if (!target || target.type !== "enemy" || !target.enemy) {
        return {
          message: "Mana Bolt fizzles.",
          effect: null
        };
      }

      const enemy = target.enemy;
      const damageResult = damageEnemy(enemy, 100, gameState.enemies);
      const message = damageResult.defeated
        ? `Mana Bolt hit ${enemy.name} for 100 damage and defeated it.`
        : `Mana Bolt hit ${enemy.name} for 100 damage.`;

      return {
        message,
        effect: {
          id: "manaBoltHit",
          targets: [
            { row: target.row, col: target.col }
          ]
        }
      };
    }
  },
  
  frostLance: {
    id: "frostLance",
    name: "Frost Lance",
    description: "Deals 40 damage to one enemy within 7 tiles.",
    manaCost: 8,
    range: 7,
    targetType: "enemy",
    highlightClass: "spell-target-frost-lance",

    canTarget(caster, target, gameState) {
      if (!target || target.type !== "enemy" || !target.enemy) {
        return false;
      }

      return true;
    },

    onCast(caster, target, gameState) {
      if (!target || target.type !== "enemy" || !target.enemy) {
        return {
          message: "Frost Lance fizzles.",
          effect: null
        };
      }

      const enemy = target.enemy;
      const damageResult = damageEnemy(enemy, 40, gameState.enemies);
      const message = damageResult.defeated
        ? `Frost Lance pierced ${enemy.name} for 40 damage and defeated it.`
        : `Frost Lance pierced ${enemy.name} for 40 damage.`;

      return {
        message,
        effect: {
          id: "frostLanceHit",
          targets: [
            { row: target.row, col: target.col }
          ]
        }
      };
    }
  },

  chainLightning: {
    id: "chainLightning",
    name: "Chain Lightning",
    description: "Deals 35 damage to the target enemy and up to 2 nearby enemies.",
    manaCost: 14,
    range: 6,
    targetType: "enemy",
    highlightClass: "spell-target-chain-lightning",

    canTarget(caster, target, gameState) {
      if (!target || target.type !== "enemy" || !target.enemy) {
        return false;
      }

      return true;
    },

    onCast(caster, target, gameState) {
      if (!target || target.type !== "enemy" || !target.enemy) {
        return {
          message: "Chain Lightning fizzles.",
          effect: null
        };
      }

      const primaryEnemy = target.enemy;

      const chainedEnemies = gameState.enemies
        .filter(enemy => enemy !== primaryEnemy)
        .filter(enemy => getSpellDistance(primaryEnemy.row, primaryEnemy.col, enemy.row, enemy.col) <= 2.5)
        .sort((a, b) => {
          const aDistance = getSpellDistance(primaryEnemy.row, primaryEnemy.col, a.row, a.col);
          const bDistance = getSpellDistance(primaryEnemy.row, primaryEnemy.col, b.row, b.col);
          return aDistance - bDistance;
        })
        .slice(0, 2);

      const struckEnemies = [primaryEnemy, ...chainedEnemies];
      let defeatedCount = 0;

      for (const enemy of [...struckEnemies]) {
        const damageResult = damageEnemy(enemy, 35, gameState.enemies);
        if (damageResult.defeated) {
          defeatedCount += 1;
        }
      }

      let message = `Chain Lightning struck ${struckEnemies.length} enemy for 35 damage.`;

      if (struckEnemies.length > 1) {
        message = `Chain Lightning struck ${struckEnemies.length} enemies for 35 damage.`;
      }

      if (defeatedCount > 0) {
        message += ` It defeated ${defeatedCount}.`;
      }

      return {
        message,
        effect: {
          id: "chainLightningArc",
          targets: struckEnemies.map(enemy => ({
            row: enemy.row,
            col: enemy.col
          }))
        }
      };
    }
  },

  poisonCloud: {
    id: "poisonCloud",
    name: "Poison Cloud",
    description: "Deals 25 damage to all enemies within 2 tiles of the target point.",
    manaCost: 9,
    range: 6,
    radius: 2,
    targetType: "tile",
    highlightClass: "spell-target-poison-cloud",

    canTarget(caster, target, gameState) {
      if (!target) return false;
      if (typeof target.row !== "number" || typeof target.col !== "number") {
        return false;
      }

      return true;
    },

    onCast(caster, target, gameState) {
      if (!target || typeof target.row !== "number" || typeof target.col !== "number") {
        return {
          message: "Poison Cloud fizzles.",
          effect: null
        };
      }

      const affectedEnemies = gameState.enemies.filter(enemy => {
        const distance = getSpellDistance(target.row, target.col, enemy.row, enemy.col);
        return distance <= 2;
      });

      let defeatedCount = 0;

      for (const enemy of [...affectedEnemies]) {
        const damageResult = damageEnemy(enemy, 25, gameState.enemies);
        if (damageResult.defeated) {
          defeatedCount += 1;
        }
      }

      let message = "Poison Cloud spreads, but hits nothing.";

      if (affectedEnemies.length === 1) {
        const enemyName = affectedEnemies[0].name;
        message = defeatedCount === 1
          ? `Poison Cloud engulfed ${enemyName} for 25 damage and defeated it.`
          : `Poison Cloud engulfed ${enemyName} for 25 damage.`;
      } else if (affectedEnemies.length > 1) {
        message = defeatedCount > 0
          ? `Poison Cloud hit ${affectedEnemies.length} enemies for 25 damage and defeated ${defeatedCount} of them.`
          : `Poison Cloud hit ${affectedEnemies.length} enemies for 25 damage.`;
      }

      return {
        message,
        effect: {
          id: "poisonCloudBurst",
          center: { row: target.row, col: target.col },
          targets: affectedEnemies.map(enemy => ({ row: enemy.row, col: enemy.col })),
          radius: 2
        }
      };
    }
  },

  fireball: {
    id: "fireball",
    name: "Fireball",
    description: "Deals 20 damage to all enemies within 3 tiles of the target point.",
    manaCost: 10,
    range: 10,
    radius: 3,
    targetType: "tile",
    highlightClass: "spell-target-fireball",

    canTarget(caster, target, gameState) {
      if (!target) return false;
      if (typeof target.row !== "number" || typeof target.col !== "number") {
        return false;
      }

      return true;
    },

    onCast(caster, target, gameState) {
      if (!target || typeof target.row !== "number" || typeof target.col !== "number") {
        return {
          message: "Fireball fizzles.",
          effect: null
        };
      }

      const affectedEnemies = gameState.enemies.filter(enemy => {
        const distance = getSpellDistance(target.row, target.col, enemy.row, enemy.col);
        return distance <= 3;
      });

      let message = "Fireball explodes, but hits nothing.";
      let defeatedCount = 0;

      for (const enemy of [...affectedEnemies]) {
        const damageResult = damageEnemy(enemy, 20, gameState.enemies);
        if (damageResult.defeated) {
          defeatedCount += 1;
        }
      }

      if (affectedEnemies.length === 1) {
        const enemyName = affectedEnemies[0].name;
        message = defeatedCount === 1
          ? `Fireball hit ${enemyName} for 20 damage and defeated it.`
          : `Fireball hit ${enemyName} for 20 damage.`;
      } else if (affectedEnemies.length > 1) {
        message = defeatedCount > 0
          ? `Fireball hit ${affectedEnemies.length} enemies for 20 damage and defeated ${defeatedCount} of them.`
          : `Fireball hit ${affectedEnemies.length} enemies for 20 damage.`;
      }

      return {
        message,
        effect: {
          id: "fireballExplosion",
          center: { row: target.row, col: target.col },
          targets: affectedEnemies.map(enemy => ({ row: enemy.row, col: enemy.col })),
          radius: 3
        }
      };
    }
  }
};

/* ============================================================ */
/* SECTION 02 - SPELL LOOKUP HELPERS                            */
/* Used to safely retrieve spell definitions.                   */
/* ============================================================ */
function getSpellById(spellId) {
  return SPELL_DEFINITIONS[spellId] || null;
}

/* ============================================================ */
/* SECTION 03 - PLAYER SPELL CHECKS                             */
/* Utility to see whether the player already knows a spell.     */
/* ============================================================ */
function playerHasSpell(player, spellId) {
  return player.spells.some(spell => spell.id === spellId);
}

/* ============================================================ */
/* SECTION 04 - SPELL INSTANCE CREATION                         */
/* Converts a spell definition into a player-owned spell object. */
/* ============================================================ */
function createSpellInstance(spellId) {
  const definition = getSpellById(spellId);
  if (!definition) return null;

  return {
    id: definition.id,
    name: definition.name,
    description: definition.description,
    manaCost: definition.manaCost,
    range: definition.range,
    radius: definition.radius || 0,
    targetType: definition.targetType,
    highlightClass: definition.highlightClass || ""
  };
}

/* ============================================================ */
/* SECTION 05 - LEARNING SPELLS                                 */
/* Adds a spell to the player if it exists and is not known.    */
/* ============================================================ */
function addSpellToPlayer(player, spellId) {
  const definition = getSpellById(spellId);
  if (!definition) {
    return "That spell does not exist.";
  }

  if (playerHasSpell(player, spellId)) {
    return `You already know ${definition.name}.`;
  }

  const spell = createSpellInstance(spellId);
  if (!spell) {
    return "That spell could not be learned.";
  }

  player.spells.push(spell);
  return `You learned ${spell.name}.`;
}

/* ============================================================ */
/* SECTION 06 - SPELL TARGET HELPERS                            */
/* Shared modular helpers for range and target validation.      */
/* ============================================================ */
function getSpellRange(spellId) {
  const definition = getSpellById(spellId);
  if (!definition || typeof definition.range !== "number") {
    return 0;
  }

  return definition.range;
}

function getSpellDistance(fromRow, fromCol, toRow, toCol) {
  return Math.sqrt(
    (toRow - fromRow) * (toRow - fromRow) +
    (toCol - fromCol) * (toCol - fromCol)
  );
}

function isTargetInSpellRange(spellId, caster, row, col) {
  const range = getSpellRange(spellId);
  const distance = getSpellDistance(caster.row, caster.col, row, col);
  return distance <= range;
}

function canSpellTarget(spellId, caster, target, gameState) {
  const definition = getSpellById(spellId);

  if (!definition) return false;
  if (!target) return false;
  if (!isTargetInSpellRange(spellId, caster, target.row, target.col)) return false;

  if (typeof definition.canTarget === "function") {
    return definition.canTarget(caster, target, gameState);
  }

  return true;
}

/* ============================================================ */
/* SECTION 07 - SPELL RESULT NORMALIZATION                      */
/* Keeps spell casting modular and backward compatible.         */
/* ============================================================ */
function normalizeSpellCastResult(result) {
  if (typeof result === "string") {
    return {
      message: result,
      effect: null
    };
  }

  if (!result || typeof result !== "object") {
    return {
      message: "The spell has no effect.",
      effect: null
    };
  }

  return {
    message: typeof result.message === "string" ? result.message : "The spell has no effect.",
    effect: result.effect || null
  };
}

/* ============================================================ */
/* SECTION 08 - CASTING SPELLS                                  */
/* Validates spell use, checks mana, spends mana, and resolves. */
/* ============================================================ */
function castSpellById(spellId, player, target, gameState) {
  const definition = getSpellById(spellId);

  if (!definition || typeof definition.onCast !== "function") {
    return {
      message: "That spell cannot be cast.",
      effect: null
    };
  }

  if (!playerHasSpell(player, spellId)) {
    return {
      message: "You do not know that spell.",
      effect: null
    };
  }

  if (!canSpellTarget(spellId, player, target, gameState)) {
    return {
      message: "That target is not valid for this spell.",
      effect: null
    };
  }

  if (typeof definition.manaCost === "number" && player.mana < definition.manaCost) {
    return {
      message: `Not enough mana to cast ${definition.name}.`,
      effect: null
    };
  }

  if (typeof definition.manaCost === "number") {
    player.mana -= definition.manaCost;
  }

  return normalizeSpellCastResult(definition.onCast(player, target, gameState));
}