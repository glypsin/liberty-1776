# Architecture Decision Records: Liberty 1776 Card Game

## ADR-001: Progressive Web App (PWA) vs Native App vs Plain HTML

**Status:** Accepted
**Date:** 2026-04-06
**Deciders:** Andy

### Context
We need to create a card game that runs on Andy's iPad as well as desktops. The project prioritizes simplicity, offline playability, and minimal deployment friction. No app store distribution or complex infrastructure is required.

### Decision
Implement as a Progressive Web App (PWA) with a single HTML file as the core, plus a service worker and manifest for installability.

### Options Considered

#### Option A: Progressive Web App (PWA)
| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium |
| Deployment | Single URL/file, installable to home screen |
| Offline support | Full with service worker |
| iOS compatibility | Limited (iOS PWA support is restricted) |
| Team familiarity | High (web technologies) |

**Pros:**
- Installable to home screen on both Android and iOS
- Works offline with service worker
- Same codebase for mobile and desktop
- No App Store submission or review process
- Can be played via file:// protocol or simple HTTP server
- No additional dependencies or build tools needed

**Cons:**
- iOS PWA support is limited (no persistent storage guarantee, no background sync)
- No push notifications on iOS
- Limited access to device APIs compared to native apps
- Requires modern browser support

#### Option B: Native App (Swift/Kotlin)
| Dimension | Assessment |
|-----------|------------|
| Complexity | High |
| Deployment | App Store submission, platform-specific builds |
| Offline support | Full |
| iOS compatibility | Full |
| Team familiarity | Low (requires native development) |

**Pros:**
- Full device API access
- Polished native look and feel
- App Store presence
- Push notifications, background features

**Cons:**
- Requires separate iOS and Android codebases
- App Store review process (time, cost, restrictions)
- Higher maintenance burden
- Overkill for a card game

#### Option C: Plain HTML File
| Dimension | Assessment |
|-----------|------------|
| Complexity | Low |
| Deployment | Single .html file, double-click to play |
| Offline support | Full |
| iOS compatibility | Browser only, no home screen icon |
| Team familiarity | High |

**Pros:**
- Simplest possible distribution
- Works offline without service worker
- Works from file:// protocol
- Minimal file size
- No build tools needed

**Cons:**
- No home screen installation capability
- No offline manifest caching strategy
- No iOS app-like experience
- Harder to share (needs file copy vs URL)

### Trade-off Analysis

**PWA vs Plain HTML:** PWA adds a service worker and manifest.json to enable home screen installation and explicit offline support. This small overhead provides significant UX benefit on iPad (installable to home screen) and future-proofs for Android distribution. Since Andy has an iPad, PWA installability is worth the modest added complexity.

**PWA vs Native:** Native development would require Swift/Kotlin expertise and App Store submission, neither of which fits the project scope. PWA delivers 90% of the desired experience (offline play, home screen icon) with web technologies we already know.

**iOS Limitations:** iOS PWA support is intentionally restricted by Apple (no persistent service worker cache, limited storage). However, for a card game that doesn't require server sync or persistent state beyond the current session, these limitations are acceptable.

### Consequences

**What becomes easier:**
- Instant deployment by sharing a URL or file
- Single codebase runs everywhere (iPad, Android, desktop)
- No app store gatekeeping or review delays
- Easy to iterate and push updates
- Works offline for gameplay

**What becomes harder:**
- Sharing with non-technical users (must explain how to install PWA)
- Advanced device features (camera, geolocation) not accessible
- iOS push notifications not available
- iOS storage caching behavior may be unpredictable

**What we'll need to revisit:**
- If offline persistence becomes critical, we may need IndexedDB/localStorage strategy
- If iOS adoption grows significantly, consider native wrapper (React Native or Electron)
- If multiplayer/networking is added, service worker caching strategy becomes more complex

---

## ADR-002: Single-File vs Multi-File Architecture

