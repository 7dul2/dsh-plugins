/** A human command delivering the packaged DSH tutorial as logged model input. */
import { readFileSync } from 'node:fs'
import { createUserMessage } from '@deepseek-ai/dsh-llm'

export const name = 'command-plugin-dev'
export const inject = ['commands']

/** Register /plugin-dev; read the packaged guide once during activation. */
export function apply(ctx) {
  const guide = readFileSync(new URL('../GUIDE.md', import.meta.url), 'utf8').trim()
  if (!guide) throw new Error('plugin-dev: GUIDE.md must not be empty')
  ctx.commands.register({
    name: 'plugin-dev',
    description: '加载 DSH 插件开发教程，可附带开发或维护需求',
    input: { hint: '[插件开发或维护需求]', attachments: true },
    handler: ({ agent, rawInput, attachments, signal }) => {
      signal.throwIfAborted()
      const task = rawInput.trim()
      const hasTask = task.length > 0 || attachments.length > 0
      const instruction = hasTask
        ? '请按照上面的 DSH 插件教程处理以下用户需求。需求不完整时先检查与任务直接相关的现有文件，再询问必要信息。'
        : '请记住以上 DSH 插件开发教程，仅用一句话确认已收到并等待用户提出具体需求。本次不要运行工具、修改文件、安装插件或开始开发。'
      agent.followup(createUserMessage({
        content: [
          { type: 'text', text: `${guide}\n\n---\n\n${instruction}${task ? `\n\n用户需求：\n${task}` : ''}` },
          ...attachments,
        ],
        source: { kind: 'user' },
      }))
      return { kind: 'success', text: hasTask ? 'DSH 插件教程和需求已排入当前会话。' : 'DSH 插件教程已排入当前会话，模型确认后可提出具体需求。' }
    },
  })
}
