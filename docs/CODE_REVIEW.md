# Code Review: Liberty 1776 v5 Card Game

**Reviewer:** Senior Software Engineer
**Date:** April 6, 2026
**File:** `liberty_v5.html`
**Total Lines:** 1501

---

## Summary

Liberty 1776 v5 shows significant improvement over v4 with the mark-and-sweep combat pattern successfully preventing array mutation crashes. However, a **critical game logic bug** prevents player units from refreshing between turns, making the game essentially unplayable. The codebase is ES5-compatible and has good security practices with hardcoded HTML strings. Performance is acceptable for the scope, but there are minor issues with event listener cleanup and a potential infinite loop risk in enemy AI.

---

## Critical Issues

### 1. CRITICAL: Player Board Units Never Refresh (Game-Breaking Bug)
**Location:** Lines 925-935 (endTurn function)
**Severity:** CRITICAL
**Impact:** Game is unplayable - player units cannot attack on next turn

**Problem:**
```javascript
function endTurn() {
    // ...
    G.phase = "enemy";

    // ONLY resets enemy board exhausted state
    for (var i = 0; i < G.enemy.board.length; i++) {
        G.enemy.board[i].exhausted = false;
    }

    // Player board is NEVER refreshed!
    // Player units stay exhausted forever
}
```

**Why This Is Critical:**
1. Player attacks an enemy unit → sets `exhausted = true`
2. Player ends turn
3. New player turn begins, but player units are still `exhausted = true`
4. Player cannot attack anything (rendering line 1227: `if (!instance.exhausted && G.phase === "player")`)
5. Player can only play new cards and take damage
6. Enemy AI unaffected (always resets before each attack phase)

**Turn Cycle Proof:**
- Turn 1: Player plays unit, attacks (unit exhausted), ends turn
- Turn 2: Player's unit is permanently exhausted, cannot attack
- Turn 3+: Same - no attacks possible, guaranteed loss

**Fix Required:**
```javascript
function endTurn() {
    // ...
    G.phase = "enemy";

    // Reset BOTH player and enemy boards
    for (var i = 0; i < G.player.board.length; i++) {
        G.player.board[i].exhausted = false;
    }
    for (var i = 0; i < G.enemy.board.length; i++) {
        G.enemy.board[i].exhausted = false;
    }
}
```

---

### 2. CRITICAL: Potential Infinite Loop in Enemy AI
**Location:** Lines 963-1010 (enemyTurn function, card play loop)
**Severity:** CRITICAL
**Risk:** Rare but possible browser hang

**Problem:**
```javascript
var played = true;
while (played && G.enemy.hand.length > 0) {
    played = false;

    // Find best card
    // If found and valid: set played = true, remove from hand, splice
    // Otherwise: played stays false, loop exits
}
```

**Edge Case Risk:**
If `bestCard` exists but the `splice(idx, 1)` fails to actually remove it (theoretically impossible in correct JS but defensive coding is good), the loop could cycle forever on the same card. The condition `bestCard.def.cost <= G.enemy.supply && G.enemy.board.length < 5` is checked before splice, but if the state somehow changes between the check and the splice, we're stuck.

**Actual Risk Level:** Very low (would require JS VM error), but the loop should have a safety counter:

```javascript
var maxIterations = 50;
var iterations = 0;
while (played && G.enemy.hand.length > 0 && iterations < maxIterations) {
    iterations++;
    played = false;
    // ... rest of loop
}
```

---

## High Priority Issues

### 3. HIGH: Insufficient Event Listener Cleanup on Re-render
**Location:** Lines 1208-1230 (renderHand function)
**Severity:** HIGH
**Impact:** Memory leak on repeated games

**Problem:**
```javascript
function renderHand() {
    var hand = document.getElementById("playerHand");
    if (!hand) return;

    hand.innerHTML = "";  // Removes old elements, but...

    for (var i = 0; i < G.player.hand.length; i++) {
        var instance = G.player.hand[i];
        var card = createCardElement(instance, false);

        // Creates NEW event listeners EVERY render
        card.addEventListener("click", function() { ... });
        // No cleanup of old listeners

        hand.appendChild(card);
    }
}
```

