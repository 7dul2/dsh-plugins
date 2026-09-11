import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import { test } from 'node:test'

test('portals the billing pill into the host token-usage row with matching pill styles', async () => {
  let entry
  let render
  let dictionaries
  const dock = { id: 'stats-row' }
  const usage = {
    status: 'ready',
    value: {
      sessions: [{
        sessionId: 'session-1',
        models: {
          'deepseek-flash': {
            requests: 1,
            input: 100,
            cacheRead: 0,
            cacheWrite: 0,
            output: 10,
            periods: {
              peak: { requests: 0, input: 0, cacheRead: 0, cacheWrite: 0, output: 0 },
              offPeak: { requests: 1, input: 100, cacheRead: 0, cacheWrite: 0, output: 10 },
            },
          },
        },
      }],
    },
  }
  const cost = {
    status: 'ready',
    value: {
      currency: 'CNY',
      prices: { 'deepseek-flash': { input: 0.01, cacheRead: 0, cacheWrite: 0, output: 0.02 } },
    },
  }
  let hookIndex = 0
  const hookStates = []
  let effects = []
  const react = {
    createElement: (type, props, ...children) => ({ type, props, children }),
    useMemo: (factory) => factory(),
    useState: initial => {
      const index = hookIndex++
      if (!(index in hookStates)) hookStates[index] = initial
      return [hookStates[index], next => {
        hookStates[index] = typeof next === 'function' ? next(hookStates[index]) : next
      }]
    },
    useEffect: effect => { effects.push(effect) },
  }
  const reactDom = {
    createPortal: (node, target) => ({ type: 'portal', node, target }),
  }
  vm.runInNewContext(await readFile(new URL('../lib/client.js', import.meta.url), 'utf8'), {
    document: { querySelector: selector => selector === '[data-composer-stats]' ? dock : null },
    window: { __ModuleLoader__: { load(value) { entry = value } } },
  })
  const client = entry.factory(name => {
    if (name === 'react') return react
    if (name === 'react-dom') return reactDom
    throw new Error(`unexpected dependency: ${name}`)
  })
  client.apply({
    effect(fn) { fn() },
    locale: {
      register(_, value) { dictionaries = value; return () => {} },
      bind() { return key => dictionaries.zh[key] },
    },
    settingsScope: { bind() { return {} } },
    slots: {
      inject(name, callback) {
        if (name === 'conversation.composer.dock') callback()
      },
      register(options, component) {
        if (options.name === 'conversation.composer.dock') render = component
      },
    },
  })
  const t = (key, values = {}) => Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    dictionaries.zh[key],
  )
  const props = {
    sessionId: 'session-1',
    t,
    useUsage: selector => selector(usage),
    useCost: selector => selector(cost),
    useLocale: selector => selector({ active: 'zh' }),
  }
  const renderRow = () => {
    hookIndex = 0
    effects = []
    const tree = render(props)
    for (const effect of effects) effect()
    return tree
  }

  assert.equal(renderRow().type, 'span')
  const tree = renderRow()
  assert.equal(tree.type, 'portal')
  assert.equal(tree.target, dock)
  assert.equal(tree.node.props['data-cost-billing-pill'], true)
  const button = tree.node.children[0]
  assert.equal(button.type, 'button')
  assert.deepEqual(JSON.parse(JSON.stringify(button.props.style)), {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    boxSizing: 'border-box',
    maxWidth: '100%',
    padding: '1px 8px',
    border: 'none',
    borderRadius: 24,
    background: 'transparent',
    color: 'var(--dsw-alias-label-tertiary)',
    font: 'inherit',
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 'inherit',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
  })
})
