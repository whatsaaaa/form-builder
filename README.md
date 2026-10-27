# Form Builder

Build [Formisch](https://formisch.dev) forms from JSON.

## What is a Form Builder?

A form builder lets you describe a form as **data** instead of writing it by hand in code. You define the fields, their types, labels and validation rules in JSON document, and the builder turns definition into a working form.

This is useful when forms need to change without a redeploy, or when they come from somewhere other than your source code:

- a database (forms managed by admins or customers)
- a `.json` file in your project
- an API response or a visual form editor

## Status

Early work in progress. The initial JSON -> Formisch builder function is in place; the API and JSON format may change.

## License

MIT
