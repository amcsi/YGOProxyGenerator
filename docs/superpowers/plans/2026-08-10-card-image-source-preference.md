# Card Image Source Preference Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prefer YGOProDeck images via direct passcode URLs from DuelingBook JSON when possible, add a persisted “Prefer DuelingBook images” checkbox, and support per-line `[db]` / `[ypd]` overrides.

**Architecture:** New `js/image_source.js` builds an ordered list of fetch attempts (`duelingbook` | `ygoprodeck-direct` | `ygoprodeck-api`) from global preference + per-line override. `decklist_parse.js` gains deckline tag parsing. `main_script.js` walks attempts with existing XHR helpers; checkbox + `localStorage` wire the default preference.

**Tech Stack:** Vanilla browser JS (UMD modules like existing `duelingbook.js` / `decklist_parse.js`), Node’s built-in test runner (`node --test`), static HTML.

**Spec:** `docs/superpowers/specs/2026-08-10-card-image-source-preference-design.md`

## Global Constraints

- Source tags are `[db]` and `[ypd]` only (not `[ygo]`)
- Checkbox label exactly: Prefer DuelingBook images
- `localStorage` key exactly: `preferDuelingBookImages`; default / corrupt → prefer DB (`true`)
- YPD direct URL only when `artIndex === 0` and a usable passcode exists; else YPD uses API
- Always fall back across remaining attempts on failure
- Direct `http(s)://` lines bypass resolver (unchanged)
- Match existing UMD module style (no bundler, no new dependencies)
- Keep Cloudinary rewrite behavior as implemented today (no `q_auto,f_auto,h_520`)

## File structure

| File | Role |
|------|------|
| `js/image_source.js` | **Create** — `resolveAttempts`, YPD direct URL helpers, prefer-DB storage helpers |
| `tests/image_source.test.js` | **Create** — unit tests for resolver + URL/passcode helpers |
| `js/decklist_parse.js` | **Modify** — add `parseDecklistLine` |
| `tests/decklist_parse.test.js` | **Modify** — fix stale Cloudinary expectation; add parse tests |
| `js/main_script.js` | **Modify** — attempt walker, parse lines via `parseDecklistLine`, checkbox init |
| `html/index.html` | **Modify** — checkbox, script tag, howto/footer copy |

`js/duelingbook.js` stays unchanged (reuse `findMatches` / `imageUrlForRow`).

---

### Task 1: Fix stale Cloudinary test expectation

**Files:**
- Modify: `tests/decklist_parse.test.js`
- Test: `tests/decklist_parse.test.js`

**Interfaces:**
- Consumes: existing `rewriteYgoProDeckImageUrl` (no `q_auto,f_auto,h_520` in path)
- Produces: green baseline for `node --test tests/*.test.js`

- [ ] **Step 1: Update the expected Cloudinary URL**

In `tests/decklist_parse.test.js`, change the `cloudinaryUrl` constant used by `rewrites YGOProDeck card images off the original host` from:

```javascript
const cloudinaryUrl =
  'https://res.cloudinary.com/drkxqkguu/image/upload/q_auto,f_auto,h_520/yugioh/46986414.jpg';
```

to:

