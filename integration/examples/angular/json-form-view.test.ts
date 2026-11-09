// The scenarios in @formisch/angular, through the renderer the schema package's docs show. The
// components are compiled ahead of time, like in an app: Angular's JIT compiler can't find inputs
// declared with input().
import { getTestBed, TestBed } from '@angular/core/testing'
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing'
import type { JsonForm } from '@whatsaaaa/form-builder-schema'
import { beforeAll, describe, onTestFinished } from 'vitest'
import { type RenderedForm, runScenarios } from '../../tests/run-scenarios'
import { JsonFormView } from './json-form-view'

beforeAll(() => {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting())
})

function render(json: JsonForm): RenderedForm {
  const fixture = TestBed.createComponent(JsonFormView)
  const submitted: unknown[] = []
  fixture.componentRef.setInput('json', json)
  const subscription = fixture.componentInstance.submitted.subscribe((output) =>
    submitted.push(output),
  )
  fixture.detectChanges()
  onTestFinished(() => {
    subscription.unsubscribe()
    fixture.destroy()
  })

  return {
    root: fixture.nativeElement as HTMLElement,
    submitted,
    async update(change) {
      change()
      // Formisch validates asynchronously. Then Angular renders what changed.
      await new Promise((resolve) => setTimeout(resolve))
      await fixture.whenStable()
    },
  }
}

describe('the fixtures in @formisch/angular, with the documented renderer', () => {
  runScenarios(render)
})