**Why It's a Problem:**
- `render()` is called frequently during gameplay
- Each call to `renderHand()` uses `innerHTML = ""` (which removes elements)
- But if any references to old card elements remain elsewhere, their listeners persist
- On Play Again, old listeners are still attached but stale

**Actually Mitigated By:** The `innerHTML = ""` does remove old elements from DOM, which does detach listeners. However, this is inefficient - recreating 5 card elements every render when only 1-2 might change.

**Recommendation:** Use element reuse or event delegation.

---

### 4. HIGH: Enemy AI Can Be Starved of Moves
**Location:** Lines 963-1010 (enemyTurn AI priority calculation)
**Severity:** HIGH
**Impact:** AI plays randomly weak cards, player can win easily

**Problem:**
```javascript
var priority = 0;
if (c.def.type === "order") {
    priority = 10 + (6 - c.def.cost);  // Order cards get 10-16 priority
} else {
    priority = c.def.cost;              // Unit cards get 1-6 priority
}
```

**Why This Is Weak AI:**
- Orders are always prioritized (10-16) over units (1-6)
- But orders are often weaker than units for board control
- Example: A "Stamp Tax" (2-cost order, gives 2 supply) is priority 14
- But a "British Redcoat" (2-cost unit, 3ATK/2HP) is priority 2
- AI will spam weak orders instead of building a threatening board

**Game Balance Impact:**
- An 11-year-old can beat the AI by simply playing units and attacking
- Enemy rarely builds effective board presence
- Recommended: Reweight priority to favor cost + card type value

---

## Medium Priority Issues

### 5. MEDIUM: No Null Check Before Battle Cry Execution
**Location:** Lines 902-907 (playCard function)
**Severity:** MEDIUM
**Impact:** If battleCry throws, logged but silent; card is removed

**Code:**
```javascript
try {
    if (instance.def.battleCry) {
        instance.def.battleCry(instance);
    }
} catch (e) {
    // Silent fail - card played, effect lost
}
```

**Current State:** Better than v4 due to try/catch, but should log the error:
```javascript
try {
    if (instance.def.battleCry && typeof instance.def.battleCry === "function") {
        instance.def.battleCry(instance);
    }
} catch (e) {
    console.error("Battle cry failed: " + e.message);
    _log("Card effect failed (error silenced).");
}
```

---

### 6. MEDIUM: Repeated DOM Queries in Render Loop
**Location:** Lines 1096-1112 (render function)
**Severity:** MEDIUM
**Impact:** Minor performance penalty on older devices

**Code:**
```javascript
function render() {
    if (!G) return;

    setTxt("playerName", ...);
    setTxt("playerHP", ...);
    // 12 individual setTxt calls
    // Each calls document.getElementById()
    // Repeated every game loop
}
```

**Current Performance:** Acceptable for this game scope (no render loop observable, likely called on events only). Low priority optimization.

---

### 7. MEDIUM: Mark-and-Sweep Combat Pattern Could Extend to Abilities
**Location:** Lines 893-904 (resolveCombat function)
**Severity:** MEDIUM
**Impact:** Clean but opportunity for enhancement

**Current Implementation:**
- Combat damage applied immediately
- Dead units marked but not removed
- `sweepDead()` called after combat

**Strength:** Prevents array corruption during combat chains
**Edge Case:** If a future card effect triggers on death during combat, the timing might be wrong (dead unit still in array but marked dead).

**Recommendation:** Document the contract clearly - `instance.dead` should be checked before accessing unit properties.

---

## Low Priority Issues

### 8. LOW: Hardcoded Supply Cap Lacks Documentation
**Location:** Line 1159 (enemyTurn) and Line 906 (endTurn)
**Severity:** LOW
**Impact:** Game balance unclear to maintainers

**Code:**
```javascript
G.enemy.maxSupply = Math.min(G.enemy.maxSupply + 1, 10);  // Max 10 supply
```

**Issue:** Max supply of 10 is never documented. Should be:
```javascript
var MAX_SUPPLY = 10;  // Max 8 was mentioned in brief, but code says 10!
G.enemy.maxSupply = Math.min(G.enemy.maxSupply + 1, MAX_SUPPLY);
```

**Note:** Your brief mentioned "max 8" but code enforces "max 10". Clarify design intent.

---