**Status:** Accepted
**Date:** 2026-04-06
**Deciders:** Andy

### Context
The game needs to be portable, deployable, and playable with minimal tooling. We want to avoid build steps, bundlers, and package managers where possible, while maintaining clean code organization.

### Decision
Implement as a single HTML file containing all game logic, with separate manifest.json and service worker (sw.js) for PWA functionality.

### Options Considered

#### Option A: Single HTML File
| Dimension | Assessment |
|-----------|------------|
| Complexity | Low |
| Deployment | One file, double-click to play |
| Maintainability | Medium (large file size) |
| Code organization | Single namespace, harder to split concerns |

**Pros:**
- Works with file:// protocol (no server needed)
- Trivial deployment (copy one file)
- No build step or package manager
- Clear entry point
- Easy to share via email or USB

**Cons:**
- Single file becomes large and harder to navigate
- All code in one namespace
- Harder to test individual modules
- Source maps and debugging more complex

#### Option B: Multi-File with Build Tools (Webpack/Rollup)
| Dimension | Assessment |
|-----------|------------|
| Complexity | High |
| Deployment | Requires build step, HTTP server |
| Maintainability | High (modular files) |
| Code organization | ES6 modules, clear separation of concerns |

**Pros:**
- Clean modular code structure
- Better for large teams
- Tree-shaking and code splitting
- Professional development workflow

**Cons:**
- Requires Node.js, npm, and build tooling
- Build step adds friction to deployment
- Doesn't work with file:// protocol
- Adds dependency maintenance burden
- Overkill for a single-developer game

