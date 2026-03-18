/* ============================================================ */
/* SECTION 01 - GRID SIZE                                       */
/* Controls the size of the dungeon map.                        */
/* ============================================================ */
const rows = 40;
const cols = 40;

/* ============================================================ */
/* SECTION 02 - TILE CONSTANTS                                  */
/* Numeric tile ids used throughout the map logic.              */
/* ============================================================ */
const TILE_FLOOR = 0;
const TILE_WALL = 1;
const TILE_STAIRS = 2;
const TILE_DOOR_CLOSED = 3;
const TILE_DOOR_OPEN = 4;
const TILE_CHEST_CLOSED = 5;
const TILE_CHEST_OPEN = 6;

/* ============================================================ */
/* SECTION 03 - GENERATION SETTINGS                             */
/* Controls room counts, room size, fog radius, and generation. */
/* ============================================================ */
const ROOM_COUNT = 9;
const ROOM_MIN_SIZE = 4;
const ROOM_MAX_SIZE = 8;
const FOV_RADIUS = 6;
const MAX_ROOM_ATTEMPTS = 200;

/* ============================================================ */
/* SECTION 04 - CHEST SETTINGS                                  */
/* Controls minimum and maximum chest spawns per floor.         */
/* ============================================================ */
const CHEST_MIN_PER_FLOOR = 1;
const CHEST_MAX_PER_FLOOR = 3;

/* ============================================================ */
/* SECTION 04.5 - ENEMY SETTINGS                                */
/* Controls scaling enemy limits by floor.                      */
/* ============================================================ */
const FLOOR_1_MAX_ENEMIES = 5;
const FLOOR_10_MAX_ENEMIES = 30;

/* ============================================================ */
/* SECTION 05 - DOM REFERENCES                                  */
/* Cached references to all main UI elements.                   */
/* ============================================================ */
const game = document.getElementById("game");
const positionText = document.getElementById("positionText");
const floorText = document.getElementById("floorText");
const healthText = document.getElementById("healthText");
const manaText = document.getElementById("manaText");

const itemsList = document.getElementById("itemsList");
const spellsList = document.getElementById("spellsList");
const buffsList = document.getElementById("buffsList");
const cursesList = document.getElementById("cursesList");
const selectedSpellInfo = document.getElementById("selectedSpellInfo");

const rightPanel = document.getElementById("rightPanel");
const panelTitle = document.getElementById("panelTitle");
const panelContent = document.getElementById("panelContent");
const closePanelBtn = document.getElementById("closePanelBtn");

const deathScreen = document.getElementById("deathScreen");
const deathMessage = document.getElementById("deathMessage");
const deathFloorText = document.getElementById("deathFloorText");
const deathCauseText = document.getElementById("deathCauseText");
const restartGameBtn = document.getElementById("restartGameBtn");
/* ------------------------------------------------------------ */
/* Enemy hover tooltip element.                                 */
/* ------------------------------------------------------------ */
const enemyHoverTooltip = document.createElement("div");
enemyHoverTooltip.className = "enemy-hover-tooltip hidden";
document.body.appendChild(enemyHoverTooltip);

/* ============================================================ */
/* SECTION 06 - PLAYER STATE                                    */
/* Main player data used by the game.                           */
/* ============================================================ */
function getStartingPlayerState() {
  return {
    row: 1,
    col: 1,
    health: 100,
    mana: 100,
    items: [],
    spells: [createSpellInstance("fireball")],
    buffs: [],
    curses: []
  };
}

const player = getStartingPlayerState();
/* ============================================================ */
/* SECTION 07 - FLOOR STATE                                     */
/* Variables that reset or change as new floors are generated.  */
/* ============================================================ */
let floorLevel = 1;
let map = [];
let explored = [];
let visible = [];
let rooms = [];
let enemies = [];
let chestContents = new Map();
let activeChestKey = null;
let gameOver = false;
let lastDefeatCause = "Unknown";
/* ============================================================ */
/* SECTION 08 - SPELL TARGETING STATE                           */
/* Tracks whether the player is currently aiming a spell.       */
/* ============================================================ */
let activeSpellId = null;
let spellHoverRow = null;
let spellHoverCol = null;
/* ============================================================ */
/* SECTION 09 - MOVEMENT KEYS                                   */
/* Maps keyboard input to row and column movement.              */
/* ============================================================ */
const MOVE_KEYS = {
  arrowup: [-1, 0],
  w: [-1, 0],
  arrowdown: [1, 0],
  s: [1, 0],
  arrowleft: [0, -1],
  a: [0, -1],
  arrowright: [0, 1],
  d: [0, 1]
};

/* ============================================================ */
/* SECTION 10 - BASIC HELPERS                                   */
/* Small reusable utility functions.                            */
/* ============================================================ */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function create2DArray(rowCount, colCount, fillValue) {
  const result = [];

  for (let r = 0; r < rowCount; r++) {
    const row = [];

    for (let c = 0; c < colCount; c++) {
      row.push(fillValue);
    }

    result.push(row);
  }

  return result;
}

function createFilledMap() {
  return create2DArray(rows, cols, TILE_WALL);
}

