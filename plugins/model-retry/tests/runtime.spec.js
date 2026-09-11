/** Integration with this machine's installed Cordis and retry executor. */
import { readdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as plugin from '../lib/index.js'

const store = join(homedir(), '.dsh/runtime/node_modules/.pnpm')
const directory = (await readdir(store)).find(name => name.startsWith('@deepseek-ai+dsh-llm-retry@0.1.5-rc.1_'))
const require = createRequire(join(store, directory, 'node_modules/@deepseek-ai/dsh-llm-retry/package.json'))
const { Context } = require('@deepseek-ai/cordis')
const retry = await import(require.resolve('@deepseek-ai/dsh-llm-retry'))

for (const budget of [0, 1, 3]) test(`shipping executor logs exactly ${budget} retries`, async () => {
  const ctx = new Context()
  let projection
  let state = {}
  const events = []
  const settings = { installSection(owner, ns, schema, config, hooks) { hooks.setSource(() => ({ maxRetries: budget })) } }
  ctx.provide('settings', settings)
  ctx.provide('agents', {})
  ctx.provide('sessionProjections', {
    register(value) { projection = value; state = value.init() },
    stateOf() { return state },
  })
  try {
    await ctx.plugin(retry)
    const fiber = ctx.plugin(plugin)
    await fiber
    const agent = { session: { append(type, data) { const event = { type, data }; events.push(event); state = projection.apply(state, event) } } }
    const payload = { agent, turn: 1, step: 1, provider: 'mock', failure: { code: 'SERVER', message: 'offline' }, signal: new AbortController().signal, retryPolicy: { mode: 'normal', maxRetries: 5, retryableCodes: ['SERVER'], initialDelayMs: 0, maxDelayMs: 0, jitterRatio: 0 } }
    for (let attempt = 0; attempt < budget + 1; attempt++) {
      const action = await ctx.waterfall('agent/request-error', payload, async () => undefined)
      assert.equal(action?.kind, attempt < budget ? 'retry' : undefined)
    }
    assert.equal(events.filter(event => event.type === 'llm/retry').length, budget)
    assert.deepEqual(events.filter(event => event.type === 'llm/retry').map(event => [event.data.retry, event.data.maxRetries]), Array.from({ length: budget }, (_, i) => [i + 1, budget]))
    await fiber.dispose()
    const fresh = { ...payload, agent: { session: agent.session }, step: 2 }
    state = {}
    assert.equal((await ctx.waterfall('agent/request-error', fresh, async () => undefined))?.kind, 'retry')
    assert.equal(events.at(-2).data.maxRetries, 5)
  } finally { await ctx.fiber.dispose() }
})
