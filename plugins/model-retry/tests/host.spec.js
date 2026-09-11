import assert from 'node:assert/strict'
import { test } from 'node:test'
import { apply, validate } from '../lib/index.js'

function fixture() {
  const listeners = new Map()
  let setting = { maxRetries: 2 }
  const ctx = {
    settings: { installSection(owner, ns, schema, config, hooks) {
      assert.equal(ns, 'model-retry-settings')
      hooks.setSource(() => setting)
    } },
    on(event, callback, options) { assert.equal(options.prepend, true); listeners.set(event, callback) },
  }
  apply(ctx)
  return { listeners, set(value) { validate(value); setting = value } }
}
const policy = { mode: 'normal', maxRetries: 5, retryableCodes: ['SERVER'], initialDelayMs: 1, maxDelayMs: 10, jitterRatio: 0 }

test('rejects invalid budgets', () => {
  for (const maxRetries of [-1, 0.5, NaN, Infinity, '2', Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => validate({ maxRetries }))
  for (const maxRetries of [0, 5, Number.MAX_SAFE_INTEGER]) validate({ maxRetries })
})
test('freezes budget per step, delegates and restores provider policy', async () => {
  const f = fixture()
  const payload = { agent: {}, turn: 1, step: 1, retryPolicy: policy }
  f.listeners.get('agent/request')(payload, () => {})
  f.set({ maxRetries: 0 })
  const result = await f.listeners.get('agent/request-error')(payload, async () => {
    assert.deepEqual(payload.retryPolicy, { ...policy, maxRetries: 2 })
    return { kind: 'retry' }
  })
  assert.deepEqual(result, { kind: 'retry' })
  assert.equal(payload.retryPolicy, policy)
  payload.step++
  f.listeners.get('agent/request')(payload, () => {})
  await assert.rejects(f.listeners.get('agent/request-error')(payload, async () => {
    assert.equal(payload.retryPolicy.maxRetries, 0)
    throw new Error('downstream')
  }), /downstream/)
  assert.equal(payload.retryPolicy, policy)
})
test('missing policy delegates unchanged; unlimited policy gets stable bounded transient policy', async () => {
  const f = fixture()
  const payload = { agent: {}, turn: 1, step: 1 }
  await f.listeners.get('agent/request-error')(payload, async () => assert.equal(payload.retryPolicy, undefined))
  payload.retryPolicy = { mode: 'always', initialDelayMs: 1, maxDelayMs: 10, jitterRatio: 0 }
  let first
  for (const code of ['SERVER', 'TIMEOUT']) {
    payload.failure = { code }
    await f.listeners.get('agent/request-error')(payload, async () => {
      if (first) assert.deepEqual(payload.retryPolicy, first)
      first = payload.retryPolicy
      assert.equal(first.maxRetries, 2)
      assert.equal(first.mode, 'normal')
    })
  }
})