function createVisibilityArrays() {
  explored = create2DArray(rows, cols, false);
  visible = create2DArray(rows, cols, false);
}

function getFloorMaxEnemyCount(floor) {
  if (floor <= 1) return FLOOR_1_MAX_ENEMIES;
  if (floor >= 10) return FLOOR_10_MAX_ENEMIES;

  const progress = (floor - 1) / 9;
  return Math.round(
    FLOOR_1_MAX_ENEMIES +
    progress * (FLOOR_10_MAX_ENEMIES - FLOOR_1_MAX_ENEMIES)
  );
}

/* ============================================================ */
/* SECTION 10.5 - PLAYER DAMAGE AND GAME OVER HELPERS           */
/* Handles enemy damage, defeat screen, and restart behavior.   */
/* ============================================================ */
function isGameOver() {
  return gameOver || player.health <= 0;
}

function hideDeathScreen() {
  deathScreen.classList.add("hidden");
}

function showDeathScreen(message, causeText) {
  gameOver = true;
  lastDefeatCause = causeText || "Unknown";

  deathMessage.textContent = message || "You have fallen in the dungeon.";
  deathFloorText.textContent = floorLevel;
  deathCauseText.textContent = lastDefeatCause;

  clearActiveSpell();
  closeRightPanel();
  hideEnemyHoverTooltip();
  deathScreen.classList.remove("hidden");
}

function resetPlayerState() {
  const startingState = getStartingPlayerState();

  player.row = startingState.row;
  player.col = startingState.col;
  player.health = startingState.health;
  player.mana = startingState.mana;
  player.items = startingState.items;
  player.spells = startingState.spells;
  player.buffs = startingState.buffs;
  player.curses = startingState.curses;
}

function restartGame() {
  gameOver = false;
  lastDefeatCause = "Unknown";
  floorLevel = 1;
  activeChestKey = null;
  chestContents = new Map();
  enemies = [];
  clearActiveSpell();
  closeRightPanel();
  hideEnemyHoverTooltip();
  hideDeathScreen();
  resetPlayerState();
  generateFloor();
}

function applyDamageToPlayer(amount, sourceEnemy = null) {
  if (typeof amount !== "number" || amount <= 0 || isGameOver()) {
    return 0;
  }

  player.health = Math.max(0, player.health - amount);

  if (player.health <= 0) {
    const sourceName = sourceEnemy && sourceEnemy.name
      ? sourceEnemy.name
      : "An enemy";

    showDeathScreen(`${sourceName} defeated you.`, sourceName);
  }

  return amount;
}
/* ============================================================ */
/* SECTION 11 - ROOM CARVING                                    */
/* Functions used to carve out dungeon rooms.                   */
/* ============================================================ */
function carveRoom(room) {
  for (let r = room.y; r < room.y + room.h; r++) {
    for (let c = room.x; c < room.x + room.w; c++) {
      map[r][c] = TILE_FLOOR;
    }
  }
}

function roomsOverlap(a, b) {
  return !(
    a.x + a.w + 1 < b.x ||
    a.x > b.x + b.w + 1 ||
    a.y + a.h + 1 < b.y ||
    a.y > b.y + b.h + 1
  );
}

function roomCenter(room) {
  return {
    row: Math.floor(room.y + room.h / 2),
    col: Math.floor(room.x + room.w / 2)
  };
}

/* ============================================================ */
/* SECTION 12 - TUNNEL CARVING                                  */
/* Connects rooms with hallways.                                */
/* ============================================================ */
function carveHorizontalTunnel(row, col1, col2) {
  const start = Math.min(col1, col2);
  const end = Math.max(col1, col2);

  for (let c = start; c <= end; c++) {
    if (map[row][c] === TILE_WALL) {
      map[row][c] = TILE_FLOOR;
    }
  }
}

function carveVerticalTunnel(col, row1, row2) {
  const start = Math.min(row1, row2);
  const end = Math.max(row1, row2);

  for (let r = start; r <= end; r++) {
    if (map[r][col] === TILE_WALL) {
      map[r][col] = TILE_FLOOR;
    }
  }
}

function connectRooms(roomA, roomB) {
  const a = roomCenter(roomA);
  const b = roomCenter(roomB);

  if (Math.random() < 0.5) {
    carveHorizontalTunnel(a.row, a.col, b.col);
    carveVerticalTunnel(b.col, a.row, b.row);
  } else {
    carveVerticalTunnel(a.col, a.row, b.row);
    carveHorizontalTunnel(b.row, a.col, b.col);
  }
}

/* ============================================================ */
/* SECTION 13 - ROOM GENERATION                                 */
/* Builds a set of non-overlapping rooms and connects them.     */
/* ============================================================ */
function generateRooms() {
  rooms = [];
  let attempts = 0;

  while (rooms.length < ROOM_COUNT && attempts < MAX_ROOM_ATTEMPTS) {
    attempts++;

    const room = {
      w: randomInt(ROOM_MIN_SIZE, ROOM_MAX_SIZE),
      h: randomInt(ROOM_MIN_SIZE, ROOM_MAX_SIZE),
      x: randomInt(1, cols - ROOM_MAX_SIZE - 2),
      y: randomInt(1, rows - ROOM_MAX_SIZE - 2)
    };

    let overlaps = false;

    for (const otherRoom of rooms) {
      if (roomsOverlap(room, otherRoom)) {
        overlaps = true;
        break;
      }
    }

    if (overlaps) continue;

    carveRoom(room);

    if (rooms.length > 0) {
      connectRooms(rooms[rooms.length - 1], room);
    }

    rooms.push(room);
  }
}

