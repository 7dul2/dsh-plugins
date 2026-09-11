import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { test } from 'node:test'

test('registers a localized General settings row for the favicon picker', async () => {
  let entry
  let registration
  let render
  let dictionaries
  const scope = {
    getSnapshot: () => ({ status: 'ready', writable: true, value: { imageData: '', mimeType: 'image/png' } }),
    subscribe: () => () => {},
    mutate: async () => {},
  }
  const react = {
    createElement: (type, props, ...children) => ({ type, props, children }),
    useSyncExternalStore: (_, getSnapshot) => getSnapshot(),
    useState: initial => [initial, () => {}],
  }
  vm.runInNewContext(await readFile(new URL('../lib/client.js', import.meta.url), 'utf8'), {
    window: { __ModuleLoader__: { load(value) { entry = value } } },
  })
  const client = entry.factory(name => { assert.equal(name, 'react'); return react })
  client.apply({
    effect(fn) { fn() },
    locale: { register(ns, value) { dictionaries = value; return () => {} } },
    settingsScope: { bind(spec) { assert.equal(spec.namespace, 'custom-favicon-settings'); return scope } },
    slots: { inject(name, fn) { assert.equal(name, 'settings.general.item'); fn() }, register(options, component) { registration = options; render = component } },
  })
  const tree = render({ ...registration.inject(), t: key => dictionaries.zh[key] })
  assert.equal(registration.id, 'custom-favicon')
  assert.equal(tree.type, 'form')
  assert.equal(tree.children[1].type, 'label')
  assert.equal(tree.children[1].children[0], '选择图片')
  assert.equal(tree.children[2].props.disabled, true)
  assert.deepEqual(Object.keys(dictionaries.zh), Object.keys(dictionaries.en))
})
