import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import { test } from 'node:test'

const source = await readFile(new URL('../lib/index.js', import.meta.url), 'utf8')
const pureFunctions = source.slice(source.indexOf('function inPeakWindow('), source.indexOf('function foldTitle('))
const { foldSessionEvents, mergeLedgers } = vm.runInNewContext(
  'const UNKNOWN_MODEL = "(unknown)"; const PEAK_OFFSET_MS = 28800000;\n' +
  pureFunctions + '\n({ foldSessionEvents, mergeLedgers })',
)
const event = (type, data, seq) => ({ type, data, seq, time: 0 })
const route = (provider, seq) => event('request/header', { header: { config: { provider, model: 'flash' } } }, seq)
const sample = (step, seq, inputTokens = 100) => event('assistant/message', { turn: 0, step, usage: { inputTokens } }, seq)

test('keeps provider routes separate while de-duplicating settlements', () => {
  const ledger = foldSessionEvents([
    route('a', 0), sample(0, 1), sample(0, 2, 150),
    route('b', 3), sample(1, 4), sample(1, 5),
  ], 0)
  assert.equal(ledger.get('a/flash').requests, 1)
  assert.equal(ledger.get('a/flash').input, 150)
  assert.equal(ledger.get('b/flash').requests, 1)
  assert.equal(ledger.get('b/flash').input, 100)
  assert.equal(ledger.get('a/flash').provider, 'a')
  assert.equal(ledger.get('b/flash').modelId, 'flash')
  const combined = new Map()
  mergeLedgers(combined, ledger)
  assert.equal(combined.get('a/flash').provider, 'a')
  assert.equal(combined.get('b/flash').modelId, 'flash')
})

test('moves a replaced settlement to its new route without losing request counts', () => {
  const ledger = foldSessionEvents([route('a', 0), sample(0, 1), route('b', 2), sample(0, 3)], 0)
  assert.equal(ledger.get('a/flash').requests, 0)
  assert.equal(ledger.get('a/flash').input, 0)
  assert.equal(ledger.get('b/flash').requests, 1)
  assert.equal(ledger.get('b/flash').input, 100)
})

test('uses a new context route and never borrows an old provider for missing metadata', () => {
  const ledger = foldSessionEvents([
    route('a', 0), sample(0, 1),
    event('request/context', { provider: 'b', model: 'flash' }, 2), sample(1, 3),
    event('request/header', { header: { config: { model: 'flash' } } }, 4), sample(2, 5),
  ], 2)
  assert.equal(ledger.has('a/flash'), false)
  assert.equal(ledger.get('b/flash').requests, 1)
  assert.equal(ledger.get('(unknown)/flash').requests, 1)
})
