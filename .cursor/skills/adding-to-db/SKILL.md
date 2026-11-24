---
name: extending-the-db
description: Add or correct catalog species and cultivars, including their sourced Future view estimates.
---

Use the [catalog fields and allowed values](../../../README.md#adding-plants-to-the-catalog).

When adding a new species or cultivar to the `plantCatalog.json` database, do the proper research:

- The plant name you are given may be Latin, a cultivar, or informal — identify the plant on the web and use the **common English name** gardeners and seed catalogs use.
- Add a few well-known cultivars (English trade names when that is how they are sold).
- For an addition, flag conflicting data in an existing entry before changing it. For a requested correction, update the entry and its source.
- If you cannot identify the plant from what you were given, stop and let me know.

## Future view

- Find the typical mature width of one plant or clump. Use a source that names the species or cultivar. Check that the figure is crown width or spread. Height, planting distance, and the area covered by runners measure different things.
- Store the width in metres as `growth.spreadM` and link the source. Use the midpoint of a published range unless the source gives a typical value. Leave unsupported estimates out.
- Add `maturityYears` only for a persistent woody canopy with a published time to mature size. Fruiting age does not establish canopy maturity. Strawberries and plants with renewing canes use Final only.
- For each cultivar you add or edit, compare its width and maturity period with the species. When you change a species default, check its cultivars too. Keep matching defaults inherited. When the figures differ, supply a complete cultivar `growth` profile. It replaces the whole species profile. Use `timingSource` if the period comes from a different source.
- Check the resolved values in Future view. Final should show the documented width. A year view should draw an estimate only when the plant qualifies. Keep nursery widths for individual garden plants out of the catalog.

## Display names (`name` fields)

These strings appear in the UI. **Prefer common English whenever possible.**

**Species**

- Use the everyday English name: `Snapdragon`, `Bunching onion`, `Rock cress`, `Purpletop vervain`.
- Do **not** append Latin binomials such as `(Antirrhinum majus)` or `(Allium fistulosum)` unless two catalog species would otherwise share the same common name and need disambiguation.
- When the user supplies Latin, map it to the English common name — do not copy the binomial into `name`.
- Parenthetical English alternates are fine when both are common (`Jujube (Chinese date)`).

**Cultivars**

- Use the name on English-language seed packets and nursery labels.
- Proper and trade names are fine as-is: `Granny Smith`, `Honeycrisp`, `Ishikura`, `Blauhilde`.
- If the usual market name is foreign or opaque to an English reader, add a brief English gloss in parentheses: `Francuska kožarka (French russet)`.
- Do not replace well-known trade names with literal translations.

**Latin (`name_latin`, optional)**

- Put the binomial (or infraspecific name) in optional `name_latin` on the species and, when it differs from the species taxon, on the cultivar.
- Used for search only — not shown as the primary UI label.
- Omit when the taxon is ambiguous (mixed genera under one species entry) or you are not confident of the name.

**Latin in labels**

- Keep Latin out of primary `name` fields.
- `id` slugs stay stable snake_case (English- or Latin-derived is fine).
- CHANGELOG `[DB]` lines may mention Latin for traceability.

## After adding

Check whether there is an uncommitted version bump in `package.json`. If not, bump the revision.

Check whether there is an entry for the new version at the top of `CHANGELOG.md`; add or extend it. Prefix with `[DB]` and follow the pattern `Added X to the catalog`.
