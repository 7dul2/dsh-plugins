/** Real Loader and Agent loop; only the external model is replaced. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import Include from '@deepseek-ai/cordis-plugin-include'
import Commands from '@deepseek-ai/dsh-commands'
import Sessions from '@deepseek-ai/dsh-session'
import Agents from '@deepseek-ai/dsh-agent'
import Loop from '@deepseek-ai/dsh-agent-loop'
import Projections from '@deepseek-ai/dsh-session-projection'
import Prompt from '@deepseek-ai/dsh-system-prompt'
import Tools from '@deepseek-ai/dsh-tools'
import Llm, { LlmAdapter } from '@deepseek-ai/dsh-llm'
import * as plugin from '../lib/index.js'

test('Loader-mounted command delivers exact guide to model and durable user history', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-guide-'))
  const ctx = new Context()
  const modules = new Map(Object.entries({ sessions: Sessions, commands: Commands, agents: Agents, loop: Loop, projections: Projections, prompt: Prompt, tools: Tools, llm: Llm, guide: plugin }))
  try {
    const path = join(root, 'cordis.yml')
    await writeFile(path, [...modules.keys()].map(name => `- name: ${name}`).join('\n') + '\n')
    ctx.baseUrl = pathToFileURL(root).href + '/'
    await ctx.plugin(Loader)
    ctx.loader.builtins.include = Include
    ctx.loader.internal = { version: 'v2', async import(name) { if (!modules.has(name)) throw new Error(name); return modules.get(name) } }
    await ctx.loader.create({ name: 'cordis:include', config: { path: pathToFileURL(path).href } })
    await ctx.loader.await()
    const requests = []
    class Model extends LlmAdapter {
      async *stream(options) {
        requests.push(options)
        yield { type: 'block-start', index: 0, blockType: 'text' }
        yield { type: 'block-end', index: 0, block: { type: 'text', text: '已收到教程，请提出需求。' } }
        yield { type: 'finish', reason: { kind: 'stop' } }
      }
    }
    ctx.llm.registerAdapter(['mock'], new Model())
    const agent = await ctx.agentLoop.create('guide-loader', { provider: 'mock', model: 'mock' })
    const result = await ctx.commands.execute(agent, '/plugin-dev', [], new AbortController().signal)
    assert.equal(result.result.kind, 'success')
    await agent.whenIdle()
    assert.equal(requests.length, 1)
    const guide = (await readFile(new URL('../GUIDE.md', import.meta.url), 'utf8')).trim()
    const logged = agent.session.deriveMessages().find(message => message.role === 'user')
    assert.ok(logged.content[0].text.startsWith(guide + '\n\n---'))
    assert.ok(JSON.stringify(requests[0]).includes('本次不要运行工具'))
    assert.equal(agent.session.deriveMessages().at(-1).content[0].text, '已收到教程，请提出需求。')
  } finally {
    await ctx.fiber.dispose()
    await rm(root, { recursive: true, force: true })
  }
})
