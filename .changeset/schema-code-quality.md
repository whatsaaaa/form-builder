---
'@whatsaaaa/form-builder-schema': patch
---

Internal cleanup with no change in behavior. The checks behind `validate()` are split into smaller functions, code that was written twice is shared, and the tests now cover every line. The `isoTimestamp` rule's description shows the usual uppercase `Z`: `2026-10-28T14:30:15.000Z`.
