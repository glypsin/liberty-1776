# Product Requirements Document: Liberty 1776

**Version:** 4.0
**Date:** April 2026
**Status:** In Development

---

## 1. Overview

Liberty 1776 is a single-player, browser-based card game that teaches players about the American Revolutionary War through interactive gameplay. Players command historical military units and leaders in turn-based combat against an AI opponent representing the opposing faction (Patriots vs. British).

The game combines the strategic deck-building elements of Hearthstone with the historical authenticity of KARDS, designed to make history engaging and educational for young players. Every card represents a real historical figure, military unit, or event, with educational facts displayed as players use them.

### Key Specifications
- **Platform:** Browser-based PWA (Progressive Web App)
- **Technical Stack:** Single HTML file + manifest.json + service worker (zero external dependencies)
- **Target Launch:** April 2026
- **Languages:** English (US)
- **Offline Capable:** Yes (full offline gameplay via service worker)

---

## 2. Target User

**Primary User:** Andy, age 11 (5th grade)
- Learning American history in school (Revolutionary War unit)
- Interested in strategy games and card games
- iPad owner (intended primary platform)
- English-speaking, US student
- Attention span: 15-30 minutes per game session

**Secondary Users:** Educators, homeschool parents using the game as supplementary history content

**User Scenario:** Andy plays Liberty 1776 during free time or as a reward for homework completion. The game teaches him about specific leaders, battles, and supply chains of the Revolutionary War while providing engaging, rewarding gameplay.

---

## 3. Goals

1. **Educational:** Every card must teach authentic historical facts about the American Revolutionary War. History facts should be clearly displayed and reinforce curriculum learning.

2. **Engagement:** Create a fun, replayable game experience that keeps players motivated through variable AI behavior, multiple card interactions, and satisfying win conditions.

3. **Accessibility:** Ensure the game runs smoothly on iPad and other modern browsers. Support offline play for unrestricted access.

4. **Installability:** Enable PWA installation on iPad home screen with app-like experience (full-screen, offline, notification support).

5. **Reliability:** Fix critical bugs (array mutation during iteration) and ensure stable gameplay with no crashes during an average 20-minute session.

---

## 4. Non-Goals

- Multiplayer or competitive online features
- In-app purchases or monetization
- Social features (leaderboards, sharing)
- Deck-building or card collection (fixed deck for each faction)
- Mobile responsiveness below 320px width (target iPad and desktop)
- Spanish or other language translations (English only)
- Voice acting or complex audio (Web Audio API only, no external audio files)
- Advanced analytics or user tracking
- Cloud save functionality

---

## 5. User Stories

### Story 1: Install and Play
**As a** player
**I want to** install Liberty 1776 as an app on my iPad home screen
**So that** I can launch it quickly like a native app and play offline

**Acceptance Criteria:**
- Install prompt appears when user visits the game URL in Safari
- App launches full-screen without browser UI
- Game runs fully offline after installation
- Cached assets load in <2 seconds on return visits

### Story 2: Learn History While Playing
**As a** player
**I want to** see historical facts about cards when I play them
**So that** I learn real details about Revolutionary War leaders and events

**Acceptance Criteria:**
- Hovering over a card displays a tooltip with a 1-2 sentence historical fact
- Fact appears in the game log when the card is played
- Facts are age-appropriate and grade-level accurate (5th grade)
- At least 12 unique historical facts across the 22 cards

### Story 3: Play a Complete Game Session
**As a** player
**I want to** start a new game, play through multiple turns, and reach a victory or defeat screen
**So that** I can experience a complete game session with clear outcomes

**Acceptance Criteria:**
- Game starts with a clear "New Game" button
- Turn counter and game timer visible during play
- Victory condition: reduce opponent health to 0
- Defeat condition: player health reaches 0
- Victory/defeat screen shows a historical summary of the game
- Average game session takes 15-25 minutes

### Story 4: Command Units and Heroes
**As a** player
**I want to** click my units and attack opponent units
**So that** I can engage in strategic combat

**Acceptance Criteria:**
- Click own unit, then click enemy unit to initiate attack
- Attack resolves damage correctly
- Combat log shows all attacks and damage dealt
- Heroes can trigger BattleCry effects on play

### Story 5: Manage Supply (Mana)
**As a** player
**I want to** manage my supply points and play cards strategically
**So that** I must plan my card plays across multiple turns

