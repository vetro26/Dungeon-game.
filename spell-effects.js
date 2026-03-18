/* ============================================================ */
/* SECTION 01 - SPELL EFFECT DEFINITIONS                        */
/* Add new modular visual spell effects here.                   */
/* Each effect only controls visuals, not gameplay logic.       */
/* ============================================================ */
const SPELL_EFFECT_DEFINITIONS = {
  manaBoltHit: {
    id: "manaBoltHit",
    duration: 320,
    play(options = {}) {
      const targets = Array.isArray(options.targets) ? options.targets : [];
      const createdNodes = [];

      for (const target of targets) {
        const targetTile = getTileElement(target.row, target.col);
        if (!targetTile) continue;

        const effectNode = createSpellEffectNode("spell-effect spell-effect-mana-bolt-hit");
        effectNode.innerHTML = `
          <div class="spell-effect-core"></div>
          <div class="spell-effect-ring"></div>
        `;

        placeSpellEffectNodeOverTile(effectNode, targetTile, 1.25);
        createdNodes.push(effectNode);
      }

      cleanupSpellEffectNodes(createdNodes, this.duration);
    }
  },

    frostLanceHit: {
    id: "frostLanceHit",
    duration: 340,
    play(options = {}) {
      const targets = Array.isArray(options.targets) ? options.targets : [];
      const createdNodes = [];

      for (const target of targets) {
        const targetTile = getTileElement(target.row, target.col);
        if (!targetTile) continue;

        const effectNode = createSpellEffectNode("spell-effect spell-effect-frost-lance-hit");
        effectNode.innerHTML = `
          <div class="spell-effect-core"></div>
          <div class="spell-effect-ring"></div>
        `;

        placeSpellEffectNodeOverTile(effectNode, targetTile, 1.35);
        createdNodes.push(effectNode);
      }

      cleanupSpellEffectNodes(createdNodes, this.duration);
    }
  },

  chainLightningArc: {
    id: "chainLightningArc",
    duration: 380,
    play(options = {}) {
      const targets = Array.isArray(options.targets) ? options.targets : [];
      const createdNodes = [];

      for (const target of targets) {
        const targetTile = getTileElement(target.row, target.col);
        if (!targetTile) continue;

        const effectNode = createSpellEffectNode("spell-effect spell-effect-chain-lightning-arc");
        effectNode.innerHTML = `
          <div class="spell-effect-core"></div>
          <div class="spell-effect-ring"></div>
        `;

        placeSpellEffectNodeOverTile(effectNode, targetTile, 1.45);
        createdNodes.push(effectNode);
      }

      cleanupSpellEffectNodes(createdNodes, this.duration);
    }
  },

  poisonCloudBurst: {
    id: "poisonCloudBurst",
    duration: 560,
    play(options = {}) {
      const center = options.center || null;
      const targets = Array.isArray(options.targets) ? options.targets : [];
      const createdNodes = [];

      if (center) {
        const centerTile = getTileElement(center.row, center.col);
        if (centerTile) {
          const cloudNode = createSpellEffectNode("spell-effect spell-effect-poison-cloud-center");
          cloudNode.innerHTML = `
            <div class="spell-effect-core"></div>
            <div class="spell-effect-ring"></div>
            <div class="spell-effect-ring spell-effect-ring-delayed"></div>
          `;

          placeSpellEffectNodeOverTile(cloudNode, centerTile, 3.1);
          createdNodes.push(cloudNode);
        }
      }

      for (const target of targets) {
        const targetTile = getTileElement(target.row, target.col);
        if (!targetTile) continue;

        const splashNode = createSpellEffectNode("spell-effect spell-effect-poison-cloud-splash");
        splashNode.innerHTML = `
          <div class="spell-effect-core"></div>
          <div class="spell-effect-ring"></div>
        `;

        placeSpellEffectNodeOverTile(splashNode, targetTile, 1.7);
        createdNodes.push(splashNode);
      }

      cleanupSpellEffectNodes(createdNodes, this.duration);
    }
  },

  fireballExplosion: {
    id: "fireballExplosion",
    duration: 520,
    play(options = {}) {
      const center = options.center || null;
      const targets = Array.isArray(options.targets) ? options.targets : [];
      const createdNodes = [];

      if (center) {
        const centerTile = getTileElement(center.row, center.col);
        if (centerTile) {
          const explosionNode = createSpellEffectNode("spell-effect spell-effect-fireball-center");
          explosionNode.innerHTML = `
            <div class="spell-effect-core"></div>
            <div class="spell-effect-ring"></div>
            <div class="spell-effect-ring spell-effect-ring-delayed"></div>
          `;

          placeSpellEffectNodeOverTile(explosionNode, centerTile, 3.6);
          createdNodes.push(explosionNode);
        }
      }

      for (const target of targets) {
        const targetTile = getTileElement(target.row, target.col);
        if (!targetTile) continue;

        const splashNode = createSpellEffectNode("spell-effect spell-effect-fireball-splash");
        splashNode.innerHTML = `
          <div class="spell-effect-core"></div>
          <div class="spell-effect-ring"></div>
        `;

        placeSpellEffectNodeOverTile(splashNode, targetTile, 1.8);
        createdNodes.push(splashNode);
      }

      cleanupSpellEffectNodes(createdNodes, this.duration);
    }
  }
};

/* ============================================================ */
/* SECTION 02 - EFFECT LAYER HELPERS                            */
/* Creates and manages the shared visual overlay layer.         */
/* ============================================================ */
function ensureSpellEffectLayer() {
  let layer = document.getElementById("spellEffectLayer");

  if (!layer) {
    layer = document.createElement("div");
    layer.id = "spellEffectLayer";
    layer.className = "spell-effect-layer";
    document.body.appendChild(layer);
  }

  return layer;
}

function createSpellEffectNode(className) {
  const node = document.createElement("div");
  node.className = className;
  return node;
}

function getTileElement(row, col) {
  return document.querySelector(`.tile[data-row="${row}"][data-col="${col}"]`);
}

function placeSpellEffectNodeOverTile(node, tileElement, sizeMultiplier = 1) {
  const layer = ensureSpellEffectLayer();
  const rect = tileElement.getBoundingClientRect();
  const baseSize = Math.max(rect.width, rect.height);
  const size = Math.max(18, baseSize * sizeMultiplier);

  node.style.width = `${size}px`;
  node.style.height = `${size}px`;
  node.style.left = `${rect.left + window.scrollX + (rect.width / 2)}px`;
  node.style.top = `${rect.top + window.scrollY + (rect.height / 2)}px`;

  layer.appendChild(node);
}

function cleanupSpellEffectNodes(nodes, delay = 400) {
  window.setTimeout(() => {
    for (const node of nodes) {
      if (node && node.parentNode) {
        node.parentNode.removeChild(node);
      }
    }
  }, delay);
}

/* ============================================================ */
/* SECTION 03 - PUBLIC EFFECT PLAYBACK HELPERS                  */
/* Main helpers used by spells and the main script.             */
/* ============================================================ */
function playSpellEffectById(effectId, options = {}) {
  const definition = SPELL_EFFECT_DEFINITIONS[effectId];

  if (!definition || typeof definition.play !== "function") {
    return;
  }

  definition.play(options);
}

function playSpellResultEffects(spellResult) {
  if (!spellResult || !spellResult.effect || !spellResult.effect.id) {
    return;
  }

  playSpellEffectById(spellResult.effect.id, spellResult.effect);
}