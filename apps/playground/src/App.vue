<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header>
    <h1>Form Builder Playground</h1>
    <nav>
      <RouterLink to="/login">Login form</RouterLink>
      <RouterLink to="/order">Order form</RouterLink>
    </nav>
  </header>

  <main>
    <RouterView />
  </main>
</template>

<style scoped>
header {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem 2rem;
  padding-bottom: 1rem;
  margin-bottom: 2rem;
  border-bottom: 1px solid var(--color-border);
}

h1 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-heading);
}

nav {
  display: flex;
  gap: 1rem;
}

nav a {
  color: var(--color-text);
}

nav a.router-link-exact-active {
  color: hsla(160, 100%, 37%, 1);
  font-weight: 600;
}
</style>