### 9. LOW: Exhausted Visual Feedback Delayed
**Location:** Lines 1227-1230 (renderBoard classname logic)
**Severity:** LOW
**Impact:** UX - player can click exhausted unit during animation

**Current State:**
```javascript
if (isUnit) {
    card.className += " unit-card";
    if (!instance.exhausted && G.phase === "player") {
        card.className += " can-attack";
    }
}
```

**During the 300ms "animating" phase:**
- Phase is not "player", so `can-attack` class is removed
- CSS cursor already correct
- But the attack event listener is still attached

**Low-risk because:** Phase check in `playerAttack` guards against it.

---

### 10. LOW: iPhone Gesture Conflicts
**Location:** Lines 1299-1311 (card tooltip touch events)
**Severity:** LOW
**Impact:** Potential UX issue on iPad

**Code:**
```javascript
card.addEventListener("touchstart", function(e) {
    addClass(tooltip, "visible");
    e.preventDefault();  // Good!
});

card.addEventListener("touchend", function(e) {
    removeClass(tooltip, "visible");
    e.preventDefault();  // Good!
});
```

**Status:** Good - preventDefault() prevents unwanted scrolling
**Tested On:** Not visible in code. Should verify on actual iPad.

---

## Security Analysis

### XSS Vulnerability Check: PASS

**All HTML generation points:**

1. **innerHTML assignments (renderBoard, renderHand, renderLog):**
   - Line 1186: `enemyBoard.innerHTML = "";`
   - Line 1194: `playerBoard.innerHTML = "";`
   - Line 1206: `hand.innerHTML = "";`
   - Line 1270: `log.innerHTML = "";`
   - **Status:** Only clears with empty string, then appends safe elements. SAFE.

2. **innerHTML in log entry (renderLog):**
   - Line 1272: `entry.textContent = G.log[i];`
   - **Status:** Uses `.textContent` (NOT `.innerHTML`), immune to XSS. SAFE.

3. **Card creation (createCardElement):**
   - All text uses `.textContent` (lines 1282, 1293, 1299, 1303, 1309)
   - **Status:** SAFE.

4. **Game over display:**
   - Lines 1321-1328 use `.textContent`
   - **Status:** SAFE.

**Verdict:** No XSS vectors found. All user-facing text uses `.textContent` instead of `.innerHTML`.

---

## Performance Analysis

### O(n²) Loop Check: PASS

**Card play loop (enemyTurn):**
- Outer: while (played)
- Inner: for (hand.length) - finds best card
- Worst case: 5 cards played × 5 hand sizes = 25 iterations max
- **Status:** Acceptable. Hand size capped at ~10 by deck size / draw rate.

**Board rendering:**
- renderBoard: 2 loops × max 5 units = 10 iterations
- renderHand: 1 loop × hand size (~5) = 5 iterations
- **Status:** Acceptable.

**render() frequency:** Not observed as looping; appears to be event-driven only.

**Verdict:** No performance issues for the scope of this game.

---

## ES5 Compatibility Check: PASS

**Checked for:**
- ~~let/const~~ Uses `var` everywhere
- ~~Arrow functions~~ Uses `function() {}` syntax
- ~~Template literals~~ Uses `+` string concatenation
- ~~Destructuring~~ No destructuring assignments
- ~~for...of loops~~ Uses traditional for loops
- ~~Promises~~ Uses `setTimeout()` instead
- ~~async/await~~ Not used
- ~~Class syntax~~ Uses function + closure pattern

**Verdict:** Fully ES5 compatible.

---

## iPad Safari Compatibility Check: PASS (with notes)

**Checked elements:**
- CSS viewport meta tag (line 5)
- No iOS-specific bugs detected
- Touch events handled (touchstart, touchend)
- `-webkit-user-select: none` for non-selectable text (line 27)
- No use of unsupported CSS features
- Viewport is `width=device-width, initial-scale=1.0`

**Potential iPad Issues:**
1. **Viewport height:** `height: 100%` on `html, body` may cause issues with Safari's UI chrome
   - Recommended: Use `height: 100vh` with fallback, or account for Safari's address bar
2. **Audio Context:** Line 1037 checks for `webkitAudioContext` (good!)
3. **Manifest file:** References `manifest.json` (line 8) which isn't provided - may show warnings