#### Option C: Multi-File without Build Tools (ES6 Modules in HTML)
| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium |
| Deployment | Requires HTTP server (no file:// support) |
| Maintainability | High (modular files) |
| Code organization | Multiple .js files, clean separation |

**Pros:**
- ES6 modules without build tools
- Clean file organization
- Works in modern browsers

**Cons:**
- Requires HTTP server for development
- file:// protocol doesn't support modules
- Harder to share a single "game" artifact
- More files to manage

### Trade-off Analysis

**Single file vs build tools:** Build tools (Webpack, Rollup) add significant overhead for a card game. A single HTML file is sufficient for code that's 5-10K lines (well within reasonable HTML file size). The ability to double-click and play on any computer is worth more than perfect code organization at this scale.

**Single file vs ES6 modules:** ES6 modules require an HTTP server, breaking the simplicity of file:// protocol distribution. For a local game, this breaks the "play anywhere" goal.

**Pragmatic approach:** Use a single HTML file for production, but during development, organize code mentally into logical sections (game state, AI, UI rendering, etc.) with clear comments. This provides 80% of the organizational benefit with 20% of the complexity.

### Consequences

**What becomes easier:**
- No npm install or build step
- Works on any computer with a modern browser
- Easy to version control (single file)
- Trivial to backup, share, or email
- Fast development iteration (change, refresh)

**What becomes harder:**
- File size may grow large (needs periodic refactoring)
- Debugging in DevTools requires IIFE/closure understanding
- Team collaboration harder (fewer merge-friendly boundaries)
- Code organization relies on discipline, not tooling

**What we'll need to revisit:**
- If the game grows past 15K lines of code, split into multi-file module pattern
- If we need npm packages (e.g., for advanced audio), reconsider build tools
- If sharing becomes difficult, consider simple HTTP server deployment

---

## ADR-003: Game State Management - IIFE Module Pattern vs Class Instances

**Status:** Accepted
**Date:** 2026-04-06
**Deciders:** Andy

### Context
The game needs to maintain mutable state (hand, board, players, turn order) across player actions, AI moves, and card effects. We need a pattern that's battle-tested, works without build tools, and provides good encapsulation.

### Decision
Use IIFE module pattern with an internal state object to encapsulate game logic and prevent accidental global mutations. This is proven by multiple Hearthstone clones on GitHub and works without transpilation.

### Options Considered

#### Option A: IIFE Module Pattern (Immediately Invoked Function Expression)
```javascript
const GameEngine = (() => {
  const state = { /* mutable game state */ };

  return {
    // public methods
    playCard: (cardId) => { /* ... */ },
    getState: () => ({ ...state }), // shallow copy for immutability
  };
})();
```

| Dimension | Assessment |
|-----------|------------|
| Complexity | Low-Medium |
| Encapsulation | Excellent (true private variables) |
| Testability | Good (public API is well-defined) |
| Browser compatibility | Excellent (ES5 compatible) |
| Learning curve | Medium (closure concept) |

**Pros:**
- True private variables via closure
- No global namespace pollution
- Works in all browsers (ES5)
- Easy to debug (module has clear boundary)
- Proven pattern in game development
- No class instantiation overhead

**Cons:**
- Harder to understand for developers unfamiliar with closures
- Can't easily inherit from multiple modules
- Testing private functions is harder

#### Option B: Class Instances
```javascript
class GameEngine {
  constructor() {
    this.state = { /* ... */ };
  }

  playCard(cardId) { /* ... */ }
}

const gameEngine = new GameEngine();
```

| Dimension | Assessment |
|-----------|------------|
| Complexity | Low |
| Encapsulation | Medium (relies on convention, _private fields work but ES2022) |
| Testability | Good (can subclass for testing) |
| Browser compatibility | Good (ES6 classes) |
| Learning curve | Low (familiar OOP pattern) |

**Pros:**
- Familiar to most developers
- Easy to instantiate multiple games
- Works with modern tools

**Cons:**
- this binding can be tricky in callbacks
- Less common in single-file game architecture
- Public by default (private # fields are newer)
- Harder to prevent accidental state mutation

#### Option C: Global Object
```javascript
const game = {
  state: { /* ... */ },
  playCard: function(cardId) { /* ... */ },
};
```

| Dimension | Assessment |
|-----------|------------|
| Complexity | Very Low |
| Encapsulation | Poor (all properties exposed) |
| Testability | Hard (state can be mutated externally) |
| Browser compatibility | Excellent |
| Learning curve | Very Low |

**Pros:**
- Simplest to write
- No learning curve

**Cons:**
- No protection against accidental mutations
- Global namespace pollution
- Hard to reset state for testing
- Encourages spaghetti code

### Trade-off Analysis

**IIFE vs Classes:** IIFE provides true encapsulation via closure, preventing accidental state mutations from outside code. Classes in ES6 don't have true private properties (without # fields in ES2022) and require defensive copying. For a game where state integrity is critical, IIFE is superior.

**IIFE vs Global Object:** Global objects are tempting for simplicity but lead to subtle bugs. The slight added complexity of IIFE (closure) is repaid a hundredfold when refactoring or debugging state issues.

**Browser compatibility:** IIFE uses ES5 features that work in all browsers. Classes use ES6 which is fine for modern browser/iPad targets, but IIFE is actually more portable.

### Consequences

**What becomes easier:**
- State mutations are predictable and traceable
- Debugging state issues (use debugger, set breakpoints in module)
- Resetting game state (no need to clear globals)
- Testing (can test public API in isolation)
- Avoiding unintended side effects

**What becomes harder:**
- Understanding requires grasping closures
- Can't easily inspect "private" state without getState() method
- Harder to extend with new behavior later
- Multiple instances of game require separate IIFE (not a problem, just different)

**What we'll need to revisit:**
- If we need to run multiple game instances (unlikely for single-player), refactor to class-based
- If state becomes very complex, consider state machine pattern (XState library)
- If testing requirements grow, add a testing utility to expose private state

---

## ADR-004: Sound - Web Audio API vs Audio Elements vs No Sound

**Status:** Accepted
**Date:** 2026-04-06
**Deciders:** Andy

### Context
The game should have audio feedback (card plays, victories, action sounds) to increase engagement. We want to avoid external audio files (which break offline play) and keep deployment simple.

### Decision
Use Web Audio API to generate sounds procedurally. No external audio files or Audio elements. All sounds synthesized via oscillators and envelopes.

### Options Considered

#### Option A: Web Audio API (Procedural)
| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium (requires oscillator understanding) |
| File size | Minimal (code, no audio assets) |
| Offline capability | Perfect (no files needed) |
| Quality | Medium (retro/8-bit aesthetic) |
| Loading time | Instant |

**Pros:**
- No external audio files (offline by design)
- Tiny code footprint (100-300 lines for all sounds)
- Works on all platforms
- Fast loading (no asset downloads)
- Fun retro aesthetic (beeps, boops)
- Synth sounds can be tweaked in real-time

**Cons:**
- Requires oscillator/envelope knowledge
- Can sound cheap if done poorly
- Limited to synthesis (no realistic instruments)
- Browser Audio Context may require user interaction to unmute

#### Option B: HTML5 Audio Elements + Files
| Dimension | Assessment |
|-----------|------------|
| Complexity | Low (straightforward API) |
| File size | Medium (audio assets add size) |
| Offline capability | Full (must cache files in service worker) |
| Quality | High (professional audio quality) |
| Loading time | Depends on file size |

**Pros:**
- High-quality professional audio
- Simple API (play(), pause())
- Designers can record custom sounds
- Better user experience if done well

**Cons:**
- Requires audio asset files (MP3, OGG, WAV)
- Service worker must cache all audio files
- Larger deployment size (audio files are big)
- Offline caching strategy becomes complex
- Breaks single-file simplicity

#### Option C: No Sound
| Dimension | Assessment |
|-----------|------------|
| Complexity | None |
| File size | No change |
| Offline capability | N/A |
| Quality | N/A |
| Loading time | Instant |

**Pros:**
- Simplest possible implementation
- No audio context shenanigans
- Faster development

**Cons:**
- Less engaging gameplay
- Missing feedback cue for actions
- Feels unfinished

### Trade-off Analysis

**Web Audio API vs Audio Files:** Audio files sound better but add size and complexity to the offline strategy. Web Audio API sounds are synthesized (retro beep/boop aesthetic) but cost nothing in terms of file size and work perfectly offline. For a card game, synthesized sounds are entirely appropriate and charming.

**Quality vs Simplicity:** Professional audio files are nicer but conflict with the single-file, zero-dependency philosophy. Synthesized sound trades some polish for portability and deployment simplicity.

**Offline-first:** Web Audio API is offline-first by nature. Audio files require explicit service worker caching and create a dependency on asset loading.

### Consequences

**What becomes easier:**
- No asset pipeline (sounds are code, not files)
- Offline play is guaranteed to have sound
- Tweaking sounds is fast (change code, refresh)
- Fast game startup (no audio files to load)

**What becomes harder:**
- Creating polished audio (requires synthesis knowledge)
- Users with audio turned off globally won't hear anything
- Sound design is more technical, less creative

**What we'll need to revisit:**
- If users want music/high-quality sound, add an optional audio file and service worker caching
- If synthesis sounds too cheap, record small audio samples (1-2 KB each) for key sounds
- Consider adding a mute button (required on iOS anyway for UX)

---

## ADR-005: AI Strategy - Simple Greedy vs Minimax vs Rule-based

**Status:** Accepted
**Date:** 2026-04-06
**Deciders:** Andy

### Context
The game needs a non-trivial opponent AI. Version 4 used simple greedy (play the highest-value card available), which was predictable. We want personality and some strategic depth without overkill complexity.

### Decision
Implement rule-based AI with weighted priorities. AI evaluates cards using a priority function that considers board state, threats, and strategic goals. This provides varied, believable play without minimax complexity.

### Options Considered

#### Option A: Simple Greedy (Highest Value)
```javascript
// Pick card with highest attack/value
const bestCard = hand.reduce((best, card) =>
  card.value > best.value ? card : best
);
```

| Dimension | Assessment |
|-----------|------------|
| Complexity | Very Low |
| Predictability | High (always same strategy) |
| Code size | 5-10 lines |
| Computation time | Instant |
| Fun factor | Low (boring) |

**Pros:**
- Dead simple to implement
- Instant decision-making
- Deterministic (easy to test)

**Cons:**
- Extremely predictable
- No personality
- Easy for human to exploit
- Gets boring quickly

#### Option B: Minimax with Alpha-Beta Pruning
| Dimension | Assessment |
|-----------|------------|
| Complexity | High |
| Predictability | Low (truly optimal play) |
| Code size | 200-500 lines |
| Computation time | Slow (exponential tree search) |
| Fun factor | High (strong opponent) |

**Pros:**
- Theoretically optimal play
- Strong opponent
- True strategic depth

**Cons:**
- Overkill for a casual kids game
- Slow (especially with deep trees)
- No personality (purely mathematical)
- Hard to debug and tune
- Not fun to play against (always loses to human)

#### Option C: Rule-based with Weighted Priorities
```javascript
const cardScore = (card, gameState) => {
  let score = card.baseValue;
  if (gameState.opponentThreatened) score += 50; // prioritize defense
  if (card.hasCombo) score += 30; // combo cards valuable
  if (opponentHasLowHealth) score -= 20; // attacking is less urgent
  return score + Math.random() * 5; // slight randomness
};
```

| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium |
| Predictability | Medium (varied but understandable) |
| Code size | 50-150 lines |
| Computation time | Instant |
| Fun factor | Medium-High (fun, beatable) |

**Pros:**
- Emergent interesting behavior
- Easy to tune and balance
- Instant decision-making
- Easy to debug (inspect score for each card)
- Personality (different weights = different playstyles)
- Human-beatable (not frustrating)

**Cons:**
- Requires tuning weights
- Not theoretically optimal
- May seem random if weights are wrong

### Trade-off Analysis

**Greedy vs Rule-based:** Greedy is simple but boring. Rule-based adds only 50 lines and creates personality. For a game Andy will play repeatedly, personality is worth the modest complexity.

**Rule-based vs Minimax:** Minimax is overkill. A card game for kids benefits from a strong but beatable opponent with personality. Rule-based achieves this at 1/10th the code complexity. Minimax makes the game feel like playing a calculator, which is no fun.

**Randomness:** Adding small random noise (±5%) to card scores prevents the AI from feeling robotic while keeping decisions sound. Weights remain the source of truth.

**Tuning philosophy:** Start with base card value. Add weight bonuses for: (1) defensive needs, (2) combo opportunities, (3) board state threats. This creates an AI that plays like a reasonable human.

### Consequences

**What becomes easier:**
- Opponent feels alive and reactive
- Easy to tune difficulty (multiply weights)
- Easy to add new priority factors (board control, hand size, etc.)
- Debugging (score each card and log weights)
- Replayability (different strategies on different games)

**What becomes harder:**
- Finding the "right" weights requires playtesting
- May need periodic rebalancing
- Not guaranteed optimal play (but that's the point)

**What we'll need to revisit:**
- After playtesting, tune weights based on win/loss ratios
- If AI seems unfair, add difficulty modes (easy/normal/hard = different weights)
- If AI becomes predictable, add more priority factors (hand size, tempo, etc.)

---

## ADR-006: Card Data - Inline JSON vs External File

**Status:** Accepted
**Date:** 2026-04-06
**Deciders:** Andy

### Context
The game needs card definitions (stats, abilities, costs). We must decide whether to embed card data in the HTML or load it from an external JSON file.

### Decision
Inline all card data as JavaScript objects in the HTML file. No external JSON file or fetch() call.

### Options Considered

#### Option A: Inline JavaScript Objects
```javascript
const CARDS = {
  soldier: {
    name: "Soldier",
    cost: 1,
    attack: 2,
    health: 1,
    ability: "None"
  },
  // ... all cards defined here
};
```

| Dimension | Assessment |
|-----------|------------|
| Complexity | Very Low |
| Deployment | Single file (no fetch) |
| Loading | Instant (parsed with HTML) |
| Editability | Easy (text editor, version control) |
| Offline capability | Perfect |

**Pros:**
- Single file deployment
- Works with file:// protocol
- Instant loading (no fetch round-trip)
- Easy to edit in text editor
- Version controlled together with code
- No network errors possible

**Cons:**
- Mixes data with code
- Slightly larger HTML file
- Harder to load into external tools (card builder, balance spreadsheet)
- No separation of concerns

#### Option B: External JSON File + Fetch
```javascript
const cards = await fetch('cards.json').then(r => r.json());
```

| Dimension | Assessment |
|-----------|------------|
| Complexity | Low |
| Deployment | Requires server + proper CORS/caching |
| Loading | One HTTP request (network latency) |
| Editability | Easy (edit JSON file separately) |
| Offline capability | Requires service worker caching |

**Pros:**
- Separates data from code
- Easier to share card data with external tools
- Smaller code file size
- Can load different card sets

**Cons:**
- Requires HTTP server (breaks file:// protocol)
- Requires explicit service worker caching for offline
- Extra fetch() call adds latency
- Breaks single-file deployment model
- Potential CORS issues
- Network error handling required

#### Option C: CSV/Google Sheets Import
| Dimension | Assessment |
|-----------|------------|
| Complexity | High |
| Deployment | Complex (requires build step) |
| Loading | Build-time conversion to JSON/JS |
| Editability | Easy for non-developers (spreadsheet UI) |
| Offline capability | After build, yes |

**Pros:**
- Non-developers can edit cards in familiar UI
- Good for balance iteration

**Cons:**
- Requires build process
- Breaks simplicity goal
- Dependency on CSV parser or Google Sheets API
- Overkill for initial development

### Trade-off Analysis

**Inline vs External:** Inline data keeps the single-file deployment model and file:// protocol support. External JSON requires a server and service worker caching. For initial development, inline data is simpler.

**Data/Code separation:** The philosophical advantage of separating data from code is real, but it's premature at version 1. If card balance becomes a frequent task, we can refactor to external JSON later (it's just a string replace and fetch() call).

**Sharing and iteration:** If we need to iterate on card balance with non-technical stakeholders, we can build a quick balance spreadsheet and convert to inline objects. No need to commit to complexity upfront.

### Consequences

**What becomes easier:**
- Single-file simplicity maintained
- File:// protocol support preserved
- No fetch() errors to handle
- Cards load instantly with page
- Easy to version control
- Easy to search/grep card data

**What becomes harder:**
- Large card list makes HTML file bigger
- Harder to share card data with designers in Excel
- Harder to build external tools (card viewer, balance calc)

**What we'll need to revisit:**
- If card list grows past 50 cards, consider extracting to external JSON
- If we need to balance cards with non-technical players, build a balance spreadsheet
- If multiplayer sync is needed, move to server-loaded cards (with fetch)

---

## Summary Table

| Decision | Chosen | Rationale |
|----------|--------|-----------|
| **Deployment Model** | PWA | Home screen install on iPad + offline play + simple web distribution |
| **Architecture** | Single HTML + manifest + SW | Simplicity + file:// protocol support + no build tools |
| **State Management** | IIFE Module Pattern | True encapsulation + proven in game dev + closure-based privacy |
| **Sound** | Web Audio API (Procedural) | Offline-first + tiny code footprint + retro charm |
| **AI** | Rule-based with Weights | Personality + instant decisions + easy tuning |
| **Card Data** | Inline JavaScript Objects | Single-file simplicity + version control + no fetch() calls |

All decisions prioritize **simplicity, offline-first capability, and deployment speed** while maintaining **code quality and fun gameplay experience**.
