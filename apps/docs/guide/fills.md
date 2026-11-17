---
description: Fill fields from the value of another, like a name from a picked profile, with values from the definition or from a source of yours, with the fills package.
---

# Fills

The fills package adds fills to definitions: a new value of one field, its trigger, sets other fields of the form. Picking "Profile A" fills in the first and last name, say. The values are written in the definition, or come from a source of yours, like a call to your server, so the definition stays plain JSON and the library never makes a call itself. Below you will learn how to write fills, when they run, what they set, and how to show what is loading.

## Adding the extension

Fills come from [`@whatsaaaa/form-builder-fills`](/api/fills/), an extension of the schema builder. Give the builder the extension, with the sources your definitions name:

<<< @/snippets/schema/fills.ts#builder

Then write `fills` on the trigger. Without the extension, `fills` is an unknown key: `validate()` reports it, and `build()` throws. A definition never runs without its fills by mistake.

The Vue and React adapters run the fills of a definition when you pass `useJsonForm` the builder. For a renderer of your own, see [rendering yourself](#rendering-yourself).

## A map

A map writes the values in the definition, for each value of the trigger. Here, each profile fills in the name and the city:

```json
{
  "version": "1",
  "fields": [
    {
      "name": "profile",
      "type": "select",
      "label": "Profile",
      "default": "a",
      "options": [
        { "value": "a", "label": "Profile A" },
        { "value": "b", "label": "Profile B" },
        { "value": "c", "label": "Profile C" },
        { "value": "other", "label": "Someone else" }
      ],
      "fills": {
        "map": {
          "a": {
            "firstName": "Marko",
            "lastName": "Petrović",
            "address.city": "Beograd"
          },
          "b": {
            "firstName": "Jelena",
            "lastName": "Jovanović",
            "address.city": "Novi Sad"
          },
          "c": {
            "firstName": "Nikola",
            "lastName": "Nikolić",
            "address.city": null
          }
        }
      }
    },
    {
      "name": "firstName",
      "type": "text",
      "label": "First name",
      "required": true
    },
    {
      "name": "lastName",
      "type": "text",
      "label": "Last name",
      "required": true
    },
    {
      "name": "address",
      "type": "group",
      "label": "Address",
      "fields": [{ "name": "city", "type": "text", "label": "City" }]
    }
  ]
}
```

- **A new form starts filled.** The profile's default is `"a"`, so the form starts with Marko Petrović from Beograd, and isn't dirty.
- **Picking Profile B** sets Jelena Jovanović from Novi Sad.
- **A key is a value of the trigger, as JSON writes it**: the value itself for a string or a date, `"1"` for the number `1`, and `"true"` or `"false"` for a checkbox. Each key must be a value the trigger can hold, like one of a select's options.
- **An entry sets every field the map names.** A field it leaves out, or gives `null`, is set blank: Profile C has no city, so picking it after Profile A doesn't keep Beograd. A value with no entry, like "Someone else", blanks them all.
- **A value is a string, a number, a boolean, `null`, or a list of them for a multiselect.** It must be one its field can hold, like a `default`.

A map gives its values at once, so it never waits, and works on a server too.

## A source

A source is a function of yours that gives the values, like a call to your server. Name it in `fills` with `source`, and list the fields it may set in `fields`:

<!-- docs: fragment -->

```json
{
  "name": "profile",
  "type": "select",
  "label": "Profile",
  "options": [
    { "value": "a", "label": "Profile A" },
    { "value": "b", "label": "Profile B" }
  ],
  "fills": {
    "source": "profiles",
    "fields": ["firstName", "lastName", "address.city"]
  }
}
```

Give the function to `fills({ sources })` under that name, as above. It gets the value of the trigger, and gives the values of the fields by their dot paths, at once or in a promise:

<<< @/snippets/schema/profiles.ts

- **The value** is never empty: a cleared trigger calls no source. A number select gives a number, and a date its ISO string.
- **The context** has `signal`, aborted when the trigger gets another value, is cleared, or the form closes, so pass it to `fetch()`. It also has `trigger`, the trigger's dot path, `fields`, the fields of the fill, and `input`, the form's whole input when the call started, to send other fields along.
- **Only the fields `fields` lists are set.** Other keys of the result, like an `id`, are ignored. A listed field the result leaves out, or gives `null`, is set blank, and `null` or `undefined` for the whole result blanks them all.
- **What it throws or rejects with** goes to the form's error handler, below. An error that comes after the call was aborted, like an `AbortError`, never does.
- **It runs only in the browser**, once the form is on the page, never on a server.

A source can be anything: a `fetch()`, a store, or a constant. The definition only names it, so the same definition works with a fake source in tests. When a source needs something of a component, like a client with the user's token, make the builder in the component: `createSchemaBuilder()` is cheap, and the adapters read the builder once.

### A text field as trigger

A text field fills on each keystroke. The newest value wins, so only the last call counts, but each one still reaches the source. Wait in the source with the signal, so a new keystroke aborts the wait before it:

<!-- docs: fragment -->

```json
{
  "name": "zip",
  "type": "text",
  "label": "ZIP code",
  "fills": {
    "source": "cities",
    "fields": ["address.city"],
    "overwrite": "always"
  }
}
```

<<< @/snippets/schema/cities.ts

## Which fields

- **A trigger** is a field whose value is a string, a number, a boolean or a date: a select, a radio, a checkbox, a text, a number, a date, or a type of yours with one of those kinds, like a combobox. A multiselect, a list, a group, a file or a display element can't be one.
- **A field it sets** is any field with a value, but a file: a text, a select, a multiselect with a list of its options, and so on. A group or a list can't be set as a whole: name their fields, like `address.city`.
- **Paths are absolute dot paths**, like those of [form rules](/guide/form-rules#paths): `firstName`, or `address.city` for a field of a group, at any depth.
- **Not inside lists.** Neither a trigger nor a field it sets can be inside a list's items, so a fill can't set `lines.*.sku`.
- **A field can have one `fills`.** Several triggers can set the same field: the fill that sets it last wins.

## When a fill runs

- **On each new value of its trigger**, from the user or from code, like Formisch's `setInput`. Picking the value it already holds runs nothing.
- **As a new form starts**, a trigger that starts from its `default` fills in the others. The values of a map are in the form's initial input, on the first render and in a server render. Those of a source come once the form is mounted, as the values the form starts with, so it isn't dirty.
- **Never from a record.** A trigger the app's `initialInput` has a key for, like a saved record, fills nothing as the form starts, even when it holds its default. A fill that runs then never sets a field `initialInput` has a key for, so editing a record never loses its values. When the user picks another value, it fills as usual.
- **A cleared trigger blanks every field its fill sets**, edited or not, and cancels its pending call. A trigger that is empty as the form starts clears nothing.
- **A fill that sets the trigger of another** runs that fill too. Fills that set each other in a loop are an issue of the definition.
- **A reset starts them over.** `jsonForm.reset()` of the [Vue](/frameworks/vue#fills) and [React](/frameworks/react#fills) adapters aborts every pending call, and fills the form again as it started. Formisch's own `reset` doesn't tell the fills, so the values it restores count as the user's edits.

## What a fill sets

- **Only the fields the user hasn't edited**, with `"overwrite": "unedited"`, the default. A field is edited when it holds something other than what it started with, or than the last fill set. An empty field is never edited, so a field the user emptied fills again.
- **Every field**, edits included, with `"overwrite": "always"`. Use it when the fields belong to the trigger, like the city of a ZIP code.
- **Every field the fill names.** A field its values leave out, or give `null`, is set blank, so it never keeps a value of the previous pick.
- **Values fitted to their field**, like typed input: `"5"` becomes `5` for a number, and `11000` becomes `"11000"` for text. A value of a type the field can't hold, like `"abc"` for a number, or an option a select doesn't have, is set blank and reported as a `TypeError`. A value that only breaks a rule, like an email without `@`, is set, and the form shows its error.

So after a user changes the first name of Profile A to Marta, picking Profile C sets only the last name and the city, and Marta stays. With `"overwrite": "always"`, it would be Nikola.

## Waiting and errors

The library reports what is loading and what failed, and shows neither: what the user sees is yours. In the adapters:

- **`jsonForm.fills`** says what waits for a source: `pending` lists the triggers whose values haven't come yet, and `isPending(path)` is true for those triggers and every field they fill. It changes only when that does. Without fills, nothing is pending.
- **Each value field gets `pending`**, so its component can show that its value is on its way. See [field components](/frameworks/field-components#value-fields).
- **`onFillError`** gets each error of a fill, with the trigger and its value: what a source threw, or a `TypeError` for a value its field can't hold, with that field. Without it, the error is thrown like an uncaught one, so it shows in the console.
- **Submitting while a fill waits is yours to handle**: disable the submit button while `jsonForm.fills.pending` isn't empty. With [steps](/frameworks/multi-step-forms), Next waits for the pending fills, then validates the values they set.

::: code-group

<<< @/snippets/vue/ProfileForm.vue [Vue]

<<< @/snippets/react/ProfileForm.tsx [React]

:::

## With conditions

Fills and the [conditions](/guide/conditions) of the affects package work together:

- **A filled value is input like a typed one**, so it shows, hides and clears fields by their conditions.
- **A field its conditions only hide is set**, and shows the filled value when it comes back.
- **A field its conditions clear is left alone**, including one they clear for the values the fill sets. It is blank, so the next fill sets it.
- **A trigger its conditions hide and clear** counts as cleared: every field its fill sets is blanked.

## On the server

Fills change nothing in the schema `build()` gives, so a server validates filled values like typed ones:

- **Register `fills()` on the server too**, so `fills` isn't an unknown key. Without `sources`, the names of sources aren't checked, which suits a server that only validates: no source ever runs there. To check the names, pass the same sources.
- **`getInitialInput()` has the values of the maps** for each trigger's default, so a server render shows them.
- **Don't trust filled values.** A user can change any value before submitting. When the server needs a profile's real data, it looks it up itself.

## Checks and types

`validate()` checks every `fills` with the rest of the definition: its shape, every path, the keys and values of a map, the names of sources, and fills that set each other in a loop. Here, `adress.city` names no field:

<!-- docs: invalid -->

```json
{
  "version": "1",
  "fields": [
    {
      "name": "profile",
      "type": "select",
      "options": [{ "value": "a", "label": "Profile A" }],
      "fills": {
        "map": { "a": { "firstName": "Marko", "adress.city": "Beograd" } }
      }
    },
    { "name": "firstName", "type": "text" }
  ]
}
```

It is an `unknown_field` issue at `['fields', 0, 'fills', 'map', 'a', 'adress.city']`. See [checking definitions](/guide/checking-definitions#fills) for every check.

`defineForm()` [types](/guide/typescript) `fills`, and `source` as one of the builder's sources:

<<< @/snippets/schema/fills.ts#define

The package ships a [JSON Schema](/guide/json-schema#using-the-shipped-schema) with `fills`. For a definition with conditions and fills, make a schema from a builder with both extensions. While the package is before 1.0, the hosted schema follows its latest release.

## Rendering yourself

The Vue and React adapters run the fills for you. A renderer of your own, like one of the [Formisch bindings](/frameworks/formisch#fills), runs them with the builder's [`getFills()`](/api/schema/Fills):

- **Start the form with the values of the maps.** `builder.getInitialInput(json)` has them. With an initial input of the app's, merge it over the defaults, pass the result and that input to `fills.initialInput(input, given)`, then apply the conditions' `clear()`.
- **Open the fills on the form** with how to read and set its input: Formisch's `getInput`, `setInput`, and `reset(form, { path, initialInput })` for values the form starts with.
- **Call `start()`** once the form is on the page, `update()` after each change of a field of `fills.triggers`, `reset()` after the form is reset, and `stop()` when it closes.
- **Read `run.state`** for what is pending, and `subscribe()` to it.

<<< @/snippets/schema/extensions.ts#run

[Extensions](/guide/extensions#fills) has how an extension of yours adds fills, and every rule of a running fill.