/* ============================================================ */
/* SECTION 14 - DOOR PLACEMENT                                  */
/* Converts some hall transitions into closed doors.            */
/* ============================================================ */
function isFloorTile(tileValue) {
  return (
    tileValue === TILE_FLOOR ||
    tileValue === TILE_DOOR_CLOSED ||
    tileValue === TILE_DOOR_OPEN ||
    tileValue === TILE_STAIRS ||
    tileValue === TILE_CHEST_CLOSED ||
    tileValue === TILE_CHEST_OPEN
  );
}

function addDoors() {
  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      if (map[r][c] !== TILE_FLOOR) continue;

      const up = map[r - 1][c];
      const down = map[r + 1][c];
      const left = map[r][c - 1];
      const right = map[r][c + 1];

      const verticalDoorSpot =
        isFloorTile(up) &&
        isFloorTile(down) &&
        left === TILE_WALL &&
        right === TILE_WALL;

      const horizontalDoorSpot =
        isFloorTile(left) &&
        isFloorTile(right) &&
        up === TILE_WALL &&
        down === TILE_WALL;

      if ((verticalDoorSpot || horizontalDoorSpot) && Math.random() < 0.12) {
        map[r][c] = TILE_DOOR_CLOSED;
      }
    }
  }
}

/* ============================================================ */
/* SECTION 15 - PLAYER / STAIRS PLACEMENT                       */
/* Places the player in the first room and stairs in the last.  */
/* ============================================================ */
function placePlayerAndStairs() {
  const start = roomCenter(rooms[0]);
  const end = roomCenter(rooms[rooms.length - 1]);

  player.row = start.row;
  player.col = start.col;

  map[end.row][end.col] = TILE_STAIRS;
}

/* ============================================================ */
/* SECTION 16 - RANDOM FLOOR TILE SELECTION                     */
/* Used for chest placement and other random features later.    */
/* ============================================================ */
function getRandomFloorTilePosition() {
  const validTiles = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (map[r][c] === TILE_FLOOR) {
        validTiles.push({ row: r, col: c });
      }
    }
  }

  if (validTiles.length === 0) return null;

  return validTiles[randomInt(0, validTiles.length - 1)];
}

/* ============================================================ */
/* SECTION 17 - CHEST / ENEMY HELPERS                           */
/* Utility functions for content lookup and occupancy checks.   */
/* ============================================================ */
function getChestKey(row, col) {
  return `${row},${col}`;
}

function getEnemyAt(row, col) {
  return enemies.find(enemy => enemy.row === row && enemy.col === col) || null;
}

function getSpellTargetAt(row, col) {
  const enemy = getEnemyAt(row, col);

  if (enemy) {
    return {
      type: "enemy",
      row,
      col,
      enemy
    };
  }

  return {
    type: "tile",
    row,
    col,
    enemy: null
  };
}

/* ============================================================ */
/* SECTION 17.5 - STAIRS LOCK HELPERS                           */
/* Stairs only work when all required enemies are defeated.     */
/* ============================================================ */
function doesEnemyBlockStairs(enemy) {
  if (!enemy) return false;

  if (typeof enemyCountsForStairsLock === "function") {
    return enemyCountsForStairsLock(enemy);
  }

  return enemy.id !== "testDummy";
}

function getRemainingRequiredEnemyCount() {
  return enemies.filter(enemy => doesEnemyBlockStairs(enemy)).length;
}

function areStairsUnlocked() {
  return getRemainingRequiredEnemyCount() === 0;
}

/* ============================================================ */
/* SECTION 18 - CHEST PLACEMENT                                 */
/* Places 1 to 3 chests in valid dungeon positions.             */
/* ============================================================ */
function placeChests() {
  const chestCount = randomInt(CHEST_MIN_PER_FLOOR, CHEST_MAX_PER_FLOOR);
  let placed = 0;
  let attempts = 0;

  while (placed < chestCount && attempts < 500) {
    attempts++;

    const spot = getRandomFloorTilePosition();
    if (!spot) break;

    const isPlayerStart = spot.row === player.row && spot.col === player.col;
    if (isPlayerStart) continue;

    const occupiedByEnemy = getEnemyAt(spot.row, spot.col);
    if (occupiedByEnemy) continue;

    if (map[spot.row][spot.col] !== TILE_FLOOR) continue;

    map[spot.row][spot.col] = TILE_CHEST_CLOSED;

    const chestKey = getChestKey(spot.row, spot.col);
    chestContents.set(chestKey, generateChestLoot(player));

    placed++;
  }
}

