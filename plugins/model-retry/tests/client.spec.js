import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import { test } from 'node:test'

test('registers a localized General settings row and renders the persisted budget', async () => {
  let entry
  let registration
  let render
  let dictionaries
  const disposers = []
  const snapshot = { status: 'ready', writable: true, value: { maxRetries: 7 } }
  const scope = { getSnapshot: () => snapshot, subscribe: () => () => {} }
  const react = {
    createElement: (type, props, ...children) => ({ type, props, children }),
    useSyncExternalStore: (_, getSnapshot) => getSnapshot(),
    useState: initial => [initial, () => {}],
  }
  vm.runInNewContext(await readFile(new URL('../lib/client.js', import.meta.url), 'utf8'), {
    window: { __ModuleLoader__: { load(value) { entry = value } } },
  })
  assert.equal(entry.id, '@deepseek-ai/dsh-client-ui-model-retry')
  const client = entry.factory(name => { assert.equal(name, 'react'); return react })
  let localeDisposed = false
  client.apply({
    effect(fn) { disposers.push(fn()) },
    locale: { register(ns, value) { dictionaries = value; return () => { localeDisposed = true } } },
    settingsScope: { bind(spec) { assert.equal(spec.namespace, 'model-retry-settings'); return scope } },
    slots: { inject(name, fn) { assert.equal(name, 'settings.general.item'); fn() }, register(options, component) { registration = options; render = component } },
  })
  assert.equal(registration.id, 'model-retry')
  const tree = render({ ...registration.inject(), t: key => dictionaries.zh[key] })
  assert.equal(tree.type, 'form')
  assert.equal(tree.children[1].props.value, '7')
  assert.equal(tree.children[1].props['aria-label'], '模型重试次数')
  assert.equal(tree.children[1].props.min, 0)
  assert.equal(tree.children[2].props.disabled, true)
  assert.deepEqual(Object.keys(dictionaries.zh), Object.keys(dictionaries.en))
  for (const dispose of disposers) dispose()
  assert.equal(localeDisposed, true)
})

test('shows saving and success feedback when the budget is persisted', async () => {
  let entry
  let registration
  let render
  let dictionaries
  const saveCalls = []
  const snapshot = { status: 'ready', writable: true, value: { maxRetries: 7 } }
  const scope = {
    getSnapshot: () => snapshot,
    subscribe: () => () => {},
    set: async (key, value) => { saveCalls.push([key, value]) },
  }
  let hookIndex = 0
  const hookStates = []
  const react = {
    createElement: (type, props, ...children) => ({ type, props, children }),
    useSyncExternalStore: (_, getSnapshot) => getSnapshot(),
    useState: initial => {
      const index = hookIndex++
      if (!(index in hookStates)) hookStates[index] = initial
      return [hookStates[index], next => { hookStates[index] = typeof next === 'function' ? next(hookStates[index]) : next }]
    },
  }
  vm.runInNewContext(await readFile(new URL('../lib/client.js', import.meta.url), 'utf8'), {
    window: { __ModuleLoader__: { load(value) { entry = value } } },
  })
  const client = entry.factory(name => { assert.equal(name, 'react'); return react })
  client.apply({
    effect(fn) { fn() },
    locale: { register(ns, value) { dictionaries = value; return () => {} } },
    settingsScope: { bind() { return scope } },
    slots: { inject(_, fn) { fn() }, register(options, component) { registration = options; render = component } },
  })
  const renderRow = () => { hookIndex = 0; return render({ ...registration.inject(), t: key => dictionaries.zh[key] }) }

  let tree = renderRow()
  tree.children[1].props.onChange({ target: { value: '12' } })
  tree = renderRow()
  assert.equal(tree.children[2].props.disabled, false)
  const pending = tree.props.onSubmit({ preventDefault() {} })
  tree = renderRow()
  assert.equal(tree.children[2].children[0], '保存中…')
  await pending
  tree = renderRow()
  assert.deepEqual(saveCalls, [['maxRetries', 12]])
  assert.equal(tree.children[2].props.disabled, true)
  const status = tree.children[0].children.find(child => child?.props?.role === 'status')
  assert.equal(status.children[0], '保存成功')
})
