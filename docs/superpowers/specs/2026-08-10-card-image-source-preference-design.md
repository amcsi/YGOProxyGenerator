# Card image source preference & YGOProDeck direct URLs

## Goal

1. Prefer constructing YGOProDeck image URLs from DuelingBook catalog passcodes instead of calling the YGOProDeck cardinfo API whenever possible.
2. Add a UI checkbox (default on, persisted in `localStorage`) to prefer DuelingBook images over YGOProDeck images.
3. Allow per-deckline overrides via `[db]` / `[ypd]` tags.

## Non-goals

- Changing PDF layout, paper settings, or Cloudinary rewrite behavior.
- A visual per-card row UI (overrides stay text tags in the decklist).
- Guaranteeing YGOProDeck alt-art correctness via direct URLs (alt arts still use the API).

## Architecture

New module `js/image_source.js` owns **attempt ordering only** — it does not fetch.

| Piece | Responsibility |
|-------|----------------|
| `js/image_source.js` | Build ordered list of image attempts from preference, override, art index, DB indexes |
| `js/decklist_parse.js` | Parse `[db]` / `[ypd]` / `[n]` tags; existing direct-URL extract + YGOProDeck→Cloudinary rewrite |
| `js/duelingbook.js` | Unchanged catalog index/match/image URL helpers |
| `js/main_script.js` | Wire checkbox + `localStorage`; walk attempts and fetch; keep existing XHR helpers |
| `html/index.html` | “Prefer DuelingBook images” checkbox near layout settings |

Direct `http(s)://…` decklines continue to bypass the resolver (download that URL only).

## Attempt model

Each attempt is one of:

- `duelingbook` — match catalog → `images.duelingbook.com/cards/{row.id}.jpg`
- `ygoprodeck-direct` — `https://images.ygoprodeck.com/images/cards/{unpaddedPasscode}.jpg` (then existing Cloudinary rewrite when applicable)
- `ygoprodeck-api` — current `cardinfo.php` name/id lookup → `card_images[artIndex].image_url`

### Ordering

**Effective preference** = per-line override if present, else global `preferDb`.

- Prefer DB: `duelingbook`, then YPD side (direct and/or api as below)
- Prefer YPD: YPD side first, then `duelingbook`

**YPD side (always both when applicable, in this order):**

1. `ygoprodeck-direct` — only if `artIndex` is `0` (or omitted → `0`) **and** a passcode is available from the DuelingBook match at that index
2. `ygoprodeck-api` — when art index ≠ 0, or as fallback after direct, or when no passcode/catalog

If the DB catalog failed to load, omit `duelingbook` and `ygoprodeck-direct`; still include `ygoprodeck-api` when the YPD side is attempted.

### Passcode → direct URL

- Passcode from the matched DB row: use `s` if present/non-empty, otherwise `s2`.
- Strip leading zeros for the filename: `06637331` → `6637331` →  
  `https://images.ygoprodeck.com/images/cards/6637331.jpg`
- Do not emit a direct attempt when the passcode is missing or empty after strip.

## Decklist syntax

Existing line shape (qty + name/id + optional art index) gains optional source tags:

- Source: `[db]` or `[ypd]` (not `[ygo]`)
- Art index: `[n]` as today
- Separate brackets, **either order**, **optional space** between:  
  `Card [1][ypd]`, `Card [ypd][1]`, `Card [1] [db]`, `2 Card [ypd] [0]`
- Multiple source tags: **last wins**
- Multiple art indexes: **last wins**
- Unknown brackets like `[foo]`: **left in the card name** (only `[db]`, `[ypd]`, and numeric `[n]` are consumed as tags)
- Source tags apply only to non-URL lines; direct URL lines ignore preference/override

## UI & persistence

- Checkbox label: **Prefer DuelingBook images**
- Default: checked (`true`)
- `localStorage` key: `preferDuelingBookImages`
- Values: `'true'` / `'false'` strings (or boolean-equivalent); missing/corrupt → `true`
- On change: write `localStorage` immediately; generation reads current checkbox (or stored) value

## Error handling

- Any single attempt failure (no match, network, bad HTTP, decode) → try next attempt
- If all attempts fail → same per-card error reporting as today
- Art index out of range for DB → that attempt fails, continue
- YPD-api keeps current `card_images[artIndex]` behavior (including out-of-range failure)

## Testing

**Unit tests** (existing Node test style):

- Resolver: prefer-DB vs prefer-YPD order; override beats checkbox; artIndex 0 + passcode → direct URL shape; artIndex > 0 → api not direct; missing indexes → no DB/direct
- Parse: tag orders, optional space, qty + tags; unknown `[foo]` retained; URL lines unchanged

**Manual smoke:**

- Checkbox survives reload
- Mixed `[db]` / `[ypd]` lines in one list
- Default-art YPD path works without cardinfo when DB has passcode

## File touch list

- Add `js/image_source.js`
- Extend `js/decklist_parse.js`, `js/main_script.js`, `html/index.html`
- Add/extend tests under `tests/`
- Script tag for the new module in `html/index.html`
