/* ============================================================ */
/* SECTION 01 - ENEMY DEFINITIONS                               */
/* Add new modular enemies here.                                */
/* Each enemy can define spawn rules, batch counts, stats,      */
/* spawn behavior, and whether it blocks stair usage.           */
/* ============================================================ */
const ENEMY_DEFINITIONS = {
  testDummy: {
    id: "testDummy",
    name: "Test Dummy",
    description: "A harmless enemy that stands still.",
    symbol: "T",
    className: "enemy-test-dummy",
    maxHealth: 100,
    exemptFromStairsLock: true,
    exemptFromEnemyCap: true,
    aggroRange: 0,
    attackDamage: 0,

    shouldSpawnOnFloor() {
      return true;
    },

    getSpawnCount() {
      return 1;
    },

    getSpawnPosition({ rooms }) {
      if (!rooms || rooms.length === 0) return null;

      const startRoom = rooms[0];

      return {
        row: startRoom.y,
        col: startRoom.x
      };
    },

    onTurn(enemy, gameState) {
      /* Test Dummy does nothing. */
      return {
        moved: false,
        attacked: false,
        damageDealt: 0
      };
    }
  },

  goblin: {
    id: "goblin",
    name: "Goblin",
    description: "A small hostile dungeon creature.",
    symbol: "G",
    className: "enemy-goblin",
    maxHealth: 40,
    exemptFromStairsLock: false,
    exemptFromEnemyCap: false,
    aggroRange: 15,
    attackDamage: 10,

    shouldSpawnOnFloor({ floorLevel }) {
      return floorLevel >= 1 && floorLevel <= 3;
    },

    getSpawnCount() {
      return 5;
    },

    getSpawnPosition(gameState, alreadyPlacedEnemies) {
      return getRandomEnemySpawnPosition(gameState, alreadyPlacedEnemies);
    },

    onTurn(enemy, gameState) {
      const distanceToPlayer = getEnemyDistanceToPlayer(enemy, gameState.player);

      if (distanceToPlayer > this.aggroRange) {
        return {
          moved: false,
          attacked: false,
          damageDealt: 0
        };
      }

      /* -------------------------------------------------------- */
      /* Attack immediately if already adjacent at start of turn. */
      /* -------------------------------------------------------- */
      if (isEnemyAdjacentToPlayer(enemy, gameState.player)) {
        if (typeof gameState.damagePlayer === "function") {
          gameState.damagePlayer(this.attackDamage, enemy);
        }

        return {
          moved: false,
          attacked: true,
          damageDealt: this.attackDamage
        };
      }

      /* -------------------------------------------------------- */
      /* Otherwise move toward the player.                        */
      /* -------------------------------------------------------- */
      const moved = moveEnemyOneStepTowardPlayer(enemy, gameState);

      /* -------------------------------------------------------- */
      /* Important fix: if the goblin moved adjacent this turn,   */
      /* it should also attack on that same turn.                 */
      /* -------------------------------------------------------- */
      if (moved && isEnemyAdjacentToPlayer(enemy, gameState.player)) {
        if (typeof gameState.damagePlayer === "function") {
          gameState.damagePlayer(this.attackDamage, enemy);
        }

        return {
          moved: true,
          attacked: true,
          damageDealt: this.attackDamage
        };
      }

      return {
        moved,
        attacked: false,
        damageDealt: 0
      };
    }
  }
};

/* ============================================================ */
/* SECTION 02 - ENEMY LOOKUP HELPERS                            */
/* Safely gets an enemy definition from the registry.           */
/* ============================================================ */
function getEnemyDefinition(enemyId) {
  return ENEMY_DEFINITIONS[enemyId] || null;
}

/* ============================================================ */
/* SECTION 03 - ENEMY INSTANCE CREATION                         */
/* Converts a definition into a placed enemy object.            */
/* ============================================================ */
function createEnemyInstance(enemyId) {
  const definition = getEnemyDefinition(enemyId);
  if (!definition) return null;

  const maxHealth =
    typeof definition.maxHealth === "number" ? definition.maxHealth : 1;

  return {
    id: definition.id,
    name: definition.name,
    description: definition.description,
    symbol: definition.symbol || "E",
    className: definition.className || "",
    maxHealth,
    health: maxHealth,
    exemptFromStairsLock: Boolean(definition.exemptFromStairsLock),
    exemptFromEnemyCap: Boolean(definition.exemptFromEnemyCap),
    aggroRange: typeof definition.aggroRange === "number" ? definition.aggroRange : 0,
    attackDamage: typeof definition.attackDamage === "number" ? definition.attackDamage : 0
  };
}

