---
name: extending-the-db
description: >-
    Extends the  database by adding names or cultivars, as well as extending with new fields
---
When adding a new species or cultivar to the `plantCatalog.json` database, do the proper research
- the plant name should not need to match the term I gave you, try and identify which plant I'm talking about on the web, find the common english name, and a few common cultivars. Use that.
- if the plant or cultivar is already in the database, but your research says info is incorrect, stop and let me know so I can decide for myself
- if you can't identify the plant by what I have you, stop and let me know

Once done adding, check if there's an uncomitted version bump in `package.json` and if not, bump the
revision. Similarly, check if there's an entry for the new version on top ot `CHANGELOG.md` and add
one or extend one if needed. The entry should be prefixed with "[DB]" and follow the pattern of 
"Added X to the catalog".