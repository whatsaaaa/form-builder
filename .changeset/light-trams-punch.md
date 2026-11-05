---
'@whatsaaaa/form-builder-schema': minor
---

API review before 1.0: two exports change, rules can name their own category, and the builder can walk your own container types.

**Breaking: `textUnitRules` is now `textRules`**, so every family export is its category plus `Rules`.

```ts
// Before
import { textUnitRules } from '@whatsaaaa/form-builder-schema'
createSchemaBuilder({ includeDefaultRules: false, rules: { ...textUnitRules } })

// After
import { textRules } from '@whatsaaaa/form-builder-schema'
createSchemaBuilder({ includeDefaultRules: false, rules: { ...textRules } })
```

**Breaking: `KindOf` is no longer exported.** It only described the function form of a field type's `kind`, which you write inline. If you used it, use the field type's own type:

```ts
// Before
import type { KindOf } from '@whatsaaaa/form-builder-schema'
const pickKind: KindOf<typeof props> = (field) => (field.big ? 'number' : 'string')

// After
import type { FieldTypeDef } from '@whatsaaaa/form-builder-schema'
const pickKind: FieldTypeDef<typeof props>['kind'] = (field) => (field.big ? 'number' : 'string')
```

**Own rule categories:** `RuleCategory` now takes any string besides the built-in ones, so your own rules can use `meta: { label: 'IBAN', category: 'banking' }`. Code that switches over every category should handle unknown ones.

**Walking your own containers:** the builder now has `walkFields(json)` and `getInitialInput(json)`. They work like the functions of the same name, but read every container type the builder knows, not only `group` and `array`. For the built-in types they give the same results. They never throw; a container with issues isn't built, so the fields inside it are left out.

**Form rule messages:** `JsonFormRule.message` stays required, now on purpose for format version 1. Without it, the error would be Valibot's generic "Invalid input".
