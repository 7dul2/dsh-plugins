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
    document: {
      querySelector: selector => selector === '[data-composer-stats]' ? dock : null,
      addEventListener() {},
      removeEventListener() {},
    },
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

  button.props.onClick()
  const openTree = renderRow()
  const panel = openTree.node.children[2]
  assert.equal(panel.type, 'div')
  assert.deepEqual(JSON.parse(JSON.stringify(panel.props.style)), {
    position: 'fixed',
    bottom: 72,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1100,
    width: 'min(800px, calc(100vw - 24px))',
    minWidth: 'min(300px, calc(100vw - 24px))',
    maxWidth: 'calc(100vw - 24px)',
    maxHeight: 'calc(100dvh - 96px)',
    overflowY: 'auto',
    boxSizing: 'border-box',
    display: 'block',
    padding: 16,
    border: 0,
    borderRadius: 12,
    background: 'var(--dsw-specific-menu)',
    '--dsw-elevation-stroke-color': 'var(--dsw-alias-border-l1)',
    boxShadow: 'var(--dsw-elevation-prominent)',
    fontSize: 12,
    lineHeight: '18px',
    color: 'var(--dsw-alias-label-secondary)',
    cursor: 'default',
  })
  assert.equal(panel.children[0].children[0].children[1], '本次会话计费')
  assert.equal(panel.children[0].children[1].children[0], '¥0.00')

  const modelUsage = usage.value.sessions[0].models['deepseek-flash']
  Object.assign(modelUsage, { input: 1_000_000, cacheRead: 2_000_000, cacheWrite: 500_000, output: 250_000 })
  cost.value.prices['deepseek-flash'] = { input: 2, cacheRead: 0.2, cacheWrite: 4, output: 8 }
  assert.equal(renderRow().node.children[2].children[0].children[1].children[0], '¥6.40')
  modelUsage.periods = {
    peak: { input: 1_000_000, cacheRead: 1_000_000, cacheWrite: 250_000, output: 125_000 },
    offPeak: { input: 0, cacheRead: 1_000_000, cacheWrite: 250_000, output: 125_000 },
  }
  cost.value.prices['deepseek-flash'].peak = { input: 4, cacheRead: 0.4, cacheWrite: 8, output: 16 }
  assert.equal(renderRow().node.children[2].children[0].children[1].children[0], '¥10.60')
  assert.equal(panel.children[1].props['aria-hidden'], true)
  assert.equal(panel.children[2].type, 'dl')
  const sankeyNode = panel.children.find(child => typeof child?.type === 'function')
  const chart = sankeyNode.type(sankeyNode.props)
  assert.equal(chart.type, 'svg')
  assert.equal(chart.props.viewBox, '0 0 760 340')
  const link = chart.children.find(child => child?.type === 'path')
  assert.match(link.props.d, /C/)
  assert.match(link.props.d, /Z$/)
  assert.equal(link.props.fillOpacity, 0.28)

  const expandedChart = sankeyNode.type({
    rows: [
      { model: 'priced-model', cost: 100, usage: { requests: 3 } },
      { model: 'free-model', cost: 0, usage: { requests: 2 } },
      { model: '(unknown)', cost: null, usage: { requests: 1 } },
    ],
    currency: 'CNY',
    tag: 'zh-CN',
    t,
  })
  assert.equal(expandedChart.children.filter(child => child?.type === 'path').length, 4)
  const ribbons = expandedChart.children.filter(child => child?.type === 'path')
  assert.equal(new Set(ribbons.map(child => child.props.key)).size, ribbons.length)
  assert.ok(ribbons.every(child => !/NaN|Infinity/.test(child.props.d)))
  assert.equal(expandedChart.children.filter(child => child?.type === 'rect').length, 9)
  const labels = expandedChart.children
    .filter(child => child?.type === 'text')
    .map(child => child.children[0])
  assert.ok(labels.includes('¥0.00'))
  assert.ok(labels.includes('未知'))
  const proportional = sankeyNode.type({
    rows: [
      { model: 'A', cost: 1, usage: { requests: 3, input: 10 } },
      { model: 'B', cost: 4, usage: { requests: 1, input: 90 } },
      { model: 'Free', cost: 0, usage: { requests: 0, input: 0 } },
    ],
    currency: 'CNY', tag: 'zh-CN', t,
  })
  const height = key => proportional.children.find(child => child.props?.key === key).props.height
  assert.ok(Math.abs(height('node-0-0') / height('node-0-1') - 3) < 1e-8)
  assert.ok(Math.abs(height('node-1-0') / height('node-1-1') - 1 / 9) < 1e-8)
  assert.ok(Math.abs(height('node-2-0') / height('node-2-1') - 1 / 4) < 1e-8)
  assert.equal(height('node-2-2'), 0)
})