```javascript
const cloudinaryUrl =
  'https://res.cloudinary.com/drkxqkguu/image/upload/yugioh/46986414.jpg';
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `node --test tests/*.test.js`

Expected: all tests pass (15 pass, 0 fail)

- [ ] **Step 3: Commit**

```bash
git add tests/decklist_parse.test.js
git commit -m "$(cat <<'EOF'
Fix Cloudinary URL expectation in decklist parse tests.

EOF
)"
```

---

### Task 2: `image_source` — passcode + YPD direct URL helpers

**Files:**
- Create: `js/image_source.js`
- Create: `tests/image_source.test.js`

**Interfaces:**
- Consumes: nothing from later tasks
- Produces:
  - `passcodeFromRow(row) → string|null` — `s` if present and usable, else `s2`; treat `null`/`undefined`/`''`/`0` as missing
  - `unpadPasscodeForYpd(passcode) → string` — strip leading zeros; may be `''`
  - `ypdDirectUrl(passcode) → string|null` — `https://images.ygoprodeck.com/images/cards/{unpadded}.jpg`, or `null` if unpadded empty
  - UMD global name: `YGOImageSource`

- [ ] **Step 1: Write the failing tests**

Create `tests/image_source.test.js`:

```javascript
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  passcodeFromRow,
  unpadPasscodeForYpd,
  ypdDirectUrl
} = require('../js/image_source.js');

describe('passcodeFromRow', () => {
  it('prefers s over s2', () => {
    assert.equal(passcodeFromRow({ s: 6637331, s2: '999' }), '6637331');
  });

  it('uses s2 when s is missing or zero', () => {
    assert.equal(passcodeFromRow({ s: 0, s2: '89631140' }), '89631140');
    assert.equal(passcodeFromRow({ s2: '89631140' }), '89631140');
  });

  it('returns null when neither usable', () => {
    assert.equal(passcodeFromRow({ s: 0 }), null);
    assert.equal(passcodeFromRow({}), null);
  });
});

describe('unpadPasscodeForYpd', () => {
  it('strips leading zeros', () => {
    assert.equal(unpadPasscodeForYpd('06637331'), '6637331');
    assert.equal(unpadPasscodeForYpd(6637331), '6637331');
  });

  it('returns empty string when all zeros', () => {
    assert.equal(unpadPasscodeForYpd('0'), '');
    assert.equal(unpadPasscodeForYpd('000'), '');
  });
});

describe('ypdDirectUrl', () => {
  it('builds unpadded YGOProDeck card image URL', () => {
    assert.equal(
      ypdDirectUrl('06637331'),
      'https://images.ygoprodeck.com/images/cards/6637331.jpg'
    );
  });

  it('returns null when passcode unpads to empty', () => {
    assert.equal(ypdDirectUrl('0'), null);
    assert.equal(ypdDirectUrl(null), null);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/image_source.test.js`

Expected: FAIL (module not found / exports missing)

- [ ] **Step 3: Write minimal implementation**

Create `js/image_source.js` with the same UMD wrapper pattern as `js/duelingbook.js`:

```javascript
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.YGOImageSource = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  function isMissingPasscode(value) {
    return value === undefined || value === null || value === '' || value === 0;
  }

  function passcodeFromRow(row) {
    if (!row) {
      return null;
    }
    if (!isMissingPasscode(row.s)) {
      return String(row.s);
    }
    if (!isMissingPasscode(row.s2)) {
      return String(row.s2);
    }
    return null;
  }

  function unpadPasscodeForYpd(passcode) {
    if (passcode === undefined || passcode === null || passcode === '') {
      return '';
    }
    return String(passcode).replace(/^0+/, '');
  }

  function ypdDirectUrl(passcode) {
    var unpadded = unpadPasscodeForYpd(passcode);
    if (!unpadded) {
      return null;
    }
    return 'https://images.ygoprodeck.com/images/cards/' + unpadded + '.jpg';
  }

  return {
    passcodeFromRow: passcodeFromRow,
    unpadPasscodeForYpd: unpadPasscodeForYpd,
    ypdDirectUrl: ypdDirectUrl
  };
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/image_source.test.js`

Expected: all tests in this file PASS

- [ ] **Step 5: Commit**

```bash
git add js/image_source.js tests/image_source.test.js
git commit -m "$(cat <<'EOF'
Add YGOProDeck direct URL helpers from DB passcodes.

EOF
)"
```

---

### Task 3: `resolveAttempts` ordering

**Files:**
- Modify: `js/image_source.js`
- Modify: `tests/image_source.test.js`

**Interfaces:**
- Consumes: `passcodeFromRow`, `ypdDirectUrl`; `YGODuelingBook.findMatches` / `imageUrlForRow` passed in via optional `findMatches` / `imageUrlForRow` deps **or** require `../js/duelingbook.js` inside the factory when in Node / assume globals in browser
- Produces:
  - `resolveAttempts({ cardNameOrId, artIndex, preferDb, override, dbIndexes }) → Attempt[]`
  - Attempt shapes:
    - `{ type: 'duelingbook', url: string }`
    - `{ type: 'ygoprodeck-direct', url: string }`
    - `{ type: 'ygoprodeck-api', cardNameOrId: string, artIndex: number }`
  - `override`: `'db' | 'ypd' | null | undefined`
  - `dbIndexes`: indexes object or `null`/`undefined` (catalog unavailable)

**Dependency note:** Implement `resolveAttempts` by requiring/using `YGODuelingBook` the same way other browser scripts use globals. For Node tests, either:

1. Pass `findMatches` and `imageUrlForRow` as optional fields on the options object (preferred for testability), defaulting to `YGODuelingBook.*` when omitted, **or**
2. `require('./duelingbook.js')` inside the factory when `typeof require` works.

Use option **1** (injectable defaults):

```javascript
function resolveAttempts(options) {
  var findMatches = options.findMatches || defaultFindMatches;
  var imageUrlForRow = options.imageUrlForRow || defaultImageUrlForRow;
  // ...
}
```

In the UMD factory, set defaults from `root.YGODuelingBook` when present; in Node tests, always pass `findMatches` / `imageUrlForRow` from `require('../js/duelingbook.js')`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/image_source.test.js`:

```javascript
const {
  buildIndexes,
  findMatches,
  imageUrlForRow
} = require('../js/duelingbook.js');
const { resolveAttempts } = require('../js/image_source.js');

const fixtureCards = [
  { id: 6, n: '4-Starred Ladybug of Doom', s: 83994646 },
  { id: 513, n: 'Blue-Eyes White Dragon', s: 89631139 },
  { id: 4916, n: 'Blue-Eyes White Dragon', s: 89631139, s2: '89631140' }
];
const indexes = buildIndexes(fixtureCards);
const dbOpts = { findMatches, imageUrlForRow };

describe('resolveAttempts', () => {
  it('preferDb: duelingbook then ypd-direct then ypd-api for art 0', () => {
    const attempts = resolveAttempts({
      cardNameOrId: '4-Starred Ladybug of Doom',
      artIndex: 0,
      preferDb: true,
      override: null,
      dbIndexes: indexes,
      ...dbOpts
    });
    assert.deepEqual(
      attempts.map((a) => a.type),
      ['duelingbook', 'ygoprodeck-direct', 'ygoprodeck-api']
    );
    assert.equal(attempts[0].url, 'https://images.duelingbook.com/cards/6.jpg');
    assert.equal(
      attempts[1].url,
      'https://images.ygoprodeck.com/images/cards/83994646.jpg'
    );
    assert.equal(attempts[2].cardNameOrId, '4-Starred Ladybug of Doom');
    assert.equal(attempts[2].artIndex, 0);
  });

  it('prefer YPD: direct then api then duelingbook for art 0', () => {
    const attempts = resolveAttempts({
      cardNameOrId: '4-Starred Ladybug of Doom',
      artIndex: 0,
      preferDb: false,
      override: null,
      dbIndexes: indexes,
      ...dbOpts
    });
    assert.deepEqual(
      attempts.map((a) => a.type),
      ['ygoprodeck-direct', 'ygoprodeck-api', 'duelingbook']
    );
  });

  it('override ypd beats preferDb', () => {
    const attempts = resolveAttempts({
      cardNameOrId: '4-Starred Ladybug of Doom',
      artIndex: 0,
      preferDb: true,
      override: 'ypd',
      dbIndexes: indexes,
      ...dbOpts
    });
    assert.equal(attempts[0].type, 'ygoprodeck-direct');
  });

  it('override db beats prefer YPD', () => {
    const attempts = resolveAttempts({
      cardNameOrId: '4-Starred Ladybug of Doom',
      artIndex: 0,
      preferDb: false,
      override: 'db',
      dbIndexes: indexes,
      ...dbOpts
    });
    assert.equal(attempts[0].type, 'duelingbook');
  });

  it('artIndex > 0 skips ypd-direct and uses api', () => {
    const attempts = resolveAttempts({
      cardNameOrId: 'Blue-Eyes White Dragon',
      artIndex: 1,
      preferDb: true,
      override: null,
      dbIndexes: indexes,
      ...dbOpts
    });
    assert.deepEqual(
      attempts.map((a) => a.type),
      ['duelingbook', 'ygoprodeck-api']
    );
    assert.equal(attempts[0].url, 'https://images.duelingbook.com/cards/4916.jpg');
    assert.equal(attempts[1].artIndex, 1);
  });

  it('missing dbIndexes omits db and direct', () => {
    const attempts = resolveAttempts({
      cardNameOrId: 'Dark Magician',
      artIndex: 0,
      preferDb: true,
      override: null,
      dbIndexes: null,
      ...dbOpts
    });
    assert.deepEqual(
      attempts.map((a) => a.type),
      ['ygoprodeck-api']
    );
  });

  it('no DB match omits db and direct, keeps api', () => {
    const attempts = resolveAttempts({
      cardNameOrId: 'Not A Real Card',
      artIndex: 0,
      preferDb: false,
      override: null,
      dbIndexes: indexes,
      ...dbOpts
    });
    assert.deepEqual(
      attempts.map((a) => a.type),
      ['ygoprodeck-api']
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/image_source.test.js`

Expected: FAIL (`resolveAttempts` not exported)

- [ ] **Step 3: Implement `resolveAttempts`**

Add to `js/image_source.js` (inside the factory), including injectable DB helpers:

```javascript
function resolveAttempts(options) {
  var cardNameOrId = options.cardNameOrId;
  var artIndex = options.artIndex == null ? 0 : options.artIndex;
  var preferDb = options.preferDb !== false; // default true if undefined
  var override = options.override || null;
  var dbIndexes = options.dbIndexes;
  var findMatchesFn = options.findMatches;
  var imageUrlForRowFn = options.imageUrlForRow;

  var effectivePreferDb =
    override === 'db' ? true : override === 'ypd' ? false : !!preferDb;

  var row = null;
  if (dbIndexes && findMatchesFn) {
    var matches = findMatchesFn(dbIndexes, cardNameOrId);
    row = matches[artIndex] || null;
  }

  var dbAttempt = null;
  if (row && imageUrlForRowFn) {
    dbAttempt = { type: 'duelingbook', url: imageUrlForRowFn(row) };
  }

  var ypdAttempts = [];
  if (artIndex === 0 && row) {
    var direct = ypdDirectUrl(passcodeFromRow(row));
    if (direct) {
      ypdAttempts.push({ type: 'ygoprodeck-direct', url: direct });
    }
  }
  ypdAttempts.push({
    type: 'ygoprodeck-api',
    cardNameOrId: cardNameOrId,
    artIndex: artIndex
  });

  // If catalog missing / no row: only api (already in ypdAttempts without direct)
  if (!dbIndexes) {
    return [{ type: 'ygoprodeck-api', cardNameOrId: cardNameOrId, artIndex: artIndex }];
  }

  if (effectivePreferDb) {
    return (dbAttempt ? [dbAttempt] : []).concat(ypdAttempts);
  }
  return ypdAttempts.concat(dbAttempt ? [dbAttempt] : []);
}
```

Export `resolveAttempts` on the returned object.

**Important:** When `dbIndexes` is null, return **only** `ygoprodeck-api` (do not also append a doomed DB attempt). When indexes exist but no row, prefer-YPD path should be `[ygoprodeck-api]` only; prefer-DB path same. The snippet above handles null indexes early; for no-row with indexes present, `dbAttempt` is null and direct is skipped — `ypdAttempts` is `[ygoprodeck-api]` only. Good.

Fix default `preferDb`: callers always pass boolean; for the function itself use `options.preferDb` as given when `override` is null — do **not** coerce `false` away:

```javascript
var preferDb = options.preferDb;
var effectivePreferDb =
  override === 'db' ? true : override === 'ypd' ? false : preferDb;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/image_source.test.js`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add js/image_source.js tests/image_source.test.js
git commit -m "$(cat <<'EOF'
Add image source attempt resolver with DB/YPD ordering.

EOF
)"
```

---

### Task 4: Prefer-DB `localStorage` helpers

**Files:**
- Modify: `js/image_source.js`
- Modify: `tests/image_source.test.js`

**Interfaces:**
- Consumes: none
- Produces:
  - `PREFER_DB_STORAGE_KEY === 'preferDuelingBookImages'`
  - `readPreferDb(storage) → boolean` — missing/corrupt → `true`; only `'false'` (string) is false
  - `writePreferDb(storage, value) → void` — writes `'true'` or `'false'`

- [ ] **Step 1: Write the failing tests**

```javascript
const {
  PREFER_DB_STORAGE_KEY,
  readPreferDb,
  writePreferDb
} = require('../js/image_source.js');

describe('preferDb storage', () => {
  it('defaults to true when missing or corrupt', () => {
    const mem = {
      getItem: () => null
    };
    assert.equal(readPreferDb(mem), true);
    assert.equal(
      readPreferDb({ getItem: () => 'nope' }),
      true
    );
  });

  it('reads false only for string false', () => {
    assert.equal(
      readPreferDb({ getItem: () => 'false' }),
      false
    );
    assert.equal(
      readPreferDb({ getItem: () => 'true' }),
      true
    );
  });

  it('writes true/false strings under the spec key', () => {
    const store = {};
    const mem = {
      getItem: (k) => store[k],
      setItem: (k, v) => {
        store[k] = v;
      }
    };
    writePreferDb(mem, false);
    assert.equal(store[PREFER_DB_STORAGE_KEY], 'false');
    writePreferDb(mem, true);
    assert.equal(store[PREFER_DB_STORAGE_KEY], 'true');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/image_source.test.js`

Expected: FAIL (exports missing)

- [ ] **Step 3: Implement helpers**

```javascript
var PREFER_DB_STORAGE_KEY = 'preferDuelingBookImages';

function readPreferDb(storage) {
  try {
    var raw = storage.getItem(PREFER_DB_STORAGE_KEY);
    if (raw === 'false') {
      return false;
    }
    return true;
  } catch (e) {
    return true;
  }
}

function writePreferDb(storage, value) {
  storage.setItem(PREFER_DB_STORAGE_KEY, value ? 'true' : 'false');
}
```

Export them.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/image_source.test.js`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add js/image_source.js tests/image_source.test.js
git commit -m "$(cat <<'EOF'
Add preferDuelingBookImages localStorage helpers.

EOF
)"
```

---

### Task 5: `parseDecklistLine` for `[db]` / `[ypd]` / `[n]`

**Files:**
- Modify: `js/decklist_parse.js`
- Modify: `tests/decklist_parse.test.js`

**Interfaces:**
- Consumes: existing `extractDirectImageUrl`
- Produces:
  - `parseDecklistLine(line) → { amount, cardNameOrId, artIndex, override, directUrl }`
  - `override`: `'db' | 'ypd' | null`
  - `artIndex`: number, default `0`
  - `directUrl`: string or `null`
  - For URL lines: do not apply source tags (`override: null`, `artIndex: 0`); `cardNameOrId` is the remainder after qty (as today)

**Tag peeling algorithm (last wins):**

1. Trim line; parse optional leading qty `^([1-9][0-9]*)\s+(.*)$`.
2. If `extractDirectImageUrl(rest)` → return early with that URL, `override: null`, `artIndex: 0`.
3. Repeatedly match trailing `\s*\[(db|ypd|\d+)\]\s*$` (case-insensitive for db/ypd), collect tags from the end via `unshift` so the array is left-to-right, shrink `rest` to the left capture (trim end).
4. Walk collected tags left → right: numeric → `artIndex`; `db`/`ypd` → `override` (last wins).
5. `cardNameOrId` = remaining `rest` trimmed. Unknown brackets stay in the name because they never peel.

- [ ] **Step 1: Write the failing tests**

Add to `tests/decklist_parse.test.js`:

```javascript
const { parseDecklistLine } = require('../js/decklist_parse.js');

describe('parseDecklistLine', () => {
  it('parses name and default art index', () => {
    assert.deepEqual(parseDecklistLine('Dark Magician'), {
      amount: 1,
      cardNameOrId: 'Dark Magician',
      artIndex: 0,
      override: null,
      directUrl: null
    });
  });

  it('parses qty, art index, and ypd override with spaces', () => {
    assert.deepEqual(parseDecklistLine('2 Card Name [ypd] [0]'), {
      amount: 2,
      cardNameOrId: 'Card Name',
      artIndex: 0,
      override: 'ypd',
      directUrl: null
    });
  });

  it('accepts either tag order without spaces', () => {
    assert.deepEqual(parseDecklistLine('Card [1][db]'), {
      amount: 1,
      cardNameOrId: 'Card',
      artIndex: 1,
      override: 'db',
      directUrl: null
    });
    assert.deepEqual(parseDecklistLine('Card [db][1]'), {
      amount: 1,
      cardNameOrId: 'Card',
      artIndex: 1,
      override: 'db',
      directUrl: null
    });
  });

  it('last source tag wins', () => {
    assert.equal(parseDecklistLine('Card [db] [ypd]').override, 'ypd');
  });

  it('leaves unknown brackets in the name', () => {
    const parsed = parseDecklistLine('Card [foo]');
    assert.equal(parsed.cardNameOrId, 'Card [foo]');
    assert.equal(parsed.override, null);
  });

  it('ignores source tags for direct URL lines', () => {
    const parsed = parseDecklistLine(
      '3 Dark Magician https://example.com/art.jpg'
    );
    assert.equal(parsed.directUrl, 'https://example.com/art.jpg');
    assert.equal(parsed.override, null);
    assert.equal(parsed.artIndex, 0);
    assert.equal(parsed.amount, 3);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/decklist_parse.test.js`

Expected: FAIL (`parseDecklistLine` missing)

- [ ] **Step 3: Implement `parseDecklistLine`**

In `js/decklist_parse.js`, add and export:

```javascript
function parseDecklistLine(line) {
  var trimmed = String(line).trim();
  var amount = 1;
  var rest = trimmed;
  var qtyMatch = trimmed.match(/^([1-9][0-9]*)\s+(.*)$/);
  if (qtyMatch) {
    amount = parseInt(qtyMatch[1], 10);
    rest = qtyMatch[2];
  }

  var directUrl = extractDirectImageUrl(rest);
  if (directUrl) {
    return {
      amount: amount,
      cardNameOrId: rest,
      artIndex: 0,
      override: null,
      directUrl: directUrl
    };
  }

  var tags = [];
  var tagMatch;
  var tagPattern = /^(.*?)\s*\[(db|ypd|\d+)\]\s*$/i;
  while ((tagMatch = rest.match(tagPattern))) {
    tags.unshift(tagMatch[2]);
    rest = tagMatch[1].replace(/\s+$/, '');
  }

  var artIndex = 0;
  var override = null;
  for (var i = 0; i < tags.length; i++) {
    var tag = tags[i];
    var lower = tag.toLowerCase();
    if (lower === 'db' || lower === 'ypd') {
      override = lower;
    } else {
      artIndex = parseInt(tag, 10);
    }
  }

  return {
    amount: amount,
    cardNameOrId: rest.replace(/^\s+|\s+$/g, ''),
    artIndex: artIndex,
    override: override,
    directUrl: null
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/decklist_parse.test.js`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add js/decklist_parse.js tests/decklist_parse.test.js
git commit -m "$(cat <<'EOF'
Parse per-line [db]/[ypd] image source overrides in decklists.

EOF
)"
```

---

### Task 6: Wire resolver into `main_script.js` fetch path

**Files:**
- Modify: `js/main_script.js` (`getImageUrl`, `generateProxies` loop ~151–221)
- Modify: `html/index.html` (add `<script src="../js/image_source.js"></script>` **before** `main_script.js`)

**Interfaces:**
- Consumes: `YGOImageSource.resolveAttempts`, `YGODecklistParse.parseDecklistLine`, `YGODuelingBook.findMatches` / `imageUrlForRow`
- Produces: generation uses attempt list; failures still accumulate in `failedLines`

- [ ] **Step 1: Add script tag**

In `html/index.html`, after `duelingbook.js` and before `main_script.js`:

```html
<script src="../js/image_source.js"></script>
```

- [ ] **Step 2: Replace `getImageUrl` with attempt walker**

Replace `getImageUrl` in `js/main_script.js` with logic equivalent to:

```javascript
function runImageAttempts(attempts) {
  var chain = Promise.reject(new Error('no-attempts'));
  for (var i = 0; i < attempts.length; i++) {
    (function (attempt) {
      chain = chain.catch(function () {
        if (attempt.type === 'duelingbook' || attempt.type === 'ygoprodeck-direct') {
          return requestArrayBuffer(attempt.url);
        }
        if (attempt.type === 'ygoprodeck-api') {
          return getYgoProDeckImage(attempt.cardNameOrId, attempt.artIndex);
        }
        return Promise.reject(new Error('unknown-attempt'));
      });
    })(attempts[i]);
  }
  return chain;
}

function getImageUrl(cardNameOrId, versionNumber, preferDb, override) {
  return function () {
    return loadDuelingBookIndexes()
      .then(function (indexes) {
        return indexes;
      })
      .catch(function () {
        return null;
      })
      .then(function (indexes) {
        var attempts = YGOImageSource.resolveAttempts({
          cardNameOrId: cardNameOrId,
          artIndex: versionNumber,
          preferDb: preferDb,
          override: override,
          dbIndexes: indexes,
          findMatches: YGODuelingBook.findMatches,
          imageUrlForRow: YGODuelingBook.imageUrlForRow
        });
        return runImageAttempts(attempts);
      });
  };
}
```

- [ ] **Step 3: Use `parseDecklistLine` in `generateProxies`**

Replace the regex-based parse block with:

```javascript
var parsed = YGODecklistParse.parseDecklistLine(lines[i]);
if (parsed && parsed.cardNameOrId !== '') {
  var amount = parsed.amount;
  var versionNumber = parsed.artIndex;
  var cardToken = parsed.cardNameOrId;
  var directUrl = parsed.directUrl;
  var preferDb = YGOImageSource.readPreferDb(localStorage);
  // Temporary until Task 7 wires checkbox: reading storage is correct default path
  var fetchImage = directUrl
    ? (function (url) {
        return function () {
          return requestArrayBuffer(url);
        };
      })(directUrl)
    : getImageUrl(cardToken, versionNumber, preferDb, parsed.override);
  overallProcess = overallProcess
    .then(fetchImage)
    .then(
      function (innerNumber) {
        return function (img) {
          return Promise.all(
            [...Array(innerNumber).keys()].map(function () {
              return addImageToDoc(doc)(img);
            })
          );
        };
      }(amount),
      function (line) {
        return function () {
          failedLines.push(line);
        };
      }(lines[i].trim())
    );
}
```

Skip empty lines: if `parseDecklistLine` yields empty `cardNameOrId` and no `directUrl`, continue.

Keep comment-line skipping (`//`, `#`, `!`) as today.

- [ ] **Step 4: Manual sanity check (optional in agent)**

Open the page, generate a one-card list `4-Starred Ladybug of Doom` and confirm PDF still builds (DB path). Spot-check console that prefer-YPD with art 0 can hit a `images.ygoprodeck.com` / Cloudinary URL without `cardinfo.php` when DB catalog loaded — full checkbox UI comes in Task 7.

- [ ] **Step 5: Run unit tests**

Run: `node --test tests/*.test.js`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add js/main_script.js html/index.html
git commit -m "$(cat <<'EOF'
Wire image source resolver into proxy generation fetch path.

EOF
)"
```

---

### Task 7: Checkbox UI, persistence, and howto copy

**Files:**
- Modify: `html/index.html` (settings grid + howto + footer)
- Modify: `js/main_script.js` (init checkbox from storage; change handler; read checkbox on generate)
- Modify: `html/style.css` only if the new row needs a trivial alignment tweak (prefer reuse `.grid` pattern)

**Interfaces:**
- Consumes: `YGOImageSource.readPreferDb` / `writePreferDb`
- Produces: checkbox `#prefer_duelingbook_images` checked by default; value synced to `localStorage`

- [ ] **Step 1: Add checkbox to settings**

Inside the settings `.grid` in `html/index.html` (after paper size row is fine):

```html
<input id="prefer_duelingbook_images" type="checkbox" checked />
<span class="preferdb">Prefer DuelingBook images</span>
```

- [ ] **Step 2: Init + change handler in `main_script.js`**

At end of `main_script.js` (or immediately-invoked after functions defined):

```javascript
(function initPreferDuelingBookCheckbox() {
  var el = document.getElementById('prefer_duelingbook_images');
  if (!el) {
    return;
  }
  el.checked = YGOImageSource.readPreferDb(localStorage);
  el.addEventListener('change', function () {
    YGOImageSource.writePreferDb(localStorage, el.checked);
  });
})();
```

In `generateProxies`, read preference from the checkbox if present, else storage:

```javascript
var preferEl = document.getElementById('prefer_duelingbook_images');
var preferDb = preferEl
  ? preferEl.checked
  : YGOImageSource.readPreferDb(localStorage);
```

Pass that `preferDb` into `getImageUrl(...)`.

- [ ] **Step 3: Update howto + footer**

Howto: mention the checkbox; document `[db]` / `[ypd]` overrides and that default art can use YGOProDeck URLs built from DuelingBook passcodes; keep art-index `[n]` docs.

Example howto additions (adapt tone to existing copy):

```html
Use the "Prefer DuelingBook images" checkbox to choose the default source (saved in this browser).<br>
Override per line with [db] or [ypd] (can combine with art index):<br>
Bystial Druiswurm [ypd]<br>
3 Cyber Dragon [1] [db]<br>
```

Footer: stop saying DuelingBook is always tried first; say order follows the setting / per-line tags.

- [ ] **Step 4: Manual verification**

1. Load page → checkbox checked.
2. Uncheck → reload → still unchecked.
3. Decklist with one `[ypd]` and one `[db]` line → both process (or only fail for truly bad names).
4. `node --test tests/*.test.js` still PASS.

- [ ] **Step 5: Commit**

```bash
git add html/index.html js/main_script.js html/style.css
git commit -m "$(cat <<'EOF'
Add Prefer DuelingBook images checkbox with localStorage.

EOF
)"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| YPD direct URL from DB passcode (unpadded) | 2, 3, 6 |
| Direct only for artIndex 0; else API | 3 |
| Prefer-DB checkbox default on + localStorage | 4, 7 |
| Per-line `[db]` / `[ypd]`, either order, optional space | 5 |
| Last tag wins; unknown brackets kept | 5 |
| Cross-source fallback on failure | 6 (`runImageAttempts`) |
| URL lines bypass resolver | 5, 6 |
| Catalog load failure → API only | 3, 6 |
| `image_source.js` module | 2–4 |
| Howto / UI | 7 |
| Stale Cloudinary test (baseline) | 1 |

## Plan self-review notes

- No TBD placeholders; attempt types and function signatures are fixed across tasks.
- `preferDb` default coercion bug called out and corrected in Task 3 (`false` must remain false).
- Task 6 may briefly read only `localStorage` before Task 7 adds the checkbox; Task 7 switches generate to prefer the checkbox DOM value.
