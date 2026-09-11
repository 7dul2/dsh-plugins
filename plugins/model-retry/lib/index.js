/** Settings-backed budget for the existing llm-retry executor. */
import z from '@deepseek-ai/schemastery'

export const name = 'model-retry-settings'
export const inject = ['settings', 'agents']
export const Config = z.object({
  maxRetries: z.number().step(1).min(0).max(Number.MAX_SAFE_INTEGER).default(5),
})

/** Reject invalid persisted or composition values before they reach recovery. */
export function validate(value) {
  if (!Number.isSafeInteger(value.maxRetries) || value.maxRetries < 0) {
    throw new Error('model-retry-settings.maxRetries must be a non-negative safe integer')
  }
}

/** Register a durable setting and delegate execution to llm-retry. */
export function apply(ctx, config = { maxRetries: 5 }) {
  validate(config)
  let source = () => config
  ctx.settings.installSection(ctx, 'model-retry-settings', Config, config, {
    validate,
    setSource: current => { source = current },
    onChange: () => {},
  })
  const steps = new WeakMap()
  ctx.on('agent/request', (payload, next) => {
    const captured = steps.get(payload.agent)
    if (!captured || captured.turn !== payload.turn || captured.step !== payload.step) {
      steps.set(payload.agent, { turn: payload.turn, step: payload.step, maxRetries: source().maxRetries })
    }
    return next()
  }, { prepend: true })
  ctx.on('agent/request-error', async (payload, next) => {
    const original = payload.retryPolicy
    if (original === undefined) return next()
    let captured = steps.get(payload.agent)
    if (!captured || captured.turn !== payload.turn || captured.step !== payload.step) {
      captured = { turn: payload.turn, step: payload.step, maxRetries: source().maxRetries }
      steps.set(payload.agent, captured)
    }
    // The waterfall shares its payload with downstream listeners. Restore it
    // after settlement so observers outside this wrapper retain provider policy.
    payload.retryPolicy = {
      ...original,
      mode: 'normal',
      maxRetries: captured.maxRetries,
      retryableCodes: original.mode === 'normal' ? original.retryableCodes : ['EMPTY_RESPONSE', 'RATE_LIMIT', 'SERVER', 'TIMEOUT', 'TRANSPORT'],
    }
    try {
      return await next()
    } finally {
      payload.retryPolicy = original
    }
  }, { prepend: true })
}