/* ============================================================ */
/* SECTION 19 - TILE CLEANUP                                    */
/* Ensures the player start tile is walkable if generation      */
/* put a wall or closed door there.                             */
/* ============================================================ */
function clearTileIfNeeded(r, c) {
  if (map[r][c] === TILE_WALL || map[r][c] === TILE_DOOR_CLOSED) {
    map[r][c] = TILE_FLOOR;
  }
}

/* ============================================================ */
/* SECTION 20 - RIGHT PANEL CONTROL                             */
/* Open/close and state reset for the right-side panel.         */
/* ============================================================ */
function closeRightPanel() {
  rightPanel.classList.add("hidden");
  activeChestKey = null;
}

function openMessagePanel(title, message) {
  panelTitle.textContent = title;
  panelContent.innerHTML = "";

  const result = document.createElement("p");
  result.textContent = message;
  panelContent.appendChild(result);

  rightPanel.classList.remove("hidden");
}

/* ============================================================ */
/* SECTION 21 - SPELL TARGETING CONTROL                         */
/* Starts, stops, previews, and resolves spell targeting mode.  */
/* ============================================================ */
function clearSpellHoverTarget() {
  spellHoverRow = null;
  spellHoverCol = null;
}

function getActiveSpellDefinition() {
  if (!activeSpellId) return null;
  return getSpellById(activeSpellId);
}

function clearActiveSpell() {
  activeSpellId = null;
  clearSpellHoverTarget();
}

function activateSpell(spellId) {
  if (isGameOver()) return;

  const spellDefinition = getSpellById(spellId);

  if (!spellDefinition) return;

  if (!playerHasSpell(player, spellId)) {
    openMessagePanel("Spell", "You do not know that spell.");
    return;
  }

  if (player.mana < spellDefinition.manaCost) {
    openMessagePanel("Spell", `Not enough mana to cast ${spellDefinition.name}.`);
    return;
  }

  if (activeSpellId === spellId) {
    clearActiveSpell();
    drawGrid();
    updateCharacterPanel();
    return;
  }

  activeSpellId = spellId;
  clearSpellHoverTarget();
  drawGrid();
  updateCharacterPanel();

  openMessagePanel(
    spellDefinition.name,
    `Hover over tiles to preview range and area. Click a valid target within ${spellDefinition.range} tiles.`
  );
}

function isTileInActiveSpellRange(row, col) {
  if (!activeSpellId) return false;
  return isTargetInSpellRange(activeSpellId, player, row, col);
}

function getActiveSpellHoverTarget() {
  if (!activeSpellId) return null;
  if (spellHoverRow === null || spellHoverCol === null) return null;
  if (!isTileInActiveSpellRange(spellHoverRow, spellHoverCol)) return null;

  return getSpellTargetAt(spellHoverRow, spellHoverCol);
}

function canPreviewActiveSpellAt(row, col) {
  if (!activeSpellId) return false;

  const target = getSpellTargetAt(row, col);
  const gameState = {
    floorLevel,
    rows,
    cols,
    map,
    rooms,
    player,
    enemies,
    damagePlayer: applyDamageToPlayer
  };

  return canSpellTarget(activeSpellId, player, target, gameState);
}

function getActiveSpellPreviewTiles() {
  if (!activeSpellId) return [];

  const spellDefinition = getActiveSpellDefinition();
  if (!spellDefinition) return [];
  if (spellHoverRow === null || spellHoverCol === null) return [];
  if (!canPreviewActiveSpellAt(spellHoverRow, spellHoverCol)) return [];

  const radius = typeof spellDefinition.radius === "number" ? spellDefinition.radius : 0;

  if (radius <= 0) {
    return [
      {
        row: spellHoverRow,
        col: spellHoverCol
      }
    ];
  }

  const tiles = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const distance = getSpellDistance(spellHoverRow, spellHoverCol, r, c);

      if (distance <= radius) {
        tiles.push({ row: r, col: c });
      }
    }
  }

  return tiles;
}

function isTileInActiveSpellPreview(row, col) {
  const previewTiles = getActiveSpellPreviewTiles();
  return previewTiles.some(tile => tile.row === row && tile.col === col);
}

function isTileActiveSpellPreviewCenter(row, col) {
  return spellHoverRow === row && spellHoverCol === col && canPreviewActiveSpellAt(row, col);
}

function tryCastActiveSpellAt(row, col) {
  if (!activeSpellId || isGameOver()) return false;

  const target = getSpellTargetAt(row, col);
  const gameState = {
    floorLevel,
    rows,
    cols,
    map,
    rooms,
    player,
    enemies,
    damagePlayer: applyDamageToPlayer
  };

  if (!canSpellTarget(activeSpellId, player, target, gameState)) {
  openMessagePanel("Spell", "That is not a valid target.");
  return true;
}

  const spellResult = castSpellById(activeSpellId, player, target, gameState);
  const spellDefinition = getSpellById(activeSpellId);

  clearActiveSpell();

  const enemyTurnSummary = runEnemies();

// ADD THIS LINE
tickBuffDurations(player);

updateFogOfWar();
drawGrid();
playSpellResultEffects(spellResult);
updateCharacterPanel();

  let message = spellResult.message;

  if (!isGameOver() && enemyTurnSummary.totalDamage > 0) {
    message += ` Enemies hit you for ${enemyTurnSummary.totalDamage} damage.`;
  }

  openMessagePanel(
    spellDefinition ? spellDefinition.name : "Spell",
    message
  );

  return true;
}

