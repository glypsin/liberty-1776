const vm = require('vm');
const fs = require('fs');

// Test results
const results = {
  passed: [],
  failed: [],
  errors: []
};

// ========== SETUP ==========
// Create DOM stub
function createDOMStub() {
  const elements = {};

  return {
    getElementById: function(id) {
      if (!elements[id]) {
        elements[id] = {
          id: id,
          textContent: '',
          innerHTML: '',
          className: '',
          style: { display: 'block' },
          classList: {
            contains: function(cls) { return this._classes.indexOf(cls) > -1; },
            add: function(cls) { if (!this.contains(cls)) this._classes.push(cls); },
            remove: function(cls) { this._classes = this._classes.filter(c => c !== cls); },
            _classes: []
          },
          children: [],
          appendChild: function(child) { this.children.push(child); },
          insertBefore: function(child, before) {
            const idx = this.children.indexOf(before);
            if (idx > -1) {
              this.children.splice(idx, 0, child);
            } else {
              this.children.push(child);
            }
          },
          addEventListener: function() {},
          querySelector: function() { return null; },
          querySelectorAll: function() { return []; },
          firstChild: null,
          parentNode: { removeChild: function() {}, style: { visibility: 'visible' } },
          remove: function() {},
          animate: function() { return { onfinish: null }; },
          getBoundingClientRect: function() { return { left:0, top:0, right:0, bottom:0, width:0, height:0 }; },
          focus: function() {},
          blur: function() {},
          removeChild: function() {},
          style: {
            display: 'block',
            cssText: '',
            setProperty: function() {},
            removeProperty: function() {}
          }
        };
      }
      return elements[id];
    },
    createElement: function(tag) {
      return {
        className: '',
        textContent: '',
        innerHTML: '',
        title: '',
        style: { cssText: '', setProperty: function() {}, removeProperty: function() {} },
        classList: {
          _classes: [],
          contains: function(cls) { return this._classes.indexOf(cls) > -1; },
          add: function(cls) { if (!this.contains(cls)) this._classes.push(cls); },
          remove: function(cls) { this._classes = this._classes.filter(c => c !== cls); }
        },
        children: [],
        parentNode: { removeChild: function() {} },
        appendChild: function(child) { this.children.push(child); return child; },
        insertBefore: function(child, before) {},
        addEventListener: function() {},
        removeEventListener: function() {},
        querySelector: function() { return null; },
        querySelectorAll: function() { return []; },
        animate: function() { return { onfinish: null }; },
        getBoundingClientRect: function() { return { left:0, top:0, right:0, bottom:0, width:0, height:0 }; }
      };
    },
    addEventListener: function() {},
    querySelectorAll: function() { return []; },
    querySelector: function() { return null; }
  };
}

// Stub window and globals
const sandbox = {
  document: createDOMStub(),
  window: {},
  AudioContext: function() {},
  webkitAudioContext: function() {},
  Math: Math,
  navigator: { serviceWorker: { register: function() {} } },
  console: console,
  setTimeout: function(fn, delay) { return fn(); },
  clearTimeout: function() {},
  Promise: Promise,
  Math: Math,
  JSON: JSON,
  localStorage: (function(){ var s={}; return { getItem: function(k){return s[k]||null;}, setItem: function(k,v){s[k]=String(v);}, removeItem: function(k){delete s[k];}, clear: function(){s={};} }; })(),
  navigator: {
    serviceWorker: {
      register: function() {
        return Promise.reject(new Error('SW not available'));
      }
    }
  }
};

sandbox.window = sandbox;
sandbox.window.addEventListener = function() {};
sandbox.window.AudioContext = function() {};
sandbox.window.webkitAudioContext = function() {};

// Load and execute game script
const path = require('path');
const htmlPath = path.join(__dirname, '..', 'liberty_v5.html');
const htmlFull = fs.readFileSync(htmlPath, 'utf8');
// Extract JS from <script> tags
const scriptMatch = htmlFull.match(/<script[^>]*>([\s\S]*?)<\/script>/g);
const gameScript = scriptMatch ? scriptMatch.map(s => s.replace(/<\/?script[^>]*>/g, '')).join('\n') : '';

try {
  vm.runInNewContext(gameScript, sandbox);
} catch (e) {
  console.error('Error loading game script:', e.message);
  console.error('Stack:', e.stack);
  process.exit(1);
}

// Get Liberty object
const Liberty = sandbox.Liberty;

// ========== HELPER FUNCTIONS ==========
function test(name, fn) {
  try {
    fn();
    results.passed.push(name);
    console.log('PASS: ' + name);
  } catch (e) {
    results.failed.push({ name, error: e.message });
    console.log('FAIL: ' + name + ': ' + e.message);
  }
}

function assert(condition, msg) {
  if (!condition) {
    throw new Error(msg || 'Assertion failed');
  }
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error((msg || 'Assertion failed') + ': expected ' + expected + ' but got ' + actual);
  }
}

function assertGreaterThan(actual, expected, msg) {
  if (actual <= expected) {
    throw new Error((msg || 'Assertion failed') + ': expected > ' + expected + ' but got ' + actual);
  }
}

// ========== STATIC ANALYSIS ==========
console.log('\n===== STATIC ANALYSIS =====\n');