**Acceptance Criteria:**
- Start turn with 1 supply, increasing by 1 each turn (max 8)
- Supply refreshes to maximum at start of each turn
- Cannot play cards that cost more supply than available
- Supply cost is clearly displayed on every card

### Story 6: Experience AI Opponent
**As a** player
**I want to** play against an AI that adapts its strategy
**So that** the game feels challenging and provides varied experiences

**Acceptance Criteria:**
- AI plays cards strategically based on board state
- AI targets player units that pose the greatest threat
- AI behavior is consistent but not predictable
- Game does not crash during AI turn
- AI takes 2-5 seconds to complete turn action

### Story 7: Use Sound Effects
**As a** player
**I want to** hear satisfying sound effects for key actions
**So that** I get positive feedback and the game feels more polished

**Acceptance Criteria:**
- Sound plays when unit attacks (whoosh sound)
- Sound plays when card is played (card flip sound)
- Sound plays on victory (victory fanfare)
- Sound plays on defeat (sad trombone)
- Volume control available in settings
- Sound uses Web Audio API (no external files)
- Mobile browsers that require user interaction before audio work correctly

---

## 6. Functional Requirements

### 6.1 Game Board & Cards

| Requirement | Details |
|---|---|
| **Card Types** | Unit (has attack/health), Hero (has attack/health + BattleCry), Order (instant effect) |
| **Card Properties** | Name, faction (Patriot/British), type, cost (supply), attack, health, rarity, history fact |
| **Rarity System** | Common, Rare, Legendary (affects card power level and visual appearance) |
| **Deck Size** | 11 unique cards per faction (22 total) |
| **Hand Display** | Show 4-5 cards in hand, sorted by cost |
| **Board Layout** | Player board (left), opponent board (right), central area for hero placement |

### 6.2 Game Flow

| Phase | Requirements |
|---|---|
| **Setup** | Game initializes with both players at 30 health, empty board, full deck shuffled |
| **Player Turn Start** | Supply refreshes to max (based on turn number), draw 1 card, player can play cards and attack |
| **Combat** | Click unit → click target → damage resolves, units with 0 health destroyed immediately |
| **Player Turn End** | Player clicks "End Turn" button (or auto-end after 2 minutes) |
| **Enemy Turn** | AI plays cards and attacks following strategic logic, takes 2-5 seconds |
| **Victory/Defeat** | Game ends when either player health reaches 0, show summary screen |

### 6.3 Supply (Mana) System

- **Starting Supply:** 1 per turn
- **Growth:** Increases by 1 each turn (turn 2 = 2 supply, turn 3 = 3, etc.)
- **Maximum:** 8 supply
- **Refresh:** Full refresh to maximum each turn
- **Display:** Clear indicator showing current/maximum supply

### 6.4 Combat System

| Feature | Requirement |
|---|---|
| **Attack Action** | Click attacker → click defender (only own units can attack) |
| **Damage Resolution** | Reduce target health by attacker's attack value |
| **Destruction** | Units with 0+ health are removed from board |
| **Hero Attack** | Heroes can attack enemy hero (opponent) or enemy units |
| **Enemy AI** | AI selects highest-threat targets based on attack value and rarity |

### 6.5 Special Effects

| Effect | Requirement |
|---|---|
| **BattleCry** | Trigger when hero card is played from hand, special effect resolves before unit enters play |
| **Order Cards** | Instant effect cards, resolve immediately, not placed on board |
| **History Facts** | Display in hover tooltip and game log when card is played |

### 6.6 AI Opponent

- **Card Play Logic:** Play high-cost cards when supply available, prioritize heroes and rare cards
- **Attack Logic:** Target highest attack-value units first, attack hero if board is clear
- **Decision Time:** AI decision takes 2-5 seconds per turn (human-like pace)
- **Consistency:** Same AI personality for both factions

### 6.7 User Interface

| Element | Requirements |
|---|---|
| **Main Menu** | Title, "New Game" button, "How to Play" link, settings icon |
| **Game Screen** | Board display, hand, supply indicator, turn counter, timer, game log, "End Turn" button |
| **Card Hover** | Tooltip showing card stats and history fact |
| **Game Log** | Scrollable history of all actions (card plays, attacks, damage) |
| **Turn Counter** | Display "Turn X" (1-20+) |
| **Timer** | Game timer showing elapsed time (minutes:seconds) |
| **Victory Screen** | "You Won!", historical summary, "Play Again" button |
| **Defeat Screen** | "You Lost", opponent faction name, historical insight, "Try Again" button |
| **Install Prompt** | "Install as App" button for iOS Safari (PWA prompt) |

