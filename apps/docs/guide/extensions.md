---
description: How extensions add keys of their own to definitions, like the conditions of the affects package, and how to write one.
---

# Extensions

An extension is a feature from another package that reads keys of its own on fields, and on the layout's steps and sections. The [affects package](/guide/conditions) is one: its `affects` hide and clear fields by conditions. An extension can also fill fields from the value of another, like the `fills` of the [fills package](/api/fills/). Below you will learn what extensions do, and how to write one.

## Using extensions

Pass extensions to the builder:

<<< @/snippets/schema/conditions.ts#builder

- **Without the extension, its keys are unknown keys**, so a definition that uses them fails `validate()`, rather than running without its conditions.
- **The schema skips what the conditions hide.** Each field that conditions can hide gets a gate around its schema, and the schema works out what is hidden from the input on each parse. A hidden field reports no issue, in every Formisch package and in a plain `v.parse`, and a form rule is skipped where a field it reads is hidden.
- **The schema keeps its shape.** The gates keep the type and keys of each field's schema, so Formisch makes the same fields. A definition without conditions builds exactly the schema it builds without the extension.
- **`getVisibility()`** tells renderers what is hidden for any input. See [conditions](/guide/conditions#rendering).
- **`getFills()`** runs the fills of the extensions in a form: each new value of a field sets the fields its fill names. See [fills](#fills).
- **Several extensions** work together: a field is hidden when any of them hides it.

## Writing an extension

An extension is an object that matches the [`SchemaExtension`](/api/schema/SchemaExtension) interface. This one adds `lockedBy`, which hides a field while a checkbox is ticked:

<<< @/snippets/schema/extensions.ts#extension

- `name` names the extension in messages.
- `fieldProps` is a Valibot object schema of the keys it adds to every field and to every display element written in the layout. `layoutProps` does the same for the layout's steps and sections. `defineForm()` types them, and `toJsonSchema()` writes them.
- `definitions` names the schemas its props refer to, for `toJsonSchema()`, like a condition that holds conditions.
- `check(ctx)` runs once the fields, form rules and layout are checked. It reports issues with `ctx.issue()`, finds the fields it reads with `ctx.resolve()`, and returns the conditions of each target: the fields they read, and whether they hide and clear it for an input. It adds fills with `ctx.fill()`.

The builder does the rest: groups, lists, sections and steps hide what is in them, a hidden field reads as empty in other conditions, and loops are `cycle` issues.

## Fills

A fill sets fields from the value of another, its trigger: choosing a profile fills in the name, say. The [fills package](/api/fills/) adds them from `fills` in the definition, with values from a map or from a source of yours. An extension adds one with `ctx.fill(target, fill)`, where `fill` is a [`TargetFill`](/api/schema/TargetFill). This one adds `copyTo`, which copies a text field to others while the user hasn't changed them:

<<< @/snippets/schema/extensions.ts#fill

- `fields` are the fields it sets, found with `ctx.resolve()`, with where the definition names each.
- `values(value, ctx)` gives the values of those fields for a value of the trigger, by dot path, or a promise of them. `ctx.signal` is aborted when the trigger gets another value or the form closes, so pass it to `fetch()`.
- `static` is true when `values()` answers at once from the definition alone, like a map written in it. A form then starts with the values for its trigger's default, as part of `getInitialInput()`.
- `overwrite` is `'unedited'` to leave a field the user changed since the last fill, or `'always'`.

The trigger is a field with a string, number, boolean or date value, and the fields it sets have a value and aren't files. Neither can be inside a list's items. A fill names each field it sets once, and its `overwrite` is `'unedited'` or `'always'`. `ctx.fill()` throws a `TypeError` for a fill that breaks these rules, so check them in `check()` and report a mistake in the definition as an issue instead. A fill on a trigger with issues of its own, like a duplicate name, is left out, as the definition reports them. Fills that set each other's triggers in a loop are `cycle` issues.

A renderer runs the fills with [`getFills()`](/api/schema/Fills): it opens them on a form, starts them once the form is on the page, and calls `update()` after each change of the input:

<<< @/snippets/schema/extensions.ts#run

What a running fill does is the same for every extension:

- **It runs when its trigger gets a new value**, from the user or from code. As the form starts, it runs only when the trigger starts from its default: a trigger the app's initial input has a key for, like a saved record, fills nothing, and a fill never sets a field that input has a key for.
- **It sets the fields the user hasn't edited.** A field is edited when it holds something other than what it started with, or than the last fill set. An empty field is never edited. With `'always'`, it sets them all.
- **It sets every field it names.** A field its values leave out, or give `null` for, is set blank.
- **Values are fitted to their field**, like typed input: `'5'` becomes `5` for a number, and `11000` becomes `'11000'` for text. A value of a type the field can't hold, like `'abc'` for a number, is set blank and reported as a `TypeError`. A value that only breaks a rule, like an email without `@`, is set, and the form shows its error.
- **The newest value wins.** A new value of the trigger aborts the call before it, and its values are dropped.
- **A cleared trigger blanks every field its fill sets**, edited or not, and cancels its call. So does a trigger whose conditions hide and clear it. A trigger that is empty as the form starts clears nothing.
- **A field its conditions clear** for the values the fill sets is left alone. A field they only hide is set.
- **A fill that sets the trigger of another** runs that fill too.

While a fill waits for its values, `run.state.pending` lists its trigger, and `run.state.isPending(path)` is true for the trigger and each field it sets. Errors go to `onError`, and without it they are thrown like an uncaught error. The library shows neither: that is the app's to do.

## How the contract grows

The schema package keeps `SchemaExtension` and the types around it stable within a major version. A minor version can only add to them, so an extension written today keeps working:

- **New optional members** on any of the interfaces. An extension never has to set one.
- **New kinds of target** in `ctx.targets`, for new places in a definition. Skip the kinds you don't know: don't throw on them, and don't treat them as fields.
- **New optional result fields** in `TargetConditions` and in what its `evaluate()` returns, for new effects. Leaving them out keeps today's meaning.
- **New members on `ctx`**, and new issue codes for `ctx.issue()`.

Removing or renaming a member, making one required, or changing what one means only happens in a major version. The extension's own keys, like `affects`, are versioned by its own package.

## Mistakes

A key that an extension adds can't be a [reserved key](/api/schema/reserved-keys), a prop of a field type, or a key of another extension. Mistakes like these throw a `TypeError` from `createSchemaBuilder()`.