/* ============================================================ */
/* SECTION 04 - ENEMY DAMAGE HELPERS                            */
/* Shared helpers for damaging and removing enemies.            */
/* ============================================================ */
function removeEnemyFromList(enemy, enemyList) {
  const index = enemyList.indexOf(enemy);
  if (index >= 0) {
    enemyList.splice(index, 1);
  }
}

function damageEnemy(enemy, amount, enemyList) {
  if (!enemy || typeof amount !== "number" || amount <= 0) {
    return {
      defeated: false,
      remainingHealth: enemy ? enemy.health : 0
    };
  }

  enemy.health -= amount;

  if (enemy.health <= 0) {
    enemy.health = 0;

    if (Array.isArray(enemyList)) {
      removeEnemyFromList(enemy, enemyList);
    }

    return {
      defeated: true,
      remainingHealth: 0
    };
  }

  return {
    defeated: false,
    remainingHealth: enemy.health
  };
}

/* ============================================================ */
/* SECTION 05 - ENEMY RULE HELPERS                              */
/* Used for stair locks, enemy caps, and spawn filtering.       */
/* ============================================================ */
function enemyCountsForStairsLock(enemy) {
  if (!enemy) return false;
  return !enemy.exemptFromStairsLock;
}

function enemyCountsTowardCap(enemy) {
  if (!enemy) return false;
  return !enemy.exemptFromEnemyCap;
}

/* ============================================================ */
/* SECTION 06 - ENEMY SPAWN HELPERS                             */
/* Random valid spawn lookup for modular enemy placement.       */
/* ============================================================ */
function isEnemySpawnTile(tileValue) {
  return (
    tileValue === 0 || // floor
    tileValue === 3 || // closed door
    tileValue === 4 || // open door
    tileValue === 5 || // chest closed
    tileValue === 6    // chest open
  );
}

function isOccupiedByPlacedEnemy(row, col, placedEnemies) {
  return placedEnemies.some(enemy => enemy.row === row && enemy.col === col);
}

function getRandomEnemySpawnPosition(gameState, alreadyPlacedEnemies = []) {
  const { rows, cols, map, player } = gameState;
  const validPositions = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!isEnemySpawnTile(map[r][c])) continue;
      if (player && r === player.row && c === player.col) continue;
      if (map[r][c] === 2) continue; // stairs
      if (isOccupiedByPlacedEnemy(r, c, alreadyPlacedEnemies)) continue;

      validPositions.push({ row: r, col: c });
    }
  }

  if (validPositions.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * validPositions.length);
  return validPositions[randomIndex];
}

/* ============================================================ */
/* SECTION 07 - FLOOR ENEMY SPAWNING                            */
/* Builds the list of enemies that should appear this floor.    */
/* Respects the floor enemy cap for non-exempt enemies.         */
/* ============================================================ */
function getEnemiesForFloor(gameState) {
  const enemies = [];
  const maxEnemyCount =
    typeof gameState.maxEnemyCount === "number" ? gameState.maxEnemyCount : Infinity;

  let cappedEnemyCount = 0;

  for (const definition of Object.values(ENEMY_DEFINITIONS)) {
    if (typeof definition.shouldSpawnOnFloor === "function") {
      const shouldSpawn = definition.shouldSpawnOnFloor(gameState);
      if (!shouldSpawn) continue;
    }

    const spawnCount =
      typeof definition.getSpawnCount === "function"
        ? Math.max(0, definition.getSpawnCount(gameState))
        : 1;

    for (let i = 0; i < spawnCount; i++) {
      const enemy = createEnemyInstance(definition.id);
      if (!enemy) continue;

      const countsTowardCap = enemyCountsTowardCap(enemy);

      if (countsTowardCap && cappedEnemyCount >= maxEnemyCount) {
        break;
      }

      let position = null;

      if (typeof definition.getSpawnPosition === "function") {
        position = definition.getSpawnPosition(gameState, enemies);
      }

      if (!position) continue;

      enemy.row = position.row;
      enemy.col = position.col;

      enemies.push(enemy);

      if (countsTowardCap) {
        cappedEnemyCount += 1;
      }
    }
  }

  return enemies;
}