### 6.8 Sound Effects (Web Audio API)

| Action | Sound Effect |
|---|---|
| **Unit Attack** | Whoosh/impact sound (200-400ms duration) |
| **Card Play** | Card flip/shuffle sound (150-300ms duration) |
| **Victory** | Short fanfare/chime (1-2 seconds) |
| **Defeat** | Sad trombone or descending tone (1 second) |
| **Settings** | Toggle sound on/off, volume slider (0-100%) |

### 6.9 PWA Support

| Feature | Requirement |
|---|---|
| **Manifest.json** | Defines app name, icons, display mode (fullscreen), theme colors |
| **Service Worker** | Cache game assets on first visit, serve cached files offline |
| **Install Prompt** | Browser offers "Add to Home Screen" (iOS) or install button (Android/Desktop) |
| **Offline Mode** | Full gameplay possible without network connection after first install |
| **Icons** | At least 192x192 and 512x512 PNG icons for home screen |

### 6.10 Bug Fixes

| Bug | Fix |
|---|---|
| **Array Mutation During Iteration** | AI turn loops causing crash - refactor to avoid mutations during iteration (use `.slice()` or `for` loop instead of `.forEach()` on array being modified) |

---

## 7. Non-Functional Requirements

| Requirement | Details |
|---|---|
| **Performance** | Page load <2s on 4G, game updates <16ms (60 FPS), AI turn <5s |
| **Browser Support** | Chrome 90+, Safari 14+ (iOS 14+), Edge 90+, Firefox 88+ |
| **File Size** | Single HTML file <50KB, manifest <2KB, service worker <10KB |
| **Dependencies** | Zero external libraries (no jQuery, no frameworks) |
| **Accessibility** | Basic keyboard support (Tab to navigate, Enter to select), readable contrast ratio 4.5:1 |
| **Responsiveness** | Optimized for iPad (1024x768) and desktop (1280x720+), minimum 768px width |
| **Security** | No external API calls, no user data collection, no cookies (except service worker cache) |
| **Offline Capability** | Full offline gameplay after first install, no network requests required |
| **Language** | English (en-US), all text age-appropriate for 5th graders |

---

## 8. Success Metrics

### 8.1 Functional Metrics
- **Crash-Free Sessions:** 100% of game sessions (no crashes during play)
- **Game Completion Rate:** 95%+ of games reach victory or defeat screen
- **AI Performance:** AI completes turn in <5 seconds, 90% of the time

### 8.2 Educational Metrics
- **History Fact Display:** All 22 cards show historical facts on hover and in log
- **Age-Appropriate Content:** All history facts pass 5th-grade reading level review
- **Alignment to Curriculum:** Game covers at least 15 distinct Revolutionary War topics

### 8.3 User Experience Metrics
- **Install Adoption:** 80%+ of iPad users successfully install as PWA
- **Replay Rate:** 70%+ of users play at least 2-3 games in a session
- **Average Session Length:** 15-25 minutes per game

### 8.4 Technical Metrics
- **Load Time:** <2 seconds on 4G network
- **Offline Play:** 100% of features accessible offline after install
- **Browser Compatibility:** Tested and working on Chrome, Safari, Edge, Firefox (latest stable)

---

## 9. Timeline

| Milestone | Target Date | Deliverables |
|---|---|---|
| **v4.0 - Bug Fix & PWA** | April 7, 2026 | Fix array mutation bug, add manifest.json, implement service worker |
| **v4.1 - Audio & UX** | April 8, 2026 | Web Audio API sounds, card hover tooltips, turn counter, timer |
| **v4.2 - Polish & Install** | April 9, 2026 | Victory/defeat screens, historical summaries, iOS install prompt, testing |
| **v4.3 - Launch Ready** | April 10, 2026 | Final bug fixes, performance optimization, PWA validation, release to users |

---

## 10. Card Design Philosophy