function isEnemyHighlightedByActiveSpell(enemy) {
  if (!activeSpellId || !enemy) return false;

  const target = {
    type: "enemy",
    row: enemy.row,
    col: enemy.col,
    enemy
  };

  const gameState = {
    floorLevel,
    rows,
    cols,
    map,
    rooms,
    player,
    enemies
  };

  return canSpellTarget(activeSpellId, player, target, gameState);
}

/* ============================================================ */
/* SECTION 22 - INVENTORY MANAGEMENT                            */
/* Adding, removing, and using items from player inventory.     */
/* ============================================================ */
function addItemToInventory(item) {
  player.items.push(item);
}

function removeInventoryItem(index) {
  player.items.splice(index, 1);
}

function useInventoryItem(index) {
  if (isGameOver()) return;

  const item = player.items[index];
  if (!item) return;

  const message = useItemById(item.id, player, item);
  removeInventoryItem(index);
  updateCharacterPanel();
  openMessagePanel("Item Used", message);
}

/* ============================================================ */
/* SECTION 23 - CHEST PANEL LOGIC                               */
/* Taking chest items and displaying chest content.             */
/* ============================================================ */
function takeChestItem(chestKey, itemIndex) {
  if (isGameOver()) return;

  const loot = chestContents.get(chestKey);
  if (!loot || !loot[itemIndex]) return;

  const item = loot[itemIndex];
  addItemToInventory(item);
  loot.splice(itemIndex, 1);
  chestContents.set(chestKey, loot);

  updateCharacterPanel();
  openChestPanel(chestKey);
}

function openChestPanel(chestKey) {
  activeChestKey = chestKey;

  const loot = chestContents.get(chestKey) || [];

  panelTitle.textContent = "Chest";
  panelContent.innerHTML = "";

  if (loot.length === 0) {
    const emptyText = document.createElement("p");
    emptyText.textContent = "This chest is empty.";
    panelContent.appendChild(emptyText);
  } else {
    const intro = document.createElement("p");
    intro.textContent = "Inside the chest:";
    panelContent.appendChild(intro);

    const lootContainer = document.createElement("div");
    lootContainer.className = "loot-list";

    loot.forEach((item, index) => {
      const itemCard = document.createElement("div");
      itemCard.className = "loot-item";

      const itemName = document.createElement("div");
      itemName.className = "loot-item-name";
      itemName.textContent = item.name;

      const itemDescription = document.createElement("div");
      itemDescription.className = "loot-item-description";
      itemDescription.textContent = item.description;

      const takeButton = document.createElement("button");
      takeButton.className = "loot-button";
      takeButton.textContent = "Take";
      takeButton.addEventListener("click", () => {
        takeChestItem(chestKey, index);
      });

      itemCard.appendChild(itemName);
      itemCard.appendChild(itemDescription);
      itemCard.appendChild(takeButton);
      lootContainer.appendChild(itemCard);
    });

    panelContent.appendChild(lootContainer);
  }

  rightPanel.classList.remove("hidden");
}

/* ============================================================ */
/* SECTION 24 - CHARACTER PANEL RENDERING                       */
/* Updates the stats and list sections on the left panel.       */
/* ============================================================ */
function updateCharacterPanel() {
  healthText.textContent = player.health;
  manaText.textContent = player.mana;

  itemsList.innerHTML = "";
  spellsList.innerHTML = "";
  buffsList.innerHTML = "";
  cursesList.innerHTML = "";

  renderItemsList(itemsList, player.items);
  renderSpellsList(spellsList, player.spells);
  renderSelectedSpellInfo(selectedSpellInfo);

  if (typeof renderBuffsList === "function") {
    renderBuffsList(buffsList, player.buffs);
  } else {
    renderSimpleList(buffsList, player.buffs);
  }

  renderSimpleList(cursesList, player.curses);
}

function renderItemsList(container, data) {
  if (data.length === 0) {
    const emptyEntry = document.createElement("div");
    emptyEntry.className = "empty-entry";
    emptyEntry.textContent = "";
    container.appendChild(emptyEntry);
    return;
  }

  const list = document.createElement("div");
  list.className = "inventory-list";

  data.forEach((item, index) => {
    const button = document.createElement("button");
    button.className = "inventory-item-button";
    button.textContent = item.name;
    button.addEventListener("click", () => {
      useInventoryItem(index);
    });
    list.appendChild(button);
  });

  container.appendChild(list);
}

function renderSpellsList(container, data) {
  if (data.length === 0) {
    const emptyEntry = document.createElement("div");
    emptyEntry.className = "empty-entry";
    emptyEntry.textContent = "";
    container.appendChild(emptyEntry);
    return;
  }

  const list = document.createElement("div");
  list.className = "inventory-list";

  data.forEach(spell => {
    const button = document.createElement("button");
    button.className = "inventory-item-button spell-button";
    button.textContent = `${spell.name} (${spell.manaCost})`;

    if (activeSpellId === spell.id) {
      button.classList.add("active-spell-button");
    }

    button.addEventListener("click", () => {
      activateSpell(spell.id);
    });

    list.appendChild(button);
  });

  container.appendChild(list);
}

