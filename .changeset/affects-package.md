---
'@whatsaaaa/form-builder-affects': minor
---

First release: conditions for JSON form definitions. `affects` on a field, a step, a section or a display element is a list of effects, `show`, `hide` and `hideAndClear`, each with a condition: a test of one field by its dot path (`equals`, `notEquals`, `in`, `includes`, `empty`, `notEmpty`), or `all` and `any` of conditions. Fields of a list's items read the same item with `lines.*.kind`.

```ts
import { affects } from '@whatsaaaa/form-builder-affects'

const builder = createSchemaBuilder({ extensions: [affects()] })
```

Hide always wins. A hidden field isn't validated, and counts as empty in other conditions. `hideAndClear` submits it blank, and the adapters set it blank in the form; a field hidden otherwise submits its output when it is valid. Groups, lists, sections and steps hide what is in them, and a group, section, row or step whose fields are all hidden hides too. `validate()` checks the shape, the paths, the operators by kind, the values by the fields' schemas, and loops. The package ships its own `definition.schema.json`.
