---
name: extending-the-db
description: >-
    Extends the  database by adding names or cultivars, as well as extending with new fields
---
When adding a new species or cultivar to the `plantCatalog.json` database, attempt to identify 
the exact official english name of the species or cultivar. 

Don't wall back to whatever the user gives you as the name. 

If unsure, offer suggestions or ask for more questions.

If you identify the species or cultivar already exists, and conclude it needs tweaking, ask for confirmation first.

Once doen adding, check if there's an uncomitted version bump in `package.json` and if not, bump the
revision. Similarly, check if there's an entry for the new version on top ot `CHANGELOG.md` and add
one or extend one if needed. The entry should be prefixed with "[DB]" and follow the pattern of 
"Added X to the catalog".