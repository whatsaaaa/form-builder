<script setup lang="ts">
import type { JsonForm } from '@whatsaaaa/form-builder-schema'
import signUp from '../../../../fixtures/affects/sign-up.json'
import { builder } from '../builder'
import StepsExample from '../components/StepsExample.vue'

// The Company step only shows for a business account, and clears its fields otherwise. The
// topics only show with the newsletter, and the other topic only with "Other".
// TypeScript reads `version` in a JSON file as any string.
const definition = signUp as unknown as JsonForm
</script>

<template>
  <StepsExample :definition="definition" :builder="builder" submit-label="Sign up" />
</template>
