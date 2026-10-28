<h1 align="center">form-builder</h1>
<p align="center">
    Describe your forms in JSON. Get real, validated <a href="https://formissch.dev">Formisch</a> forms out.
</p>

<p align="center">
    <img src="https://img.shields.io/badge/pnpm-workspace-F69220?logo=pnpm&amp;logoColor=white" alt="pnpm workspace">
    <img src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&amp;logoColor=white" alt="TypeScript">
    <img src="https://img.shields.io/badge/Vue-3-4FC08D?logo=vuedotjs&amp;logoColor=white" alt="Vue">
    <img src="https://img.shields.io/badge/validation-Valibot-0F172A" alt="Valibot">
    <img src="https://img.shields.io/badge/license-MIT-blue" alt="License: MIT">
    <img src="https://img.shields.io/badge/status-early%20days-orange" alt="Status: early days">
</p>

<p align="center">
    <a href="#whats-inside">Packages</a> ·
    <a href="#getting-started">Getting started</a> ·
    <a href="#how-it-fits-together">How it fits together</a> ·
    <a href="#contributing">Contributing</a>
</p>

---

## 👋 Hey there

Forms are everywhere, and a lot of them don't really belong in your source code. Some live in a database because admins
edit them. Some come from an API. Some get dragged together in a visual editor.

**form-builder** lets you write a form down as plain JSON and hands you back a working Formisch form, with fields and
validation already wired up. The core doesn't care which framework you use. Small adapters handle the Vue, React or 
Angular part on top of it.