function renderSelectedSpellInfo(container) {
  if (!container) return;

  container.innerHTML = "";

  if (!activeSpellId) {
    container.classList.add("empty-spell-info");

    const placeholder = document.createElement("div");
    placeholder.className = "selected-spell-placeholder";
    placeholder.textContent = "No spell selected.";
    container.appendChild(placeholder);
    return;
  }

  const spell = getSpellById(activeSpellId);

  if (!spell) {
    container.classList.add("empty-spell-info");

    const placeholder = document.createElement("div");
    placeholder.className = "selected-spell-placeholder";
    placeholder.textContent = "Spell data not found.";
    container.appendChild(placeholder);
    return;
  }

  container.classList.remove("empty-spell-info");

  const title = document.createElement("div");
  title.className = "selected-spell-title";
  title.textContent = spell.name;

  const stats = document.createElement("div");
  stats.className = "selected-spell-stats";

  const mana = document.createElement("div");
  mana.className = "selected-spell-stat";
  mana.textContent = `Cost: ${spell.manaCost} mana`;

  const range = document.createElement("div");
  range.className = "selected-spell-stat";
  range.textContent = `Range: ${spell.range}`;

  const radius = document.createElement("div");
  radius.className = "selected-spell-stat";
  radius.textContent = `Radius: ${spell.radius || 0}`;

  stats.appendChild(mana);
  stats.appendChild(range);
  stats.appendChild(radius);

  const description = document.createElement("div");
  description.className = "selected-spell-description";
  description.textContent = spell.description || "No description.";

  container.appendChild(title);
  container.appendChild(stats);
  container.appendChild(description);
}

function renderSimpleList(container, data) {
  if (data.length === 0) {
    const emptyEntry = document.createElement("div");
    emptyEntry.className = "empty-entry";
    emptyEntry.textContent = "";
    container.appendChild(emptyEntry);
    return;
  }

  const list = document.createElement("ul");
  list.className = "character-list";

  for (const entry of data) {
    const li = document.createElement("li");
    li.textContent = typeof entry === "string" ? entry : entry.name;
    list.appendChild(li);
  }

  container.appendChild(list);
}

/* ============================================================ */
/* SECTION 25 - ENEMY PLACEMENT                                 */
/* Pulls enemies from the modular enemy system and places them. */
/* ============================================================ */
function placeEnemies() {
  if (typeof getEnemiesForFloor !== "function") {
    enemies = [];
    return;
  }

  const gameState = {
    floorLevel,
    rows,
    cols,
    map,
    rooms,
    player,
    maxEnemyCount: getFloorMaxEnemyCount(floorLevel)
  };

  const spawnedEnemies = getEnemiesForFloor(gameState);
  enemies = [];

  for (const enemy of spawnedEnemies) {
    if (!enemy) continue;
    if (enemy.row < 0 || enemy.row >= rows) continue;
    if (enemy.col < 0 || enemy.col >= cols) continue;
    if (!isFloorTile(map[enemy.row][enemy.col])) continue;
    if (enemy.row === player.row && enemy.col === player.col) continue;
    if (map[enemy.row][enemy.col] === TILE_STAIRS) continue;
    if (getEnemyAt(enemy.row, enemy.col)) continue;

    enemies.push(enemy);
  }
}

/* ============================================================ */
/* SECTION 26 - ENEMY TURNS                                     */
/* Runs all enemy AI after the player acts.                     */
/* ============================================================ */
function runEnemies() {
  if (typeof runEnemyTurns !== "function" || isGameOver()) {
    return {
      movedCount: 0,
      attackCount: 0,
      totalDamage: 0
    };
  }

  const gameState = {
    floorLevel,
    rows,
    cols,
    map,
    rooms,
    player,
    enemies,
    damagePlayer: applyDamageToPlayer
  };

  return runEnemyTurns(enemies, gameState);
}

/* ============================================================ */
/* SECTION 27 - FLOOR GENERATION                                */
/* Builds a brand new dungeon floor from scratch.               */
/* ============================================================ */
function generateFloor() {
  map = createFilledMap();
  createVisibilityArrays();
  chestContents = new Map();
  activeChestKey = null;
  enemies = [];
  clearActiveSpell();

  generateRooms();
  addDoors();
  placePlayerAndStairs();
  clearTileIfNeeded(player.row, player.col);
  placeEnemies();
  placeChests();

  updateFogOfWar();
  drawGrid();
  updateCharacterPanel();
}

/* ============================================================ */
/* SECTION 28 - FOG OF WAR HELPERS                              */
/* Vision blocking and line-of-sight logic.                     */
/* ============================================================ */
function isTransparentTile(tileValue) {
  return tileValue !== TILE_WALL && tileValue !== TILE_DOOR_CLOSED;
}

function hasLineOfSight(r1, c1, r2, c2) {
  let x0 = c1;
  let y0 = r1;
  const x1 = c2;
  const y1 = r2;

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (!(x0 === x1 && y0 === y1)) {
    if (!(x0 === c1 && y0 === r1)) {
      if (!isTransparentTile(map[y0][x0])) {
        return false;
      }
    }

    const e2 = err * 2;

    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }

    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }

  return true;
}