/* ============================================================ */
/* SECTION 08 - LIGHTWEIGHT ENEMY MOVEMENT HELPERS              */
/* Greedy movement toward the player without heavy pathfinding. */
/* ============================================================ */
function getEnemyDistanceToPlayer(enemy, player) {
  return Math.abs(enemy.row - player.row) + Math.abs(enemy.col - player.col);
}

function isEnemyAdjacentToPlayer(enemy, player) {
  return getEnemyDistanceToPlayer(enemy, player) === 1;
}

function isEnemyWalkableTile(tileValue) {
  return (
    tileValue === 0 || // floor
    tileValue === 3 || // closed door
    tileValue === 4 || // open door
    tileValue === 5 || // chest closed
    tileValue === 6    // chest open
  );
}

function canEnemyMoveTo(row, col, gameState, movingEnemy) {
  if (row < 0 || row >= gameState.rows) return false;
  if (col < 0 || col >= gameState.cols) return false;
  if (!isEnemyWalkableTile(gameState.map[row][col])) return false;
  if (row === gameState.player.row && col === gameState.player.col) return false;

  return !gameState.enemies.some(enemy =>
    enemy !== movingEnemy &&
    enemy.row === row &&
    enemy.col === col
  );
}

function getEnemyChaseDirections(enemy, player) {
  const rowDiff = player.row - enemy.row;
  const colDiff = player.col - enemy.col;

  const verticalStep = rowDiff === 0 ? 0 : rowDiff > 0 ? 1 : -1;
  const horizontalStep = colDiff === 0 ? 0 : colDiff > 0 ? 1 : -1;

  const directions = [];

  if (Math.abs(rowDiff) >= Math.abs(colDiff)) {
    if (verticalStep !== 0) {
      directions.push({ dr: verticalStep, dc: 0 });
    }

    if (horizontalStep !== 0) {
      directions.push({ dr: 0, dc: horizontalStep });
    }
  } else {
    if (horizontalStep !== 0) {
      directions.push({ dr: 0, dc: horizontalStep });
    }

    if (verticalStep !== 0) {
      directions.push({ dr: verticalStep, dc: 0 });
    }
  }

  if (verticalStep !== 0) {
    directions.push({ dr: verticalStep, dc: 0 });
  }

  if (horizontalStep !== 0) {
    directions.push({ dr: 0, dc: horizontalStep });
  }

  directions.push(
    { dr: -1, dc: 0 },
    { dr: 1, dc: 0 },
    { dr: 0, dc: -1 },
    { dr: 0, dc: 1 }
  );

  const uniqueDirections = [];
  const seen = new Set();

  for (const direction of directions) {
    const key = `${direction.dr},${direction.dc}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueDirections.push(direction);
  }

  return uniqueDirections;
}

function moveEnemyOneStepTowardPlayer(enemy, gameState) {
  const directions = getEnemyChaseDirections(enemy, gameState.player);
  const currentDistance = getEnemyDistanceToPlayer(enemy, gameState.player);

  for (const direction of directions) {
    const nextRow = enemy.row + direction.dr;
    const nextCol = enemy.col + direction.dc;

    if (!canEnemyMoveTo(nextRow, nextCol, gameState, enemy)) {
      continue;
    }

    const newDistance =
      Math.abs(nextRow - gameState.player.row) +
      Math.abs(nextCol - gameState.player.col);

    if (newDistance >= currentDistance) {
      continue;
    }

    enemy.row = nextRow;
    enemy.col = nextCol;
    return true;
  }

  return false;
}

/* ============================================================ */
/* SECTION 09 - ENEMY TURN EXECUTION                            */
/* Runs each enemy's turn behavior after the player acts.       */
/* ============================================================ */
function runEnemyTurns(enemies, gameState) {
  const summary = {
    movedCount: 0,
    attackCount: 0,
    totalDamage: 0
  };

  for (const enemy of [...enemies]) {
    if (!enemy || gameState.player.health <= 0) {
      break;
    }

    const definition = getEnemyDefinition(enemy.id);

    if (!definition || typeof definition.onTurn !== "function") {
      continue;
    }

    const result = definition.onTurn(enemy, gameState) || {};

    if (result.moved) {
      summary.movedCount += 1;
    }

    if (result.attacked) {
      summary.attackCount += 1;
    }

    if (typeof result.damageDealt === "number" && result.damageDealt > 0) {
      summary.totalDamage += result.damageDealt;
    }
  }

  return summary;
}