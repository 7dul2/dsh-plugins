import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Context } from '@deepseek-ai/cordis'
import Commands from '@deepseek-ai/dsh-commands'
import Sessions from '@deepseek-ai/dsh-session'
import * as plugin from '../lib/index.js'

for (const task of ['', '修复我的设置插件']) test(`command sends one tutorial message: ${task || 'guide only'}`, async () => {
  const ctx = new Context()
  try {
    await ctx.plugin(Sessions)
    await ctx.plugin(Commands)
    const fiber = ctx.plugin(plugin)
    await fiber
    const sent = []
    const agent = { session: ctx.sessions.create('guide-test'), followup: message => sent.push(message) }
    assert.equal(ctx.commands.list(agent).find(x => x.name === 'plugin-dev').input.attachments, true)
    const result = await ctx.commands.execute(agent, `/plugin-dev ${task}`, [], new AbortController().signal)
    assert.equal(result.result.kind, 'success')
    assert.equal(sent.length, 1)
    assert.equal(sent[0].role, 'user')
    assert.equal(sent[0].source.kind, 'user')
    assert.ok(Object.isFrozen(sent[0]))
    const text = sent[0].content[0].text
    assert.ok(text.includes('# DSH 独立插件开发与维护教程'))
    assert.ok(text.includes(task ? `用户需求：\n${task}` : '本次不要运行工具'))
    assert.ok(!text.includes('Codex'))
    assert.deepEqual(agent.session.snapshotEvents().map(e => e.type), ['command/run', 'command/done'])
    await fiber.dispose()
    assert.equal(ctx.commands.find(agent, 'plugin-dev'), undefined)
  } finally { await ctx.fiber.dispose() }
})

test('cancelled command sends nothing; admitted attachments are preserved', () => {
  let command
  plugin.apply({ commands: { register(value) { command = value } } })
  const sent = []
  const invocation = { agent: { followup: message => sent.push(message) }, rawInput: '', attachments: [], signal: AbortSignal.abort() }
  assert.throws(() => command.handler(invocation))
  assert.equal(sent.length, 0)
  const image = { type: 'image', source: { type: 'url', url: 'https://example.invalid/test.png' } }
  command.handler({ ...invocation, attachments: [image], signal: new AbortController().signal })
  assert.deepEqual(sent[0].content[1], image)
  assert.ok(sent[0].content[0].text.includes('处理以下用户需求'))
})