/* ============================================================ */
/* SECTION 29 - FOG OF WAR UPDATE                               */
/* Rebuilds visible and explored tiles around the player.       */
/* ============================================================ */
function updateFogOfWar() {
  visible = create2DArray(rows, cols, false);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const dr = r - player.row;
      const dc = c - player.col;
      const distance = Math.sqrt(dr * dr + dc * dc);

      if (distance <= FOV_RADIUS && hasLineOfSight(player.row, player.col, r, c)) {
        visible[r][c] = true;
        explored[r][c] = true;
      }
    }
  }

  explored[player.row][player.col] = true;
  visible[player.row][player.col] = true;
}

/* ============================================================ */
/* SECTION 30 - GRID DRAWING                                    */
/* Builds the visible tile grid in the DOM.                     */
/* ============================================================ */
function drawGrid() {
  game.innerHTML = "";
  hideEnemyHoverTooltip();

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tile = document.createElement("div");
      tile.classList.add("tile");
      tile.dataset.row = r;
      tile.dataset.col = c;

      const tileValue = map[r][c];

      if (!explored[r][c]) {
        tile.classList.add("unseen");
      } else {
        if (tileValue === TILE_WALL) {
          tile.classList.add("wall");
        } else if (tileValue === TILE_STAIRS) {
          tile.classList.add("stairs");
        } else if (tileValue === TILE_DOOR_CLOSED) {
          tile.classList.add("door");
        } else if (tileValue === TILE_DOOR_OPEN) {
          tile.classList.add("open-door");
        } else if (tileValue === TILE_CHEST_CLOSED) {
          tile.classList.add("chest");
        } else if (tileValue === TILE_CHEST_OPEN) {
          tile.classList.add("open-chest");
        } else {
          tile.classList.add("floor");
        }

        if (visible[r][c]) {
          tile.classList.add("visible");
        } else {
          tile.classList.add("explored");
        }

        if (activeSpellId && isTileInActiveSpellRange(r, c)) {
          tile.classList.add("spell-range-preview");
        }

        if (activeSpellId && isTileInActiveSpellPreview(r, c)) {
          tile.classList.add("spell-radius-preview");
        }

        if (activeSpellId && isTileActiveSpellPreviewCenter(r, c)) {
          tile.classList.add("spell-radius-center");
        }

        const enemy = getEnemyAt(r, c);
        if (enemy) {
          tile.dataset.enemySymbol = enemy.symbol || "E";
          tile.dataset.enemyName = enemy.name || "Enemy";
          tile.dataset.enemyHealth = enemy.health;
          tile.dataset.enemyMaxHealth = enemy.maxHealth;
          tile.classList.add("enemy");

          if (enemy.className) {
            tile.classList.add(enemy.className);
          }

          if (isEnemyHighlightedByActiveSpell(enemy)) {
            tile.classList.add("spell-target-highlight");

            const spellDefinition = getSpellById(activeSpellId);
            if (spellDefinition && spellDefinition.highlightClass) {
              tile.classList.add(spellDefinition.highlightClass);
            }
          }
        }

        if (r === player.row && c === player.col) {
          tile.classList.add("player");
        }
      }

      game.appendChild(tile);
    }
  }

  positionText.textContent = `${player.row},${player.col}`;
  floorText.textContent = floorLevel;
}

/* ============================================================ */
/* SECTION 30.5 - ENEMY HOVER TOOLTIP                           */
/* Shows enemy health when the cursor hovers over an enemy.     */
/* Also updates spell hover preview while aiming a spell.       */
/* ============================================================ */
function hideEnemyHoverTooltip() {
  enemyHoverTooltip.classList.add("hidden");
  enemyHoverTooltip.innerHTML = "";
}

function showEnemyHoverTooltip(tile, mouseX, mouseY) {
  if (!tile || !tile.dataset.enemyHealth || !tile.dataset.enemyMaxHealth) {
    hideEnemyHoverTooltip();
    return;
  }

  const name = tile.dataset.enemyName || "Enemy";
  const health = Number(tile.dataset.enemyHealth);
  const maxHealth = Number(tile.dataset.enemyMaxHealth);
  const percent = maxHealth > 0 ? Math.max(0, (health / maxHealth) * 100) : 0;

  enemyHoverTooltip.innerHTML = `
    <div class="enemy-hover-name">${name}</div>
    <div class="enemy-hover-health-text">Health: ${health} / ${maxHealth}</div>
    <div class="enemy-hover-health-bar">
      <div class="enemy-hover-health-fill" style="width:${percent}%"></div>
    </div>
  `;

  enemyHoverTooltip.classList.remove("hidden");

  const offsetX = 14;
  const offsetY = 14;
  enemyHoverTooltip.style.left = `${mouseX + offsetX}px`;
  enemyHoverTooltip.style.top = `${mouseY + offsetY}px`;
}