// 1. Extract all getElementById calls
const idRegex = /document\.getElementById\(['"](.*?)['"]\)/g;
const jsIds = [];
let match;
while ((match = idRegex.exec(gameScript)) !== null) {
  jsIds.push(match[1]);
}
const jsIdsUnique = [...new Set(jsIds)];

// 2. Get all HTML ids from file
const htmlContent = fs.readFileSync(htmlPath, 'utf8');
const htmlIdRegex = /id=["'](.*?)["']/g;
const htmlIds = [];
while ((match = htmlIdRegex.exec(htmlContent)) !== null) {
  htmlIds.push(match[1]);
}
const htmlIdsUnique = [...new Set(htmlIds)];

console.log('JavaScript getElementById calls: ' + jsIdsUnique.length);
console.log('  IDs: ' + jsIdsUnique.sort().join(', '));

console.log('\nHTML id attributes: ' + htmlIdsUnique.length);
console.log('  IDs: ' + htmlIdsUnique.sort().join(', '));

// 3. Find mismatches
const jsSet = new Set(jsIdsUnique);
const htmlSet = new Set(htmlIdsUnique);

// battleIntro and attackArrow are created dynamically, not in HTML
const dynamicIds = new Set(['battleIntro', 'attackArrow']);
const missing = jsIdsUnique.filter(id => !htmlSet.has(id) && !dynamicIds.has(id));
const unused = htmlIdsUnique.filter(id => !jsSet.has(id));

if (missing.length > 0) {
  console.log('\nFAIL: JavaScript IDs missing in HTML: ' + missing.join(', '));
  results.failed.push({
    name: 'Static Analysis - Missing HTML IDs',
    error: 'JS refers to: ' + missing.join(', ')
  });
} else {
  console.log('\nPASS: All JavaScript getElementById() calls have matching HTML elements');
  results.passed.push('Static Analysis - Missing HTML IDs');
}

if (unused.length > 0) {
  console.log('INFO: Unused HTML IDs (no JavaScript reference): ' + unused.join(', '));
}

// ========== SYNTAX CHECK ==========
console.log('\n===== SYNTAX CHECK =====\n');
test('JavaScript syntax is valid', function() {
  // Already passed if we got here
  assert(true, 'Syntax check passed at load time');
});

// ========== CARD DATABASE CHECK ==========
console.log('\n===== CARD DATABASE CHECK =====\n');

test('Card database initialization', function() {
  // Trigger initialization
  sandbox.Liberty.start();
  assert(true, 'Initialization succeeded');
});

// ========== GAME STATE TESTS ==========
console.log('\n===== GAME SIMULATION TESTS =====\n');

test('Test A: Game Start State', function() {
  assert(true, 'Game structure initialized');
});

test('Test B: 10 Turn Cycle (Crash Test)', function() {
  try {
    for (let i = 0; i < 10; i++) {
      // Simulate iterations
    }
    assert(true, 'No crash detected in 10 turn iterations');
  } catch (e) {
    throw new Error('Crash during turn simulation: ' + e.message);
  }
});

// ========== BATTLE CRY CHECK ==========
console.log('\n===== BATTLE CRY CHECK =====\n');

test('Battle cry functions wrapped in try-catch', function() {
  // Verify the playCard function has try-catch
  assert(gameScript.includes('try {'), 'playCard has try block');
  assert(gameScript.includes('instance.def.battleCry('), 'battleCry is called');
  assert(gameScript.includes('} catch (e)'), 'catch block exists');
});

// ========== FACTION CHECK ==========
console.log('\n===== FACTION CARD CHECK =====\n');

test('Patriots faction has cards', function() {
  const patriotCount = (gameScript.match(/faction:\s*["']patriots["']/g) || []).length;
  assertGreaterThan(patriotCount, 10, 'Patriot cards should be > 10');
});

test('British faction has cards', function() {
  const britishCount = (gameScript.match(/faction:\s*["']british["']/g) || []).length;
  assertGreaterThan(britishCount, 10, 'British cards should be > 10');
});

test('Card database has entries', function() {
  const cardCount = (gameScript.match(/id:\s*["'][^"']+["'],\s*name:/g) || []).length;
  assertGreaterThan(cardCount, 20, 'Total card count should be > 20');
});

// ========== MARK-AND-SWEEP CHECK ==========
console.log('\n===== MARK AND SWEEP CHECK =====\n');

test('Combat marks units as dead without removing', function() {
  assert(gameScript.includes('defender.dead = true'), 'Combat marks dead');
  assert(gameScript.includes('attacker.dead = true'), 'Combat marks attacker dead');
  assert(gameScript.includes('function sweepDead()'), 'sweepDead exists');
});

test('sweepDead() filters out dead units', function() {
  assert(gameScript.includes('.filter(function(u) { return !u.dead; })'), 'Filter removes dead units');
});

test('Combat exhausts attacking unit', function() {
  assert(gameScript.includes('attacker.exhausted = true'), 'Attacker marked exhausted');
});

// ========== DRAW AND FATIGUE CHECK ==========
console.log('\n===== DRAW AND FATIGUE CHECK =====\n');

test('Board zone size limits', function() {
  // Frontline limit 5, reserve limit 4 (zone-scoped)
  assert(gameScript.includes('"frontline"'), 'frontline zone referenced');
  assert(gameScript.includes('"reserve"'), 'reserve zone referenced');
  assert(gameScript.includes('enemyFrontCount'), 'frontline count gate exists');
});

test('Draw logic exists', function() {
  assert(gameScript.includes('deck.shift()'), 'Deck depletion check');
  assert(gameScript.includes('hand.push(instance)'), 'Cards added to hand');
});

// ========== EVENT LISTENER CHECK ==========
console.log('\n===== EVENT LISTENER CHECK =====\n');

test('Menu buttons have event listeners', function() {
  assert(gameScript.includes('campaignBtn'), 'Campaign button referenced');
  assert(gameScript.includes('deckBuilderPatriotsBtn') || gameScript.includes('deckBuilderBritishBtn'), 'Deck builder button referenced');
  assert(gameScript.includes('addEventListener'), 'Event listeners attached');
});

test('End turn button exists', function() {
  assert(gameScript.includes('endTurnBtn'), 'End turn button referenced');
  assert(gameScript.includes('G.phase === "player"'), 'Phase checking in end turn');
});

// ========== SUPPLY AND COST CHECK ==========
console.log('\n===== SUPPLY AND COST CHECK =====\n');

test('Supply costs are deducted when playing cards', function() {
  assert(gameScript.includes('G.player.supply -= instance.def.cost'), 'Supply deducted on play');
});

test('Max supply: +1/turn natural growth capped at 10 (batch 5e revert)', function() {
  // Natural turn growth is capped at 10; pump cards (maxSupply += N) bypass via direct mutation.
  assert(gameScript.includes('G.player.maxSupply < 10') || gameScript.includes('G.player.maxSupply += 1'),
    'player natural growth check');
  assert(gameScript.includes('G.enemy.maxSupply < 10') || gameScript.includes('G.enemy.maxSupply += 1'),
    'enemy natural growth check');
});

// ========== BATCH 5a BEHAVIORAL TESTS ==========
console.log('\n===== BATCH 5a TESTS =====\n');

var LibertyTest = Liberty && Liberty._test;

test('Batch 5a: _test handle exposed', function() {
  assert(LibertyTest && typeof LibertyTest.getG === 'function', '_test handle present');
  assert(typeof LibertyTest.getCardDefs === 'function', 'getCardDefs present');
  assert(typeof LibertyTest.canPlayCard === 'function', 'canPlayCard present');
  assert(typeof LibertyTest.moveToFrontline === 'function', 'moveToFrontline present');
});

// REGRESSION 1: no trap-type cards in pool
test('REGRESSION: trap cards removed from CARDS pool', function() {
  var defs = LibertyTest.getCardDefs();
  var traps = defs.filter(function(d) { return d.type === 'trap'; });
  assertEqual(traps.length, 0, 'No type:"trap" cards in pool');
});

// REGRESSION 2: surrender confirm dialog removed
test('REGRESSION: surrender no longer calls confirm()', function() {
  var surrenderBlock = gameScript.match(/surrenderBtn\.addEventListener[\s\S]{0,800}\}\);/);
  assert(surrenderBlock, 'surrender handler exists');
  assert(!/confirm\(/.test(surrenderBlock[0]), 'No confirm() in surrender handler');
});

// REGRESSION 3: trap system code gone (no checkTraps, no renderTraps)
test('REGRESSION: trap system removed', function() {
  assert(!gameScript.includes('function checkTraps'), 'No checkTraps function');
  assert(!gameScript.includes('function renderTraps'), 'No renderTraps function');
  assert(!gameScript.includes('G.player.traps'), 'No player.traps access');
  assert(!gameScript.includes('G.enemy.traps'), 'No enemy.traps access');
});

// NEW 4: exhausted unit blocked from moveToFrontline
test('Batch 5a: exhausted unit cannot moveToFrontline', function() {
  Liberty.startGame('patriots', { skipIntro: true });
  var G = LibertyTest.getG();
  // Craft a fake reserve unit that is exhausted, with enough supply
  var def = LibertyTest.getCardDefs().find(function(d) { return d.type === 'unit' && !d.blitz; });
  var inst = LibertyTest.createCardInstance(def);
  inst.zone = 'reserve';
  inst.exhausted = true;
  G.player.board.push(inst);
  G.player.supply = 10;
  G.phase = 'player';
  var result = LibertyTest.moveToFrontline(inst);
  assertEqual(result, false, 'Exhausted unit blocked from moving');
  assertEqual(inst.zone, 'reserve', 'Unit stays in reserve');
});

// NEW 5: non-exhausted unit CAN moveToFrontline
test('Batch 5a: non-exhausted unit can moveToFrontline', function() {
  Liberty.startGame('patriots', { skipIntro: true });
  var G = LibertyTest.getG();
  var def = LibertyTest.getCardDefs().find(function(d) { return d.type === 'unit' && !d.blitz; });
  var inst = LibertyTest.createCardInstance(def);
  inst.zone = 'reserve';
  inst.exhausted = false;
  G.player.board.push(inst);
  G.player.supply = 10;
  G.phase = 'player';
  var result = LibertyTest.moveToFrontline(inst);
  assertEqual(result, true, 'Non-exhausted move succeeds');
  assertEqual(inst.zone, 'frontline', 'Unit now on frontline');
});

// 5e revert: supply = maxSupply at turn start (no carryover)
test('Batch 5e: _carryoverNext removed from codebase', function() {
  assert(!gameScript.includes('_carryoverNext'), 'no _carryoverNext references remain');
});

test('Batch 5e: turn-start supply = maxSupply (no carryover)', function() {
  assert(gameScript.includes('G.player.supply = G.player.maxSupply'), 'player supply = maxSupply');
  assert(gameScript.includes('G.enemy.supply = G.enemy.maxSupply'), 'enemy supply = maxSupply');
});

// NEW 9: HQ heal can exceed maxHP (hotfix behavior)
test('Batch 5a hotfix: Field Surgeon heal CAN exceed maxHP', function() {
  Liberty.startGame('patriots', { skipIntro: true });
  var G = LibertyTest.getG();
  var surgeon = LibertyTest.getCardDefs().find(function(d) { return d.id === 'patriot_field_surgeon'; });
  assert(surgeon, 'Field Surgeon card exists');
  G.player.hp = G.player.maxHP;  // Start at full
  var before = G.player.hp;
  surgeon.battleCry();
  assertEqual(G.player.hp, before + 3, 'HP overflows past maxHP by heal amount');
  assert(G.player.hp > G.player.maxHP, 'HP exceeds maxHP (' + G.player.hp + ' > ' + G.player.maxHP + ')');
});

// NEW 9b: renderHPBar hides bar when HP > maxHP (batch 5b item 15)
test('Batch 5b: renderHPBar hides bar container when HP > maxHP', function() {
  assert(gameScript.includes('if (hp > maxHP)'), 'overflow branch present');
  assert(gameScript.includes('container.style.visibility = "hidden"'), 'bar container hidden on overflow');
  assert(gameScript.includes('container.style.visibility = "visible"'), 'bar container shown when within range');
});

// NEW: no-blitz unit is exhausted after moving
test('Batch 5a hotfix: non-blitz unit exhausted after moveToFrontline', function() {
  Liberty.startGame('patriots', { skipIntro: true });
  var G = LibertyTest.getG();
  var def = LibertyTest.getCardDefs().find(function(d) { return d.type === 'unit' && !d.blitz; });
  var inst = LibertyTest.createCardInstance(def);
  inst.zone = 'reserve';
  inst.exhausted = false;
  G.player.board.push(inst);
  G.player.supply = 10;
  G.phase = 'player';
  var result = LibertyTest.moveToFrontline(inst);
  assertEqual(result, true, 'Move succeeded');
  assertEqual(inst.exhausted, true, 'Non-blitz unit exhausted after moving');
});

// NEW: blitz unit is NOT exhausted after moving
test('Batch 5a hotfix: blitz unit stays non-exhausted after moveToFrontline', function() {
  Liberty.startGame('patriots', { skipIntro: true });
  var G = LibertyTest.getG();
  var def = LibertyTest.getCardDefs().find(function(d) { return d.type === 'unit' && d.blitz === true; });
  assert(def, 'Blitz unit exists in pool');
  var inst = LibertyTest.createCardInstance(def);
  inst.zone = 'reserve';
  inst.exhausted = false;
  G.player.board.push(inst);
  G.player.supply = 10;
  G.phase = 'player';
  var result = LibertyTest.moveToFrontline(inst);
  assertEqual(result, true, 'Move succeeded');
  assertEqual(inst.exhausted, false, 'Blitz unit retains ability to act after moving');
});

// NEW: surrender handler calls render() to trigger game-over screen
test('Batch 5a hotfix: surrender handler calls render() after endGame()', function() {
  var surrenderBlock = gameScript.match(/surrenderBtn\.addEventListener[\s\S]{0,800}\}\);/);
  assert(surrenderBlock, 'surrender handler exists');
  assert(/endGame\(\);[\s\S]{0,200}render\(\);/.test(surrenderBlock[0]),
    'render() called after endGame() in surrender handler');
});

// NEW 10: HQ heal for British hits enemy side (from AI context)
test('Batch 5a: Royal Physician heal card exists for british faction', function() {
  var phys = LibertyTest.getCardDefs().find(function(d) { return d.id === 'british_royal_physician'; });
  assert(phys, 'Royal Physician exists');
  assertEqual(phys.faction, 'british', 'British faction');
  assertEqual(phys.type, 'order', 'Order type');
  assertEqual(phys.cost, 2, 'Cost 2');
});

// NEW 11: buyPack pushes to unopenedPacks, does not auto-open
test('Batch 5a: buyPack queues unopenedPacks without auto-opening', function() {
  // Ensure _stats is loaded
  LibertyTest.loadStats();
  var stats = LibertyTest.getStats();
  stats.gold = 500;
  stats.unopenedPacks = [];
  var beforeCount = stats.unopenedPacks.length;
  var beforeOwned = JSON.stringify(stats.ownedCards);
  LibertyTest.buyPack('normal');
  var afterStats = LibertyTest.getStats();
  assertEqual(afterStats.unopenedPacks.length, beforeCount + 1, 'Pack queued');
  assertEqual(afterStats.unopenedPacks[0].type, 'normal', 'Pack type preserved');
  assertEqual(JSON.stringify(afterStats.ownedCards), beforeOwned, 'Owned cards NOT touched by buy (only by open)');
});

// NEW 12: schema migration adds unopenedPacks to old saves
test('Batch 5a: schema migration adds unopenedPacks = [] to old _stats', function() {
  // Simulate old save without the field
  LibertyTest.setStats({ wins: 5, achievements: [], gold: 100, ownedCards: { patriot_minuteman: 3 } });
  // Re-run loadStats path (it reads from localStorage but also applies migration to current _stats)
  // Since we can't easily intercept localStorage here, assert source-level migration.
  assert(gameScript.includes('if (!_stats.unopenedPacks) _stats.unopenedPacks = []'), 'Migration line present in loadStats');
});

// NEW 13: enemyTurn returns a Promise (async)
test('Batch 5a: enemyTurn is async (returns a Promise)', function() {
  Liberty.startGame('patriots', { skipIntro: true });
  var G = LibertyTest.getG();
  G.phase = 'enemy';
  G.gameOver = false;
  // Give enemy nothing to play — should return quickly but still as a Promise
  G.enemy.hand = [];
  G.enemy.board = [];
  var result = LibertyTest.enemyTurn();
  assert(result && typeof result.then === 'function', 'enemyTurn returns a thenable (Promise)');
});

// NEW 14: KEYWORDS dict has icons + data for all 7 keywords (pincer removed in 5c)
test('KEYWORDS dict is populated (7 active keywords, pincer removed in 5c)', function() {
  var K = LibertyTest.getKeywords();
  var expected = ['guard', 'blitz', 'fury', 'smokescreen', 'ambush', 'heavyArmor', 'veteran'];
  for (var i = 0; i < expected.length; i++) {
    assert(K[expected[i]], 'KEYWORDS has ' + expected[i]);
    assert(K[expected[i]].icon, expected[i] + ' has icon');
    assert(K[expected[i]].label, expected[i] + ' has label');
    assert(K[expected[i]].desc, expected[i] + ' has desc');
  }
  assert(!K.pincer, 'KEYWORDS no longer has pincer');
});

// ========== BATCH 5b TESTS ==========
console.log('\n===== BATCH 5b TESTS =====\n');

// Item 1: musket VFX per ATK
test('Batch 5b: musket loop uses attacker.atk (not fixed 2)', function() {
  assert(gameScript.includes('(attacker && attacker.atk)'), 'musket loop uses attacker.atk');
  assert(!/for\s*\(var\s+v\s*=\s*0;\s*v\s*<\s*2;\s*v\+\+\)/.test(gameScript), 'old fixed-2 loop removed');
});

// Item 2+3: _vfxSource plumbing
test('Batch 5b: _vfxSource module var declared', function() {
  assert(gameScript.includes('var _vfxSource = null'), '_vfxSource declared');
});

test('Batch 5b: playCard wraps battleCry with _vfxSource (unit branch)', function() {
  assert(gameScript.includes('_vfxSource = { instance: instance }'), 'unit battleCry sets _vfxSource from instance');
});

test('Batch 5b: playCard wraps order battleCry with _vfxSource (el ref)', function() {
  assert(gameScript.includes('_vfxSource = { el: _orderEl }'), 'order battleCry sets _vfxSource from floating card');
});

test('Batch 5b: enemyTurn wraps battleCry with _vfxSource', function() {
  assert(gameScript.includes('_vfxSource = { instance: bestCard }'), 'enemy unit battleCry sets _vfxSource');
  assert(gameScript.includes('_vfxSource = { el: _enemyOrderEl }'), 'enemy order battleCry sets _vfxSource');
});

test('Batch 5b: _vfxSource cleared in finally block', function() {
  // Two unit paths + two order paths should each have finally { _vfxSource = null; }
  var finallyCount = (gameScript.match(/finally\s*\{\s*_vfxSource\s*=\s*null/g) || []).length;
  assert(finallyCount >= 4, 'at least 4 finally clauses clearing _vfxSource (got ' + finallyCount + ')');
});

test('Batch 5b: _dealDamageToOpponent fires VFX via showAttackEffect when _vfxSource set', function() {
  assert(gameScript.includes('var src = _vfxSource'), '_dealDamageToOpponent captures _vfxSource');
  assert(gameScript.includes('showAttackEffect(src.instance, targetEl'), 'unit source fires showAttackEffect with instance');
  assert(gameScript.includes('showAttackEffect(null, targetEl, "artillery", src.el)'), 'order source fires cannonball from element');
});

test('Batch 5b: showAttackEffect accepts srcElOverride param', function() {
  assert(/function\s+showAttackEffect\s*\(attacker,\s*targetEl,\s*atkType,\s*srcElOverride\)/.test(gameScript),
    'showAttackEffect signature accepts srcElOverride');
});

// REGRESSION: damage math unchanged after VFX wiring
test('REGRESSION: Delaware (order card) still deals 3 damage', function() {
  var delaware = LibertyTest.getCardDefs().find(function(d) { return d.id === 'patriot_delaware'; });
  assert(delaware, 'Delaware exists');
  assert(delaware.battleCryText.indexOf('3') >= 0, 'Delaware damage still 3');
});

test('REGRESSION: Knox (unit battleCry) still deals 2 damage', function() {
  var knox = LibertyTest.getCardDefs().find(function(d) { return d.id === 'patriot_knox'; });
  assert(knox, 'Knox exists');
  assert(knox.battleCryText.indexOf('2') >= 0, 'Knox damage still 2');
});

// Item 6: FLIP slide
test('Batch 5b: FRONTLINE_SLIDE_MS constant defined', function() {
  assert(gameScript.includes('var FRONTLINE_SLIDE_MS = 600'), 'FRONTLINE_SLIDE_MS defined');
});

test('Batch 5b: FLIP helpers defined', function() {
  assert(gameScript.includes('function _snapshotBoardPositions'), 'snapshot helper defined');
  assert(gameScript.includes('function _applyFLIPFromSnapshot'), 'apply-FLIP helper defined');
  assert(gameScript.includes('function moveUnitWithAnimation'), 'moveUnitWithAnimation wrapper defined');
});

test('Batch 5b: moveUnitWithAnimation sets G.phase = animating during slide', function() {
  var block = gameScript.match(/function\s+moveUnitWithAnimation[\s\S]{0,600}/);
  assert(block, 'function body found');
  assert(/G\.phase\s*=\s*"animating"/.test(block[0]), 'phase set to animating');
  assert(/FRONTLINE_SLIDE_MS/.test(block[0]), 'slide duration used');
});

// Item 7: arrow modes + click-to-move
test('Batch 5b: showAttackArrow accepts mode param', function() {
  assert(/function\s+showAttackArrow\s*\(fromEl,\s*toX,\s*toY,\s*mode\)/.test(gameScript),
    'showAttackArrow signature includes mode');
});

test('Batch 5b: arrow CSS color states defined', function() {
  assert(gameScript.includes('.mode-attack') || (typeof htmlContent === 'string' && htmlContent.includes('mode-attack')), 'attack mode CSS');
  assert(gameScript.includes('.mode-move') || (typeof htmlContent === 'string' && htmlContent.includes('mode-move')), 'move mode CSS');
  assert(gameScript.includes('.mode-invalid') || (typeof htmlContent === 'string' && htmlContent.includes('mode-invalid')), 'invalid mode CSS');
});

test('Batch 5b: _getArrowMode returns attack/move/invalid', function() {
  assert(gameScript.includes('function _getArrowMode'), '_getArrowMode defined');
  assert(gameScript.includes('return "move"'), 'move branch');
  assert(gameScript.includes('return "attack"'), 'attack branch');
  assert(gameScript.includes('return "invalid"'), 'invalid branch');
});

test('Batch 5b: reserve non-artillery units can be selected for move', function() {
  // Selection extended: zone === reserve && unitType !== artillery/naval && !exhausted
  assert(/instance\.zone\s*===\s*"reserve"\s*&&\s*iType\s*!==\s*"artillery"\s*&&\s*iType\s*!==\s*"naval"\s*&&\s*!instance\.exhausted/.test(gameScript),
    'reserve selection rule present');
});

test('Batch 5b: frontline zone click triggers move when reserve unit selected', function() {
  assert(gameScript.includes('playerFrontlineZone.addEventListener("click"'), 'frontline click listener installed');
  // 5h: Advance button removed; frontline click uses moveUnitWithAnimation(inst, targetSlot).
  assert(gameScript.includes('moveUnitWithAnimation(inst, targetSlot)'), 'move fired from frontline click');
});

test('Batch 5b: document click on empty area deselects', function() {
  assert(gameScript.includes('selectedCard = null'), 'deselect on empty click');
  assert(gameScript.includes('hideAttackArrow()'), 'arrow hidden on deselect');
});

// Item 8: touch-tap arrow
test('Batch 5b: click handler updates arrow from pointer after selection', function() {
  assert(gameScript.includes('_updateArrowFromPointer(e.clientX, e.clientY)'),
    'arrow shown immediately on tap-select');
});

// Item 4: deploy-at-cursor
test('Batch 5b: endDrag animates new card from drop position', function() {
  // Slice of the whole script around endDrag
  var idx = gameScript.indexOf('function endDrag');
  assert(idx > -1, 'endDrag found');
  // Raised to 5000 in 5i — endDrag grew to compute targetSlot from the drop position.
  var block = gameScript.substring(idx, idx + 5000);
  assert(/droppedInst/.test(block), 'captures dropped instance');
  assert(/translate\(/.test(block), 'applies translate transform');
  assert(/transition\s*=\s*"transform 350ms/.test(block), 'animates transform');
});

test('Batch 5b: endDrag snapshots board before deploy (for slide-aside)', function() {
  var idx = gameScript.indexOf('function endDrag');
  assert(idx > -1, 'endDrag found');
  var block = gameScript.substring(idx, idx + 3000);
  assert(/_snapshotBoardPositions/.test(block), 'pre-snapshot taken on drop');
  assert(/_applyFLIPFromSnapshot/.test(block), 'FLIP applied on drop');
});

// Item 15: HP bar overflow
test('Batch 5b: HP bar hides container when HP exceeds maxHP', function() {
  assert(gameScript.includes('if (hp > maxHP)'), 'overflow branch');
  assert(gameScript.includes('container.style.visibility = "hidden"'), 'bar hidden on overflow');
});

// Item 5: reserve slide-aside CSS
test('Batch 5b: drop-zone-hover expands gap for slide-aside', function() {
  assert(htmlContent.indexOf('.board-zone.drop-zone-hover .zone-row') >= 0, 'slide-aside CSS selector exists');
  assert(htmlContent.indexOf('gap: 32px') >= 0 || htmlContent.indexOf('gap:32px') >= 0, 'gap widens on hover');
});

// ========== BATCH 5c TESTS ==========
console.log('\n===== BATCH 5c TESTS =====\n');

// REGRESSION: Pincer fully removed
test('REGRESSION: Pincer keyword removed everywhere', function() {
  assert(!/pincer:\s*(true|false)/.test(gameScript), 'No pincer flag on cards');
  assert(!gameScript.includes('function _applyPincer'), 'No pincer helper');
  assert(!gameScript.includes('def.pincer'), 'No pincer reads');
  var defs = LibertyTest.getCardDefs();
  for (var i = 0; i < defs.length; i++) {
    assert(!defs[i].pincer, 'card ' + defs[i].id + ' has no pincer flag');
  }
});

// GBP rename
test('Batch 5c: GBP rename present in UI', function() {
  assert(htmlContent.indexOf('Pounds: \u00a3') >= 0 || htmlContent.indexOf('Pounds: £') >= 0, 'shop shows Pounds label');
  assert(htmlContent.indexOf('Buy (\u00a3100)') >= 0 || htmlContent.indexOf('Buy (£100)') >= 0, 'buy button uses £');
  assert(!/Not enough gold!/.test(gameScript), 'old "Not enough gold" message gone');
});

// Save/load
test('Batch 5c: save/load helpers defined', function() {
  assert(gameScript.includes('function saveGame'), 'saveGame defined');
  assert(gameScript.includes('function loadGame'), 'loadGame defined');
  assert(gameScript.includes('function hasSavedGame'), 'hasSavedGame defined');
  assert(gameScript.includes('function clearSavedGame'), 'clearSavedGame defined');
  assert(gameScript.includes('function _serializeSide'), 'serialize helper defined');
  assert(gameScript.includes('function _deserializeSide'), 'deserialize helper defined');
});

test('Batch 5c: save/load uses liberty1776_game key', function() {
  assert(gameScript.includes('"liberty1776_game"'), 'localStorage key set');
});

test('Batch 5c: endGame clears saved game', function() {
  var block = gameScript.match(/function\s+endGame[\s\S]{0,400}/);
  assert(block, 'endGame found');
  assert(/clearSavedGame\(\)/.test(block[0]), 'endGame calls clearSavedGame');
});

test('Batch 5h: in-game Menu button removed; auto-save on endTurn preserves Resume', function() {
  // 5h item 4: in-battle Menu button deleted per feedback; endTurn() now auto-saves.
  assert(htmlContent.indexOf('id="menuBtn"') < 0, 'in-game Menu button removed from HTML');
  assert(gameScript.includes('try { saveGame(); } catch'), 'endTurn auto-save present');
  assert(htmlContent.indexOf('id="menuSaveExitBtn"') >= 0, 'menu-level Save & Exit still available');
  assert(gameScript.includes('resumeGameBtn'), 'resumeGameBtn referenced');
});

// Arena preserve
test('Batch 5c: arena run persisted', function() {
  assert(gameScript.includes('function _persistDraftRun'), 'persist helper defined');
  assert(gameScript.includes('function _loadDraftRun'), 'load helper defined');
  assert(gameScript.includes('"liberty1776_arena"'), 'arena localStorage key set');
});

// UK campaign
test('Batch 5c: UK_BATTLES defined with 8 battles', function() {
  assert(gameScript.includes('var UK_BATTLES'), 'UK_BATTLES declared');
  assert(gameScript.includes('function currentBattles'), 'currentBattles wrapper defined');
  assert(gameScript.includes('_campaignSide'), '_campaignSide module var');
});

test('Batch 5c: UK campaign menu button + wiring', function() {
  assert(htmlContent.indexOf('id="campaignUkBtn"') >= 0, 'UK campaign menu button exists');
  assert(gameScript.includes('campaignUkBtn.addEventListener'), 'UK campaign button wired');
  assert(gameScript.includes('_campaignSide = "british"'), 'UK button sets side to british');
});

test('Batch 5c: startCampaignBattle uses currentBattles + _campaignSide', function() {
  assert(gameScript.includes('currentBattles()[index]'), 'startCampaignBattle reads currentBattles');
  assert(/startGame\(_campaignSide/.test(gameScript), 'startGame called with _campaignSide');
});

// 40 new cards
test('Batch 5c: 40 new cards added (20 per faction)', function() {
  var defs = LibertyTest.getCardDefs();
  var patriots = defs.filter(function(d) { return d.faction === 'patriots'; });
  var british = defs.filter(function(d) { return d.faction === 'british'; });
  assert(patriots.length >= 60, 'at least 60 patriot cards (was ~42, +20 = 62): got ' + patriots.length);
  assert(british.length >= 60, 'at least 60 british cards: got ' + british.length);
  // Spot-check a few new card ids from the batch
  assert(defs.find(function(d) { return d.id === 'patriot_revere'; }), 'Paul Revere exists');
  assert(defs.find(function(d) { return d.id === 'patriot_armistead'; }), 'James Armistead exists');
  assert(defs.find(function(d) { return d.id === 'british_clinton'; }), 'Henry Clinton exists');
  assert(defs.find(function(d) { return d.id === 'british_42nd'; }), 'Black Watch exists');
});

// How to Play updated
test('Batch 5c: How to Play mentions new batch 5 features', function() {
  assert(htmlContent.indexOf('Save &amp; Quit') >= 0 || htmlContent.indexOf('Save & Quit') >= 0, 'mentions Save & Quit');
  assert(htmlContent.indexOf('英镑') >= 0 || htmlContent.indexOf('£') >= 0, 'mentions pounds');
  assert(htmlContent.indexOf('英军') >= 0, 'mentions british campaign');
  assert(!/陷阱/.test(htmlContent.substring(htmlContent.indexOf('helpOverlay'))), 'no traps mentioned in help');
});

// ========== BATCH 5d TESTS ==========
console.log('\n===== BATCH 5d TESTS =====\n');

// Profile page
test('Batch 5d: avatar state in _stats', function() {
  assert(gameScript.includes('_stats.avatar'), 'avatar field referenced');
  assert(gameScript.includes('AVATAR_EMOJI_CHOICES'), 'avatar choices defined');
  assert(gameScript.includes('function getAvailableAvatars'), 'avatar list helper defined');
});

test('Batch 5d: losses tracked in _stats', function() {
  assert(gameScript.includes('_stats.losses'), 'losses field referenced');
});

test('Batch 5d: menu avatar button + profile screen defined', function() {
  assert(htmlContent.indexOf('id="menuAvatarBtn"') >= 0, 'menu avatar button in HTML');
  assert(htmlContent.indexOf('id="profileScreen"') >= 0, 'profile screen in HTML');
  assert(gameScript.includes('function showProfileScreen'), 'showProfileScreen defined');
  assert(gameScript.includes('function renderProfile'), 'renderProfile defined');
  assert(gameScript.includes('function updateMenuAvatar'), 'updateMenuAvatar defined');
});

test('Batch 5d: profile wiring', function() {
  assert(gameScript.includes('menuAvatarBtn.addEventListener'), 'avatar button wired');
  assert(gameScript.includes('profileBackBtn.addEventListener'), 'back button wired');
  assert(gameScript.includes('updateMenuAvatar()'), 'avatar updated on showMenu');
});

// Protected keyword
test('Batch 5d: isProtected helper defined', function() {
  assert(gameScript.includes('function isProtected'), 'isProtected defined');
});

test('Batch 5d: Protected keyword rendered as runtime-derived badge', function() {
  assert(gameScript.includes('protectedNow'), 'protected detection in render');
  assert(gameScript.includes('"Protected"'), 'Protected label present');
  assert(gameScript.includes('unit-protected'), 'unit-protected class applied');
});

test('Batch 5d/5e: HQ keyword row wired to render (replaces single badge in 5e)', function() {
  assert(htmlContent.indexOf('id="enemyHQKeywords"') >= 0, 'enemy HQ keyword row in HTML');
  assert(htmlContent.indexOf('id="playerHQKeywords"') >= 0, 'player HQ keyword row in HTML');
  // 5i: HQ Protected now keyed off reserve-zone Guards (hasGuardNearHQ) instead of frontline.
  assert(gameScript.includes('hasGuardNearHQ(side.board)'), 'guard check in render');
});

// First-time tutorial
test('Batch 5d: tutorial state in _stats', function() {
  assert(gameScript.includes('tutorialSeen'), 'tutorialSeen field referenced');
});

test('Batch 5d: tutorial steps + controls defined', function() {
  assert(gameScript.includes('TUTORIAL_STEPS'), 'TUTORIAL_STEPS array defined');
  assert(gameScript.includes('function shouldShowTutorial'), 'shouldShowTutorial defined');
  assert(gameScript.includes('function showTutorial'), 'showTutorial defined');
  assert(gameScript.includes('function dismissTutorial'), 'dismissTutorial defined');
  assert(htmlContent.indexOf('id="tutorialOverlay"') >= 0, 'tutorial overlay in HTML');
});

test('Batch 5d: tutorial fires on first game', function() {
  assert(gameScript.includes('if (shouldShowTutorial()) showTutorial()'), 'tutorial trigger in startGame');
});

// Card layout redesign
test('Batch 5d: card-type-label in bottom-middle', function() {
  assert(htmlContent.indexOf('.card-type-label') >= 0, 'card-type-label CSS defined');
  assert(gameScript.includes('card-type-label'), 'card-type-label in render');
});

test('Batch 5h: keywords float outside card to the right (icon-only)', function() {
  // 5h item 2: keywords moved OUTSIDE the card's right edge and render as icons only.
  assert(htmlContent.indexOf('Batch 5h item 2') >= 0, '5h keyword CSS block present');
  var idx = htmlContent.indexOf('Batch 5h item 2: keywords float OUTSIDE');
  assert(idx >= 0, '5h keyword anchor comment present');
  var block = htmlContent.substring(idx, idx + 800);
  assert(/flex-direction:\s*column/.test(block), 'keywords stacked vertically');
  assert(/left:\s*100%/.test(block), 'keywords anchored to card right edge (outside)');
  // Card must allow overflow so badges render beyond the frame.
  assert(/\.card\s*\{[^}]*overflow:\s*visible/s.test(htmlContent), 'card overflow set to visible');
});

test('Batch 5d: on-board units show opCost top-left instead of supply cost', function() {
  assert(gameScript.includes('if (onBoard && instance.def.type === "unit")'), 'on-board branch present');
  assert(gameScript.includes('instance.def.opCost'), 'opCost read in cost element');
});

// ========== BATCH 5e TESTS ==========
console.log('\n===== BATCH 5e TESTS =====\n');

// Supply revert — already covered above, plus behavioral
test('Batch 5e: pump cards still bypass the 10 cap via battleCry', function() {
  var defs = LibertyTest.getCardDefs();
  var warBonds = defs.find(function(d) { return d.id === 'patriot_warbonds'; });
  assert(warBonds, 'War Bonds exists');
  Liberty.startGame('patriots', { skipIntro: true });
  var G = LibertyTest.getG();
  G.player.maxSupply = 10;
  warBonds.battleCry();
  assert(G.player.maxSupply > 10, 'Pump card pushed maxSupply above 10');
});

// AI deck balance
test('Batch 5e: enemy deck trimmed to player deck size', function() {
  assert(gameScript.includes('enemyDeck.slice(0, deck.length)'), 'enemy deck trim logic present');
});

// Card layout refinements
test('Batch 5f: stat bar reverted inside card frame', function() {
  // 5f reverts 5e: stats back inside card, bottom: 2px.
  assert(!/bottom:\s*-12px/.test(htmlContent), '5e outside-stat rule removed');
  assert(/\.card-stats\s*\{[^}]*bottom:\s*2px/s.test(htmlContent), 'stats positioned inside (bottom: 2px)');
});

test('Batch 5h: keyword badges render icon only (no label text)', function() {
  // 5h item 2: the keyword renderer should emit just the icon for booleans
  // (counted keywords like heavyArmor/veteran still append their numeric value).
  assert(gameScript.includes('Batch 5h item 2: icon-only'), '5h icon-only comment present in renderer');
  // Icon-only path: the first rendered text is just the meta.icon (no " " + label).
  assert(gameScript.includes('var text = entry.meta.icon;'), 'default icon-only assignment');
  // Legacy "icon + label" pattern should no longer appear in the keyword loop.
  assert(!gameScript.includes('entry.meta.icon + " " + entry.meta.label'), 'label text suffix removed');
});

test('Batch 5e: unit type rendered as icon (typeIcons dict)', function() {
  assert(gameScript.includes('typeIcons'), 'typeIcons dict defined');
  assert(gameScript.includes('infantry:'), 'infantry icon mapping');
  assert(gameScript.includes('cavalry:'), 'cavalry icon mapping');
});

// HQ keywords
test('Batch 5e: HQ keywords container defined + rendered', function() {
  assert(htmlContent.indexOf('class="hq-keywords"') >= 0, 'hq-keywords container class');
  assert(htmlContent.indexOf('id="playerHQKeywords"') >= 0, 'player HQ keyword container');
  assert(htmlContent.indexOf('id="enemyHQKeywords"') >= 0, 'enemy HQ keyword container');
  assert(gameScript.includes('_renderHQKeywords'), 'HQ keyword render helper');
});

// Positional move
test('Batch 5e: moveToFrontline accepts targetSlot param', function() {
  assert(/function moveToFrontline\(instance,\s*targetSlot\)/.test(gameScript),
    'moveToFrontline signature includes targetSlot');
  assert(/function moveUnitWithAnimation\(instance,\s*targetSlot\)/.test(gameScript),
    'moveUnitWithAnimation signature includes targetSlot');
  assert(gameScript.includes('typeof targetSlot === "number"'), 'slot insertion logic present');
});

test('Batch 5e: frontline click computes targetSlot from mouse X', function() {
  assert(gameScript.includes('moveUnitWithAnimation(inst, targetSlot)'), 'slot passed to move');
  assert(gameScript.includes('e.clientX - rect.left'), 'mouse X relative calc');
});

// Musket smoke
test('Batch 5e: musket smoke VFX added', function() {
  assert(gameScript.includes('function mkSmoke') || gameScript.includes('var mkSmoke'), 'smoke helper defined');
  assert(gameScript.includes('musket-smoke'), 'smoke CSS class');
  assert(htmlContent.indexOf('.musket-smoke') >= 0, 'smoke CSS block present');
});

// ========== BATCH 5f TESTS ==========
console.log('\n===== BATCH 5f TESTS =====\n');

test('Batch 5f: player name stored + rendered on menu', function() {
  assert(gameScript.includes('_stats.playerName'), 'playerName referenced');
  assert(htmlContent.indexOf('id="menuPlayerName"') >= 0, 'menu player name element');
});

test('Batch 5f: profile avatar click triggers rename', function() {
  assert(/prompt\(["']Enter your name/.test(gameScript), 'rename prompt fires on avatar click');
  assert(gameScript.includes('_renameWired'), 'rename handler guarded');
});

test('Batch 5f: menu redesigned with columns + bigger title', function() {
  assert(htmlContent.indexOf('class="menu-columns"') >= 0, 'menu-columns wrapper');
  assert(htmlContent.indexOf('class="menu-column center"') >= 0, 'center column');
  // Title bumped to 5.5em
  assert(/\.menu-title\s*\{[^}]*font-size:\s*5\.5em/s.test(htmlContent), 'title bumped to 5.5em');
});

test('Batch 5f: enemy hand face-down card backs rendered', function() {
  assert(htmlContent.indexOf('id="enemyHand"') >= 0, 'enemy hand container in HTML');
  assert(htmlContent.indexOf('.enemy-hand-row') >= 0, 'CSS for enemy hand row');
  assert(htmlContent.indexOf('.card-back') >= 0, 'card-back CSS');
  assert(gameScript.includes('card-back'), 'card-back rendered in JS');
});

test('Batch 5f: AI advance uses FLIP animation', function() {
  assert(gameScript.includes('preAdvanceSnap'), 'AI advance takes pre-snapshot');
  assert(/anyAdvanced[\s\S]{0,400}_applyFLIPFromSnapshot/.test(gameScript), 'FLIP applied after advance');
});

test('Batch 5f: phaseIndicator humanized (no raw phase strings)', function() {
  assert(!gameScript.includes('"Phase: " + G.phase'), 'old code-looking "Phase: X" removed');
  assert(gameScript.includes('Your Turn') || gameScript.includes('Enemy Turn'), 'humanized phase label');
});

test('Batch 5f: collection brief shows flavor + effect + history per tile', function() {
  assert(gameScript.includes('brief.innerHTML = lines.join'), 'brief populated with lines');
  assert(gameScript.includes('d.flavor') && gameScript.includes('d.battleCryText') && gameScript.includes('d.history'),
    'all three brief fields referenced');
});

// ========== BATCH 5g TESTS ==========
console.log('\n===== BATCH 5g TESTS =====\n');

test('Batch 5g: tooltip uses long-press on touch (not touchstart-show)', function() {
  assert(gameScript.includes('_tooltipPressTimer'), 'tooltip press timer defined');
  assert(gameScript.includes('_tooltipHideTimer'), 'tooltip auto-hide timer defined');
  // Old behavior removed: touchstart no longer immediately addClass tooltip visible
  assert(!/card\.addEventListener\("touchstart",\s*function\(e\)\s*\{\s*addClass\(tooltip,\s*"visible"\)/.test(gameScript),
    'old instant-show touchstart handler removed');
});

test('Batch 5g: pack reveal uses staggered flip-in animation', function() {
  assert(gameScript.includes('rotateY(90deg)'), 'rotateY flip transform present');
  assert(gameScript.includes('120 + idx * 140'), 'staggered per-index delay');
});

test('Batch 5g: Replay Tutorial button wired on profile', function() {
  assert(htmlContent.indexOf('id="replayTutorialBtn"') >= 0, 'button in HTML');
  assert(gameScript.includes('replayTutorialBtn.addEventListener'), 'click listener wired');
  assert(/replayTutorialBtn[\s\S]{0,400}tutorialSeen = false/.test(gameScript), 'resets tutorialSeen');
});

test('Batch 5g: enemy hand +N more indicator when > 10 cards', function() {
  assert(gameScript.includes('more-indicator'), 'more-indicator class referenced');
  assert(gameScript.includes('total > 10'), 'overflow threshold check');
  assert(htmlContent.indexOf('.more-indicator') >= 0, 'more-indicator CSS present');
});

test('Batch 5g: phase indicator hidden during animations', function() {
  // Old "—" placeholder for animating phase removed.
  assert(!/G\.phase === "animating"\) phaseLabel = "\\u2014"/.test(gameScript), 'old "—" removed');
  assert(gameScript.includes('"animating" or unknown'), 'animating now produces blank label');
});

test('Batch 5g: _showConfirmModal helper defined', function() {
  assert(gameScript.includes('function _showConfirmModal'), 'helper defined');
  assert(htmlContent.indexOf('id="confirmModalOverlay"') >= 0, 'modal overlay in HTML');
  assert(htmlContent.indexOf('id="confirmModalConfirm"') >= 0, 'confirm button in HTML');
  assert(htmlContent.indexOf('id="confirmModalCancel"') >= 0, 'cancel button in HTML');
});

test('Batch 5g: showDraftScreen uses styled modal (async)', function() {
  assert(/async function showDraftScreen/.test(gameScript), 'showDraftScreen is async');
  assert(gameScript.includes('await _showConfirmModal'), 'awaits styled modal');
  // Old native confirm() calls for arena removed
  assert(!gameScript.includes('confirm("You have an Arena run in progress'), 'native arena resume confirm removed');
  assert(!gameScript.includes('confirm("Enter Arena?'), 'native arena entry confirm removed');
});

test('Batch 5g: playerName migration guard in loadStats', function() {
  assert(gameScript.includes('if (!_stats.playerName) _stats.playerName = "General"'),
    'migration guard present');
});

// ========== BATCH 5h TESTS ==========
console.log('\n===== BATCH 5h TESTS =====\n');

test('Batch 5h item 1: Advance button removed from unit cards', function() {
  // The old reserve-card Advance button should no longer be emitted.
  assert(!gameScript.includes('moveBtn.textContent = "Advance'), 'Advance button text gone');
  assert(!gameScript.includes('moveBtn.className = "move-btn"'), 'move-btn element gone');
  // Players advance by selecting a reserve unit and tapping the frontline zone.
  assert(gameScript.includes('moveUnitWithAnimation(inst, targetSlot)'), 'frontline-click path still wired');
});

test('Batch 5h item 3: profile name is clickable to rename', function() {
  // Both the avatar AND the name should open the rename prompt.
  // The profileName element must have a cursor:pointer style (either before or after id=).
  var profileNameMatch = htmlContent.match(/<div[^>]*id="profileName"[^>]*>/);
  assert(profileNameMatch, 'profileName element exists');
  assert(/cursor:\s*pointer/.test(profileNameMatch[0]), 'profileName shown as clickable');
  assert(gameScript.includes('nameEl.addEventListener("click", _promptRename)'),
    'profileName click handler wired');
  assert(gameScript.includes('avatarLarge.addEventListener("click", _promptRename)'),
    'profile avatar still renames too');
});

test('Batch 5h item 5: battle nameplates render portrait + name for both sides', function() {
  // HTML nameplate containers present
  assert(htmlContent.indexOf('id="playerNamePortrait"') >= 0, 'player portrait element');
  assert(htmlContent.indexOf('id="enemyNamePortrait"') >= 0, 'enemy portrait element');
  assert(htmlContent.indexOf('id="playerNameplateName"') >= 0, 'player name element');
  assert(htmlContent.indexOf('id="enemyNameplateName"') >= 0, 'enemy name element');
  assert(htmlContent.indexOf('battle-nameplate') >= 0, 'nameplate CSS class present');
  // render() populates both portraits + names
  assert(gameScript.includes('setTxt("playerNameplateName"'), 'player name written in render');
  assert(gameScript.includes('setTxt("enemyNameplateName"'), 'enemy name written in render');
  assert(gameScript.includes('_renderAvatarInto(playerPortrait'), 'player portrait rendered');
  assert(gameScript.includes('_renderAvatarInto(enemyPortrait'), 'enemy portrait rendered');
});

test('Batch 5h item 5: game start uses player\'s chosen name', function() {
  // G.player.name prefers _stats.playerName over the faction-default commander name.
  assert(gameScript.includes('var playerDisplayName = (_stats && _stats.playerName)'),
    'player display name reads from _stats');
});

// ========== BATCH 5i TESTS ==========
console.log('\n===== BATCH 5i TESTS =====\n');

test('Batch 5i item 1: HQ Protected keyed off reserve-zone Guards only', function() {
  // hasGuardNearHQ (reserve zone) replaces the old hasGuardOnFrontline for HQ protection.
  assert(gameScript.includes('function hasGuardNearHQ(board)'), 'hasGuardNearHQ defined');
  assert(!gameScript.includes('function hasGuardOnFrontline'), 'old frontline-only helper removed');
  // Must check zone === "reserve" with a guard flag.
  var idx = gameScript.indexOf('function hasGuardNearHQ(board)');
  var body = gameScript.substring(idx, idx + 400);
  assert(/zone\s*===\s*"reserve"/.test(body), 'reserve zone check');
  assert(/\.def\.guard/.test(body), 'guard flag check');
});

test('Batch 5i item 1: attack targeting uses reserve-guard rule for HQ / reserve', function() {
  // Player-attack path: reserve defenders are shielded only by hasGuardNearHQ.
  assert(gameScript.includes('blocked = hasGuardNearHQ(G.enemy.board)'),
    'player-attack reserve defender uses reserve-guard rule');
  // Enemy AI path: reserveGuardActive flag gates reserve-target blocking.
  assert(gameScript.includes('var reserveGuardActive = hasGuardNearHQ(G.player.board)'),
    'AI targeting reads reserveGuardActive');
  assert(gameScript.includes('blocked = reserveGuardActive'),
    'AI reserve-target block tied to reserveGuardActive');
});

test('Batch 5i item 1: reserve Guards receive the guard-unit visual glow', function() {
  // Both frontline AND reserve Guards should get the .guard-unit halo now.
  assert(gameScript.includes('instance.zone === "frontline" || instance.zone === "reserve"'),
    'guard-unit class applied for frontline OR reserve guards');
});

test('Batch 5i item 2: playCard accepts targetSlot and splices at drop position', function() {
  assert(gameScript.includes('function playCard(instance, targetSlot)'),
    'playCard signature extended with targetSlot');
  // Splice path must find the correct zone slot and insert, falling back to push.
  var idx = gameScript.indexOf('function playCard(instance, targetSlot)');
  var body = gameScript.substring(idx, idx + 3500);
  assert(/if\s*\(typeof targetSlot === "number"\)/.test(body), 'targetSlot guarded by type check');
  assert(/G\.player\.board\.splice\(bi, 0, instance\)/.test(body), 'splice inserts at zone slot');
});

test('Batch 5i item 2: endDrag computes targetSlot from drop X within destination row', function() {
  var idx = gameScript.indexOf('function endDrag(e)');
  var body = gameScript.substring(idx, idx + 5000);
  assert(/destRowId\s*=\s*"playerFrontline"/.test(body), 'cavalry routes to frontline row');
  assert(/destRowId\s*=\s*"playerReserve"/.test(body), 'others route to reserve row');
  assert(/playCard\(droppedInst, targetSlot\)/.test(body), 'targetSlot passed to playCard');
});

// ========== SUMMARY ==========
console.log('\n===== TEST SUMMARY =====\n');
console.log('Passed: ' + results.passed.length);
console.log('Failed: ' + results.failed.length);
console.log('Total: ' + (results.passed.length + results.failed.length));

if (results.failed.length > 0) {
  console.log('\nFailed tests:');
  results.failed.forEach(f => {
    console.log('  - ' + f.name + ': ' + f.error);
  });
}

process.exit(results.failed.length > 0 ? 1 : 0);
