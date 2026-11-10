---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: form-builder
  text: Forms from JSON
  tagline: Describe forms in JSON and get validated Formisch forms out.
  image:
    src: /logo.svg
    alt: form-builder
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: Introduction
      link: /guide/
    - theme: alt
      text: View on GitHub
      link: https://github.com/whatsaaaa/form-builder

features:
  - title: Fields and rules
    details: A field type for every native control, groups and lists, and every Valibot action that fits in JSON as a rule.
    link: /guide/field-types
    linkText: Field types
  - title: Layout and steps
    details: Sections, a 12-column grid and multi-step forms, written in the definition next to the fields.
    link: /guide/layout
    linkText: Layout
  - title: Conditions
    details: Fields, sections and steps that show, hide and clear by the values of other fields, and skip validation while hidden.
    link: /guide/conditions
    linkText: Conditions
  - title: Any framework
    details: Headless adapters for Vue and React, and tested renderers for Preact, Solid, Svelte, Qwik and Angular.
    link: /frameworks/
    linkText: Frameworks
---
