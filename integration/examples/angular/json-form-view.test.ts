// The scenarios in @formisch/angular, through the renderer the schema package's docs show. The
// components are compiled ahead of time, like in an app: Angular's JIT compiler can't find inputs
// declared with input().
import { Component, input } from '@angular/core'
import { getTestBed, TestBed } from '@angular/core/testing'
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing'
import type { JsonForm } from '@whatsaaaa/form-builder-schema'
import { beforeAll, describe, onTestFinished } from 'vitest'
import { type RenderedForm, runScenarios } from '../../tests/run-scenarios'
import { JsonFormView } from './json-form-view'

beforeAll(() => {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting())
})

/** A page with content for the layout's slots, the way an app passes it. */
@Component({
  selector: 'json-form-host',
  imports: [JsonFormView],
  template: `
    <ng-template #shipping><p data-slot="shipping">Ships in three days</p></ng-template>
    <ng-template #submit>
      <button type="submit" data-slot="submit">Place order</button>
    </ng-template>
    <json-form-view
      [json]="json()"
      [slots]="{ shipping, submit }"
      (submitted)="submitted.push($event)"
    />
  `,
})
class Host {
  readonly json = input.required<JsonForm>()
  readonly submitted: unknown[] = []
}

function render(json: JsonForm): RenderedForm {
  const fixture = TestBed.createComponent(Host)
  fixture.componentRef.setInput('json', json)
  fixture.detectChanges()
  onTestFinished(() => fixture.destroy())

  return {
    root: fixture.nativeElement as HTMLElement,
    submitted: fixture.componentInstance.submitted,
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