### Historical Authenticity
Every card represents a real figure, event, or unit from the Revolutionary War (1775-1783). Card abilities reflect historical significance:
- **George Washington (Hero):** High health, leadership ability
- **Paul Revere (Hero):** Quick action, warning mechanic
- **Minutemen (Unit):** Lower cost, represents rapid mobilization
- **Supply Lines (Order):** Reflects historical importance of logistics

### Learning Integration
Each card's history fact teaches a specific detail:
- **Who** the person/unit was
- **What** they did during the war
- **Why** it mattered to the outcome

Facts are 1-2 sentences, grade-level appropriate, and sourced from primary historical records.

### Balance & Fairness
- Both Patriots and British factions have equal power levels
- Card costs and stats are balanced to prevent one-sided gameplay
- AI difficulty is consistent between factions

---

## 11. Installation & Access

### For iPad Users
1. Visit game URL in Safari
2. Tap Share → Add to Home Screen
3. Enter app name (Liberty 1776)
4. Tap Add
5. Game icon appears on home screen

### For Desktop Users
1. Visit game URL in Chrome, Edge, or Safari
2. Browser may show install prompt (or use settings menu)
3. Game runs in standalone mode

### Offline Access
After installation, all game assets are cached by the service worker. Game is fully playable without internet connection.

---

## 12. Known Constraints & Assumptions

### Constraints
- Single HTML file architecture limits complexity but ensures portability
- No server backend (all game logic runs client-side)
- Web Audio API limitations on mobile (requires user interaction before audio works)
- Service worker cache limited by browser storage (typically 50MB+)

### Assumptions
- Target device has modern browser with ES6 support
- iPad users have iOS 12+ (Safari 12+)
- Players have 15-30 minutes for a complete game session
- Network available for first install; offline play afterward
- Educational facts will be reviewed for accuracy by subject matter expert

---

## 13. Future Enhancements (Out of Scope)

- Deck building (choose cards before game)
- Multiple difficulty levels (Easy, Normal, Hard)
- Historical campaign mode (follow chronological battles)
- Leaderboards and achievements
- Multiplayer competitive play
- Additional factions (French, Spanish, Native American allies)
- Advanced AI with machine learning
- Cloud save and cross-device sync
- Translated versions (Spanish, French, etc.)

---

## Appendix A: Card List Reference

### Patriot Faction (11 cards)
1. George Washington (Hero)
2. Benjamin Franklin (Hero)
3. Paul Revere (Hero)
4. Minutemen (Unit)
5. Continental Soldiers (Unit)
6. Spy Network (Order)
7. Declaration of Independence (Order)
8. Valley Forge Supply (Order)
9. Boston Tea Party (Order)
10. French Alliance (Order)
11. Yorktown Victory (Order)

### British Faction (11 cards)
1. Lord Cornwallis (Hero)
2. General Howe (Hero)
3. Redcoat Commander (Hero)
4. Redcoat Infantry (Unit)
5. Royal Navy (Unit)
6. Blockade (Order)
7. Hessian Mercenaries (Order)
8. Royal Proclamation (Order)
9. Halifax Garrison (Order)
10. London Supply Line (Order)
11. Charleston Campaign (Order)

---

## Appendix B: Acceptance Testing Checklist

- [ ] Game launches without errors on Chrome, Safari, Edge, Firefox
- [ ] All 22 cards display correctly with stats and rarity colors
- [ ] Supply system works (starts at 1, increases by 1 per turn, caps at 8)
- [ ] Cards cannot be played if supply cost exceeds available supply
- [ ] Combat system resolves damage correctly
- [ ] Units with 0 health are destroyed immediately
- [ ] BattleCry effects trigger on hero play
- [ ] Order cards resolve and disappear
- [ ] AI plays cards and attacks without crashes
- [ ] Game ends correctly on victory (opponent 0 health) and defeat (player 0 health)
- [ ] All sound effects play correctly (attack, card play, victory, defeat)
- [ ] Card hover tooltips display history facts
- [ ] Turn counter increments correctly each turn
- [ ] Game timer displays elapsed time
- [ ] PWA installs as app on iOS and Android
- [ ] Game plays offline after installation
- [ ] Game log displays all actions accurately
- [ ] Victory and defeat screens show historical summary
- [ ] Page loads in <2 seconds on 4G network
- [ ] No array mutation bugs during AI turn
- [ ] Install prompt displays on iOS Safari

---

**Document Version History**
- v1.0 (April 6, 2026) - Initial PRD creation