game.addEventListener("mousemove", event => {
  const tile = event.target.closest(".tile");

  if (!tile) {
    hideEnemyHoverTooltip();
    return;
  }

  const row = Number(tile.dataset.row);
  const col = Number(tile.dataset.col);

  if (!Number.isNaN(row) && !Number.isNaN(col) && activeSpellId) {
    if (spellHoverRow !== row || spellHoverCol !== col) {
      spellHoverRow = row;
      spellHoverCol = col;
      drawGrid();
    }
  }

  if (!tile.classList.contains("enemy")) {
    hideEnemyHoverTooltip();
    return;
  }

  showEnemyHoverTooltip(tile, event.pageX, event.pageY);
});

game.addEventListener("mouseleave", () => {
  hideEnemyHoverTooltip();

  if (activeSpellId) {
    clearSpellHoverTarget();
    drawGrid();
  }
});

/* ============================================================ */
/* SECTION 31 - MOVEMENT RULES                                  */
/* Checks whether the player can move into a tile.              */
/* ============================================================ */
function canMoveTo(newRow, newCol) {
  if (newRow < 0 || newRow >= rows) return false;
  if (newCol < 0 || newCol >= cols) return false;
  if (map[newRow][newCol] === TILE_WALL) return false;
  if (getEnemyAt(newRow, newCol)) return false;
  return true;
}

/* ============================================================ */
/* SECTION 32 - AFTER-MOVE TILE INTERACTIONS                    */
/* Handles opening doors, chests, and going downstairs.         */
/* ============================================================ */
function handleTileAfterMove(enemyTurnSummary = null) {
  const currentTile = map[player.row][player.col];

  if (currentTile === TILE_DOOR_CLOSED) {
    map[player.row][player.col] = TILE_DOOR_OPEN;
  }

  if (currentTile === TILE_CHEST_CLOSED) {
    map[player.row][player.col] = TILE_CHEST_OPEN;
    const chestKey = getChestKey(player.row, player.col);
    openChestPanel(chestKey);
  }

  if (currentTile === TILE_CHEST_OPEN) {
    const chestKey = getChestKey(player.row, player.col);
    openChestPanel(chestKey);
  }

  if (currentTile === TILE_STAIRS) {
    if (!areStairsUnlocked()) {
      const remainingEnemies = getRemainingRequiredEnemyCount();
      openMessagePanel(
        "Stairs Locked",
        `The stairs are sealed. Defeat all enemies first. Remaining: ${remainingEnemies}`
      );
      updateFogOfWar();
      drawGrid();
      updateCharacterPanel();
      return;
    }

    floorLevel += 1;
    closeRightPanel();
    generateFloor();
    return;
  }

  updateFogOfWar();
  drawGrid();
  updateCharacterPanel();

  if (
    !isGameOver() &&
    enemyTurnSummary &&
    enemyTurnSummary.totalDamage > 0 &&
    currentTile !== TILE_CHEST_CLOSED &&
    currentTile !== TILE_CHEST_OPEN
  ) {
    openMessagePanel("Enemy Turn", `Enemies hit you for ${enemyTurnSummary.totalDamage} damage.`);
  }
}

/* ============================================================ */
/* SECTION 33 - PLAYER MOVEMENT                                 */
/* Applies movement, then runs enemies and tile interactions.   */
/* ============================================================ */
function movePlayer(dr, dc) {
  if (isGameOver()) return;

  const newRow = player.row + dr;
  const newCol = player.col + dc;

  if (!canMoveTo(newRow, newCol)) return;

  clearActiveSpell();

  player.row = newRow;
  player.col = newCol;

  const enemyTurnSummary = runEnemies();

// ADD THIS LINE
tickBuffDurations(player);

handleTileAfterMove(enemyTurnSummary);
}

/* ============================================================ */
/* SECTION 34 - INPUT HANDLING                                  */
/* Reads keyboard input and moves the player.                   */
/* ============================================================ */
document.addEventListener("keydown", event => {
  if (isGameOver()) return;

  const key = event.key.toLowerCase();
  const move = MOVE_KEYS[key];

  if (!move) return;

  const [dr, dc] = move;
  movePlayer(dr, dc);
});

/* ============================================================ */
/* SECTION 35 - GRID CLICK HANDLING                             */
/* Used for targeted spell casting.                             */
/* ============================================================ */
game.addEventListener("click", event => {
  if (isGameOver()) return;

  const tile = event.target.closest(".tile");
  if (!tile) return;

  const row = Number(tile.dataset.row);
  const col = Number(tile.dataset.col);

  if (Number.isNaN(row) || Number.isNaN(col)) return;

  if (activeSpellId) {
    spellHoverRow = row;
    spellHoverCol = col;
    tryCastActiveSpellAt(row, col);
  }
});

/* ============================================================ */
/* SECTION 36 - PANEL BUTTON EVENTS                             */
/* Close button for the right-side panel.                       */
/* ============================================================ */
closePanelBtn.addEventListener("click", closeRightPanel);
restartGameBtn.addEventListener("click", restartGame);
/* ============================================================ */
/* SECTION 37 - GAME STARTUP                                    */
/* Builds the first floor and draws the UI.                     */
/* ============================================================ */
generateFloor();
updateCharacterPanel();