**Verdict:** Likely works, but should test scrolling behavior on actual iPad.

---

## file:// Protocol Compatibility Check: PASS

**Checked for:**
- No CORS issues detected (no external API calls)
- Service worker gracefully fails if not available (line 1482)
- Audio Context uses try/catch (line 1038)
- No fetch() or XHR calls

**Potential Issues:**
1. **Service worker registration:**
   - Line 1483: Registers `sw.js` file
   - If running from `file://`, SW may fail silently (caught by .catch())
   - Impact: Minimal, just means offline mode won't work

**Verdict:** Fully compatible with file:// protocol.

---

## Game Design & Balance Analysis

### Is the AI Beatable by an 11-Year-Old?

**Verdict:** YES, easily.

**Reasons:**
1. **Weak AI card selection:** Prioritizes orders over units (Issue #4)
2. **No board threat assessment:** AI doesn't evaluate if it's losing
3. **No adaptation:** Uses same strategy regardless of game state
4. **Weak starting units:** British Redcoat (3ATK/2HP) vs Patriot Militia (2ATK/3HP) - comparable

**Example Win Path:**
1. Play Minuteman (1 cost, 2ATK) turn 1
2. Play Patriot Militia (2 cost, 2ATK/3HP) turn 2
3. Attack with Minuteman every turn
4. Play more units as supply increases
5. Enemy AI wastes supply on orders, doesn't build threatening board
6. Player wins by turn 4-5

**Balance Concern:** Game is too easy for intended audience of ~11 years old. Recommend improving AI priority weighting.

---

### Card Cost Analysis

**Patriots Deck:**
| Card | Cost | Type | ATK/HP | Value |
|------|------|------|--------|-------|
| Minuteman | 1 | Unit | 2/1 | Fair (3 stats) |
| Patriot Militia | 2 | Unit | 2/3 | Good (5 stats) |
| Frontier Rifleman | 3 | Unit | 4/2 | Good (6 stats) |
| Continental Regular | 4 | Unit | 4/4 | Excellent (8 stats) |
| French Infantry | 5 | Unit | 5/5 | Excellent (10 stats) |
| George Washington | 6 | Unit | 6/7 | Legendary (13 stats + draw 2) |

**Cost Curve:** Reasonable linear progression. No obvious broken cards.

**Orders:** All cost 2-4, none too powerful. Good.

**British Deck:** Comparable balance.

**Verdict:** Card costs are well-designed and balanced.

---

### Max Supply = 8 (or 10?) Reality Check

**Code Evidence:**
- Line 906: `Math.min(G.player.maxSupply + 1, 10)` → MAX IS 10
- Your brief says "max 8"
- **Discrepancy:** Code enforces max 10, not 8

**If intended max is 8:**
- Line 906 should be: `Math.min(G.player.maxSupply + 1, 8)`
- Line 1159 should be: `Math.min(G.enemy.maxSupply + 1, 8)`
- This allows playing the 6-cost legends exactly once (turn 6)
- Limits final board to ~2-3 high-cost units

**Verdict:** Clarify design intent. Current code = max 10.

---

## Turn Cycle Trace (Step-by-Step Test)

### Scenario: Player plays 1-cost unit, ends turn, next turn starts

**Turn 1 - Player Phase:**
1. Player has 1 supply (starts at 0, immediately set to 1)
   - Line 906 sets `maxSupply = Math.min(0 + 1, 10) = 1`
   - Then: `supply = maxSupply = 1` → Correct
2. Player plays Minuteman (cost 1)
   - `canPlayCard()` returns true (1 >= 1, board.length 0 < 5) ✓
   - `playCard()` removes from hand, deducts supply (1 - 1 = 0) ✓
   - Adds to board ✓
   - Calls battleCry (null, ok) ✓
   - render() called ✓
3. Player clicks End Turn
   - Sets `G.phase = "animating"` ✓
   - After 300ms: sets `G.phase = "enemy"` ✓

**Turn 1 - Enemy Reset (BUG HERE):**
4. Resets enemy board exhausted = false ✓
5. Does NOT reset player board exhausted = false ✗✗✗ **CRITICAL BUG**
6. Calls `_drawCards(1)` - player gets +1 card ✓
7. Player maxSupply = 2, supply = 2 ✓

**Turn 1 - Enemy AI:**
8. Enemy draws 1 card ✓
9. Enemy maxSupply = 2, supply = 2 ✓
10. Enemy plays cards and attacks... ✓

**Turn 2 - Player Phase (MOMENT OF FAILURE):**
11. Phase = "player" ✓
12. Player's Minuteman is STILL exhausted = true ✗
13. Rendering: `if (!instance.exhausted && G.phase === "player")` → false ✗
14. Card doesn't get `can-attack` class ✗
15. Player cannot click to attack ✗
16. **Player is permanently crippled** ✗✗✗

**Verdict:** The game is **UNPLAYABLE**. This is the v4 crash's mirror bug - not a crash but complete game breakage.

---

## Turn Cycle Verdict

**Critical Path: BROKEN**

The mark-and-sweep pattern successfully prevents v4's crash issue, but this new bug makes the game completely unplayable. Player units can never refresh, turning every game into a loss within 2-3 turns.

---

## What Looks Good

1. **Mark-and-Sweep Combat Pattern:** Excellent solution to prevent array mutation crashes. Clean implementation.

2. **Error Handling:** Good use of try/catch blocks around battleCry execution (lines 902-907, 986-992).

3. **Security:** No XSS vulnerabilities. All user-facing text uses `.textContent`.

4. **ES5 Compatibility:** Code is clean and old-browser friendly.

5. **Touch Support:** Good handling of touch events with preventDefault() and both touch/mouse events.

6. **Audio Fallback:** Graceful degradation if audio context unavailable.

7. **Service Worker:** Attempts offline support but fails gracefully.

8. **UI/UX Polish:** Good card animations, tooltips, phase indicator, game log.

---

## Critical Summary

| # | Issue | Severity | Impact |
|---|-------|----------|--------|
| 1 | Player units never refresh | CRITICAL | Game unplayable |
| 2 | Infinite loop risk in AI | CRITICAL | Browser hang risk |
| 3 | Event listener cleanup | HIGH | Memory leak |
| 4 | Weak AI strategy | HIGH | Game too easy |
| 5 | Battle cry error handling | MEDIUM | Silent failures |
| 6 | DOM query performance | MEDIUM | Minor perf penalty |
| 7 | Mark-sweep extension | MEDIUM | Design clarity |
| 8 | Supply cap documentation | LOW | Maintainability |
| 9 | Exhausted visual feedback | LOW | UX polish |
| 10 | iPad gesture conflicts | LOW | Platform testing |

---

## Verdict

### **NEEDS WORK**

**The game cannot be approved for release in its current state.**

### Blocking Issues (Must Fix):

1. **Fix player unit refresh bug** (Line 925-935)
   - Player board units must reset exhausted state at turn start
   - This is a game-breaking bug, not a minor issue

2. **Add safety counter to AI card play loop** (Line 963)
   - Prevent theoretical infinite loop with defensive max iterations

### Strongly Recommended (Before Testing):

3. **Improve AI card selection priority** (Line 970-977)
   - Reweight card priority to favor board threat over card type
   - Makes game appropriate difficulty for 11-year-old audience

### Before Shipping (Nice to Have):

4. Clarify design intent for max supply (should it be 8 or 10?)
5. Test on actual iPad Safari with vh units
6. Consider event delegation in renderHand() for efficiency
7. Add console error logging for battleCry failures

---

## Files to Review

- **Main Game:** `/sessions/compassionate-funny-turing/mnt/My Drive/Zhao-Family-Holdings/ai-agency-lab/andy-experiments/Andy_Liberty_CardGame/liberty_v5.html`
- **No external dependencies:** Game is self-contained

---

## Recommended Testing Checklist

Before releasing v6:

- [ ] Play a full game (player should attack multiple turns)
- [ ] Verify player units refresh at turn start
- [ ] Test enemy AI behavior with improved priority
- [ ] Play on iPad Safari (check scrolling behavior)
- [ ] Play from file:// protocol (verify offline works)
- [ ] Test all historical card effects (battleCry functions)
- [ ] Test with 5+ units on board (stress test)
- [ ] Check console for errors (none should appear)

---

**End of Review**
