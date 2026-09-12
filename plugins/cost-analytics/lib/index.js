/**
 * Host half of the cost-analytics plugin.
 *
 * It owns two settings namespaces and the whole-library scan behind them:
 *
 * - `cost-analytics` is the user-facing price table: the composition `base`
 *   layer comes from this entry's Config, and `settings.yaml` (or any
 *   settings UI) overrides it per field.
 * - `cost-analytics-usage` is host-written only. One scan enumerates the
 *   session corpus through `sessionQuery`, folds every session's durable
 *   usage samples into per-provider/model request counts, the four disjoint token
 *   buckets, and peak/off-peak period splits, folds each subagent session
 *   into its nearest non-subagent ancestor, and publishes the rollup. The
 *   browser half prices those buckets; no money is computed here.
 *
 * Peak billing follows the configured provider's Beijing (UTC+8) weekday windows:
 * 9:00–12:00 and 14:00–18:00 are peak, everything else off-peak. A model
 * whose price entry carries `peak` is billed at the peak rates inside those
 * windows and at its flat rates outside them; a flat-only entry uses the
 * flat rates for every window.
 *
 * Usage samples come from `assistant/message` (its `usage` field, or the
 * last `usage` chunk of its embedded stream) and from `assistant/attempt`
 * streams. The fold mirrors the shipped `tokenUsage` projection: one sample
 * per (turn, step) slot, a re-settlement of the same slot replaces the
 * earlier sample, and `llm/retry-started` closes the slot so the retried
 * attempt counts as its own request. Events at or below the log's
 * fork-inherited prefix are skipped, so a fork child bills its own requests
 * rather than re-billing the copied history.
 *
 * Failure containment: an unreadable session log is excluded and counted in
 * `degraded`; a failed enumeration or write records `error` and leaves the
 * previous rollup in place. Nothing is fabricated when enumeration is
 * impossible.
 *
 * @module @deepseek-ai/dsh-client-ui-cost-analytics
 */

import z from '@deepseek-ai/schemastery'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'cost-analytics'

/** Required services: the settings provider owns both namespaces, the query engine enumerates and reads session logs. */
export const inject = ['settings', 'sessionQuery']

/** Settings namespace carrying the user-editable price table and currency. */
export const SETTINGS_NAMESPACE = 'cost-analytics'

/** Settings namespace carrying the host-written usage rollup. */
export const USAGE_NAMESPACE = 'cost-analytics-usage'

/** Model key recorded for a usage sample whose log names no route. */
const UNKNOWN_MODEL = '(unknown)'

/** Fixed Beijing offset (UTC+8) applied before the peak-window clock read. */
const PEAK_OFFSET_MS = 8 * 3_600_000

/** One model's rates for a billing window. */
const rates = z.object({
  input: z.number().min(0).default(0),
  cacheRead: z.number().min(0).default(0),
  cacheWrite: z.number().min(0).default(0),
  output: z.number().min(0).default(0),
})

/**
 * One price entry in currency per million tokens: flat rates, plus optional peak rates. When `peak` is
 * present the flat fields price off-peak windows only. The union keeps an
 * absent `peak` absent — a bare object schema would materialize all-zero peak
 * rates and silently move the model into two-tier billing.
 */
const priceEntry = z.object({
  input: z.number().min(0).default(0),
  cacheRead: z.number().min(0).default(0),
  cacheWrite: z.number().min(0).default(0),
  output: z.number().min(0).default(0),
  peak: z.union([rates, z.const(null)]).default(null),
})

/**
 * Deployment configuration.
 *
 * @typedef {object} Config
 * @property {string} currency ISO-4217 code the browser half formats amounts in.
 * @property {Record<string, object>} prices provider/model price table; a model-only key is a compatibility fallback forming the namespace `base` layer.
 * @property {number} scanConcurrency session logs read concurrently by one scan (1–16).
 * @property {number} refreshIntervalMinutes minutes between whole-corpus rescans (1+).
 * @property {number} bootDelaySeconds seconds after activation before the first scan (0–600).
 * @property {number} activityRescanSeconds minimum seconds between scans caused by session activity; 0 disables them.
 */

/** @type {import('@deepseek-ai/schemastery').Schema<Config>} Schemastery validation; the Loader rejects invalid entries at load. */
export const Config = z.object({
  currency: z.string().default('CNY'),
  prices: z.dict(priceEntry),
  scanConcurrency: z.number().step(1).min(1).max(16).default(4),
  refreshIntervalMinutes: z.number().step(1).min(1).default(15),
  bootDelaySeconds: z.number().step(1).min(0).max(600).default(3),
  activityRescanSeconds: z.number().step(1).min(0).max(3600).default(60),
})

/** Request count and token buckets of one billing window. */
const periodUsage = z.object({
  requests: z.number().default(0),
  input: z.number().default(0),
  cacheRead: z.number().default(0),
  cacheWrite: z.number().default(0),
  output: z.number().default(0),
})

/** One model's rollup inside one session row: lifetime totals plus both period splits. */
const modelUsage = z.object({
  provider: z.string().default(''),
  modelId: z.string().default(''),
  requests: z.number().default(0),
  input: z.number().default(0),
  cacheRead: z.number().default(0),
  cacheWrite: z.number().default(0),
  output: z.number().default(0),
  periods: z.object({ peak: periodUsage, offPeak: periodUsage }),
})

/** One session row: a session and every subagent session folded into it. */
const sessionUsage = z.object({
  sessionId: z.string(),
  title: z.string().default(''),
  workspacePath: z.string().default(''),
  archived: z.boolean().default(false),
  models: z.dict(modelUsage),
})

/** The complete host-written rollup. */
const usageSection = z.object({
  sessions: z.array(sessionUsage).default([]),
  unpricedModels: z.array(z.string()).default([]),
  updatedAt: z.number().default(0),
  degraded: z.string().default(''),
  error: z.string().default(''),
})

/** The user-editable price table. */
const costSection = z.object({
  currency: z.string().default('CNY'),
  prices: z.dict(priceEntry),
})

/** @returns whether `hour` falls in a Beijing weekday peak window (9–12, 14–18). */
function inPeakWindow(hour) {
  return (hour >= 9 && hour < 12) || (hour >= 14 && hour < 18)
}

/**
 * Classify one event timestamp against the Beijing weekday peak windows.
 * @param timeMs - event timestamp in Unix epoch milliseconds.
 * @returns whether the sample bills at peak rates.
 */
function isPeakTime(timeMs) {
  const shifted = new Date(timeMs + PEAK_OFFSET_MS)
  const day = shifted.getUTCDay()
  if (day < 1 || day > 5) return false
  return inPeakWindow(shifted.getUTCHours())
}

/** @returns a non-negative integer token count; absent and malformed counts read as 0. */
function tokenCount(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : 0
}

/**
 * Read the last `usage` chunk of one durable Assistant stream.
 * @param stream - compact stream records of an Assistant settlement.
 * @returns the chunk's token usage, or `undefined` when the stream reports none.
 */
function lastUsageChunk(stream) {
  if (!Array.isArray(stream)) return undefined
  for (let index = stream.length - 1; index >= 0; index -= 1) {
    const record = stream[index]
    if (record?.type === 'chunk' && record.chunk?.type === 'usage') return record.chunk.usage
  }
  return undefined
}

/** @returns one zeroed model rollup with both period splits. */
function emptyModelUsage() {
  return {
    requests: 0,
    input: 0,
    cacheRead: 0,
    cacheWrite: 0,
    output: 0,
    periods: {
      peak: { requests: 0, input: 0, cacheRead: 0, cacheWrite: 0, output: 0 },
      offPeak: { requests: 0, input: 0, cacheRead: 0, cacheWrite: 0, output: 0 },
    },
  }
}

/** @returns whether two token-bucket readings are identical. */
function sameBuckets(left, right) {
  return left.input === right.input
    && left.output === right.output
    && left.cacheRead === right.cacheRead
    && left.cacheWrite === right.cacheWrite
}

/**
 * Apply one signed sample to a model's ledger.
 * @param models - provider/model-keyed ledger map being folded.
 * @param model - provider/model route key the sample belongs to.
 * @param peak - whether the sample bills in a peak window.
 * @param buckets - the four disjoint token buckets.
 * @param requestDelta - request count to add (0 when replacing a slot).
 * @param sign - `1` to add the sample, `-1` to subtract a superseded one.
 */
function applySample(models, model, peak, buckets, requestDelta, sign) {
  let entry = models.get(model)
  if (entry === undefined) {
    entry = emptyModelUsage()
    models.set(model, entry)
  }
  const period = peak ? entry.periods.peak : entry.periods.offPeak
  entry.requests += requestDelta
  period.requests += requestDelta
  for (const key of ['input', 'cacheRead', 'cacheWrite', 'output']) {
    entry[key] += sign * buckets[key]
    period[key] += sign * buckets[key]
  }
}

/**
 * Fold one session log into a provider/model-keyed ledger.
 *
 * Events at or below `inheritedCount` belong to a fork's copied prefix and
 * are skipped. Samples use the latest request header or context route,
 * keeping provider and model together. Missing providers remain unknown.
 * @param events - the session's complete raw event log.
 * @param inheritedCount - exact fork-inherited prefix length of that log.
 * @returns provider/model key to rollup map; an empty map when the log bills nothing.
 */
function foldSessionEvents(events, inheritedCount) {
  const models = new Map()
  let last = null
  let route
  for (const event of events) {
    if (event === null || typeof event !== 'object') continue
    if (typeof event.seq !== 'number' || event.seq < inheritedCount) continue
    const data = event.data
    if (event.type === 'request/header') {
      route = data?.header?.config
      continue
    }
    if (event.type === 'request/context') {
      route = data
      continue
    }
    if (event.type === 'llm/retry-started') {
      if (last !== null && last.turn === data?.turn && last.step === data?.step) last = null
      continue
    }
    let sample
    if (event.type === 'assistant/message') sample = data?.usage ?? lastUsageChunk(data?.stream)
    else if (event.type === 'assistant/attempt') sample = lastUsageChunk(data?.stream)
    else continue
    if (sample === undefined || sample === null) continue
    const buckets = {
      input: tokenCount(sample.inputTokens),
      output: tokenCount(sample.outputTokens),
      cacheRead: tokenCount(sample.cacheReadTokens),
      cacheWrite: tokenCount(sample.cacheWriteTokens),
    }
    if (buckets.input === 0 && buckets.output === 0 && buckets.cacheRead === 0 && buckets.cacheWrite === 0) continue
    const turn = typeof data?.turn === 'number' ? data.turn : -1
    const step = typeof data?.step === 'number' ? data.step : -1
    const modelId = typeof route?.model === 'string' && route.model !== '' ? route.model : UNKNOWN_MODEL
    const provider = typeof route?.provider === 'string' && route.provider !== '' ? route.provider : UNKNOWN_MODEL
    const model = provider + '/' + modelId
    const peak = isPeakTime(event.time)
    const replacement = last !== null && last.turn === turn && last.step === step
    if (replacement && last.model === model && sameBuckets(last.buckets, buckets)) continue
    const moved = replacement && last.model !== model
    if (replacement) applySample(models, last.model, last.peak, last.buckets, moved ? -1 : 0, -1)
    applySample(models, model, peak, buckets, replacement && !moved ? 0 : 1, 1)
    Object.assign(models.get(model), { provider, modelId })
    last = { turn, step, model, peak, buckets }
  }
  return models
}

/**
 * Fold one child session's ledger into its ancestor's.
 * @param target - accumulator ledger map.
 * @param source - ledger map to fold in.
 */
function mergeLedgers(target, source) {
  for (const [model, entry] of source) {
    const into = target.get(model) ?? emptyModelUsage()
    if (!target.has(model)) target.set(model, into)
    into.provider = entry.provider
    into.modelId = entry.modelId
    into.requests += entry.requests
    for (const key of ['input', 'cacheRead', 'cacheWrite', 'output']) into[key] += entry[key]
    for (const period of ['peak', 'offPeak']) {
      into.periods[period].requests += entry.periods[period].requests
      for (const key of ['input', 'cacheRead', 'cacheWrite', 'output']) {
        into.periods[period][key] += entry.periods[period][key]
      }
    }
  }
}

/** @returns whether one model rollup carries any billed request or token. */
function hasUsage(entry) {
  return entry.requests > 0 || entry.input > 0 || entry.output > 0
    || entry.cacheRead > 0 || entry.cacheWrite > 0
}

/** @returns the newest `session/title` text in one log, or an empty string. */
function foldTitle(events) {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]
    if (event?.type !== 'session/title') continue
    const title = event.data?.title
    if (typeof title === 'string' && title !== '') return title
  }
  return ''
}

/**
 * Run `worker` over every item with at most `limit` in flight.
 * @param items - items to process.
 * @param limit - maximum concurrent workers.
 * @param worker - async function receiving one item.
 * @returns settlement after every item has been visited.
 */
async function runPool(items, limit, worker) {
  let next = 0
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = next
      next += 1
      if (index >= items.length) return
      await worker(items[index])
    }
  })
  await Promise.all(runners)
}

/** @returns one error's message text. */
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Host plugin body.
 * @param ctx - Host context.
 * @param config - validated composition entry config.
 */
export function apply(ctx, config) {
  const log = ctx.logger('cost-analytics')
  /** Price-table owner scope; kept for the resolved price keys a scan needs. */
  let costScope
  /** Set while one scan runs; price edits arriving meanwhile queue exactly one rescan. */
  let scanning = false
  let rescanQueued = false
  /** When the last scan finished, used to space out activity-driven rescans. */
  let lastScanAt = 0

  /**
   * Merge one patch into the usage namespace's user layer.
   * @param patch - fields to merge.
   * @returns whether the write settled.
   */
  const writeUsage = async (patch) => {
    try {
      await ctx.settings.update(USAGE_NAMESPACE, patch)
      return true
    } catch (error) {
      log.error('failed to persist the cost-analytics rollup: %s', errorMessage(error))
      return false
    }
  }

  /** @returns the workspace registry's archive set and session-to-path map, or `undefined` when it is not readable. */
  const readRegistryFacts = () => {
    const registry = ctx.get('workspaceRegistry')
    if (registry === undefined) return undefined
    try {
      const archived = new Set([...registry.archivedSessionIds].map(String))
      const paths = new Map()
      for (const workspace of registry.list()) {
        for (const sessionId of workspace.sessionIds) paths.set(String(sessionId), workspace.path)
      }
      return { archived, paths }
    } catch (error) {
      // A registry still bootstrapping or holding a damaged order must not fail
      // the scan; this pass falls back to header cwd for grouping and marks
      // nothing archived.
      log.warn('workspace registry read failed; grouping falls back to session cwd: %s', errorMessage(error))
      return undefined
    }
  }

  /** @returns the provider/model and model-only keys covered by the price table. */
  const readPricedModels = () => {
    try {
      const prices = costScope === undefined ? {} : costScope.get().prices ?? {}
      return new Set(Object.keys(prices))
    } catch (error) {
      log.warn('price table read failed; unpriced reporting is skipped for this scan: %s', errorMessage(error))
      return undefined
    }
  }

  /**
   * Read one session tree and build its rollup row.
   * @param query - the session query engine.
   * @param rootRecord - corpus record of the tree's non-subagent root.
   * @param childrenByParent - corpus child edges keyed by parent id.
   * @param originBySession - corpus `origin` classification keyed by session id.
   * @param registryFacts - workspace facts, or `undefined` when the registry is unreadable.
   * @param tally - per-scan read-failure counter shared by every row builder.
   * @returns the row, or `null` when the tree bills nothing.
   */
  const buildSessionRow = async (query, rootRecord, childrenByParent, originBySession, registryFacts, tally) => {
    const rootId = String(rootRecord.header.id)
    const memberIds = [rootId]
    const visited = new Set(memberIds)
    const stack = [rootId]
    while (stack.length > 0) {
      const parent = stack.pop()
      for (const child of childrenByParent.get(parent) ?? []) {
        if (visited.has(child)) continue
        visited.add(child)
        // A non-subagent child (a fork) is its own rollup row; only subagent
        // sessions fold upward.
        if (originBySession.get(child) !== 'subagent') continue
        memberIds.push(child)
        stack.push(child)
      }
    }
    const models = new Map()
    let title = ''
    let cwd
    for (const sessionId of memberIds) {
      let snapshot
      try {
        snapshot = await query.readSession(sessionId)
      } catch (error) {
        // One unreadable log is a reported gap, never a fabricated zero.
        tally.unreadable += 1
        log.warn('session log %s could not be read: %s', sessionId, errorMessage(error))
        continue
      }
      if (sessionId === rootId) {
        title = foldTitle(snapshot.events)
        cwd = snapshot.session.cwd
      }
      mergeLedgers(models, foldSessionEvents(snapshot.events, snapshot.inheritedEventCount))
    }
    const priced = {}
    for (const [model, entry] of models) {
      if (hasUsage(entry)) priced[model] = entry
    }
    if (Object.keys(priced).length === 0) return null
    return {
      sessionId: rootId,
      title,
      workspacePath: registryFacts?.paths.get(rootId) ?? (typeof cwd === 'string' ? cwd : ''),
      archived: registryFacts?.archived.has(rootId) ?? false,
      models: priced,
    }
  }

  /** Enumerate the corpus, fold every tree, and publish the rollup. */
  const runScan = async () => {
    const query = ctx.sessionQuery
    let records
    try {
      records = await query.listSessions()
    } catch (error) {
      await writeUsage({ error: `session enumeration failed: ${errorMessage(error)}`, updatedAt: Date.now() })
      return
    }
    const registryFacts = readRegistryFacts()
    const pricedModels = readPricedModels()
    const sessionIds = new Set(records.map(record => String(record.header.id)))
    const childrenByParent = new Map()
    const originBySession = new Map()
    for (const record of records) {
      const id = String(record.header.id)
      originBySession.set(id, record.header.origin)
      const parent = record.header.parentSession
      if (parent === undefined) continue
      const parentId = String(parent)
      if (!sessionIds.has(parentId)) continue
      const siblings = childrenByParent.get(parentId)
      if (siblings === undefined) childrenByParent.set(parentId, [id])
      else siblings.push(id)
    }
    // Roots are the sessions the sidebar shows: everything but subagent
    // children, plus a subagent whose parent left the corpus — that one stays
    // visible as its own row instead of being dropped or attributed by guess.
    const roots = []
    let orphanSubagents = 0
    for (const record of records) {
      const parent = record.header.parentSession
      const orphan = record.header.origin === 'subagent'
        && (parent === undefined || !sessionIds.has(String(parent)))
      if (record.header.origin !== 'subagent' || orphan) roots.push(record)
      if (orphan) orphanSubagents += 1
    }
    const tally = { unreadable: 0 }
    const sessions = []
    await runPool(roots, config.scanConcurrency, async (record) => {
      const row = await buildSessionRow(query, record, childrenByParent, originBySession, registryFacts, tally)
      if (row !== null) sessions.push(row)
    })
    sessions.sort((left, right) => left.workspacePath.localeCompare(right.workspacePath)
      || left.sessionId.localeCompare(right.sessionId))
    const unpriced = new Set()
    for (const session of sessions) {
      for (const model of Object.keys(session.models)) {
        const separator = model.indexOf('/')
        const modelId = separator < 0 ? model : model.slice(separator + 1)
        if (pricedModels !== undefined && !pricedModels.has(model) && !pricedModels.has(modelId)) unpriced.add(model)
      }
    }
    const degraded = []
    if (tally.unreadable > 0) {
      degraded.push(`${tally.unreadable} session log(s) could not be read and are excluded from the rollup`)
    }
    if (orphanSubagents > 0) {
      degraded.push(`${orphanSubagents} subagent session(s) have no readable parent and are listed as their own rows`)
    }
    if (registryFacts === undefined) {
      degraded.push('the workspace registry is unavailable; grouping uses each session cwd and no session is marked archived')
    }
    await writeUsage({
      sessions,
      unpricedModels: [...unpriced].sort(),
      updatedAt: Date.now(),
      degraded: degraded.join('; '),
      error: '',
    })
  }

  /** Serialize scans: one runs at a time, and at most one more is queued behind it. */
  const scan = async () => {
    if (scanning) {
      rescanQueued = true
      return
    }
    scanning = true
    try {
      await runScan()
    } catch (error) {
      // Any unplanned failure keeps the previous rollup and reports itself.
      log.error('cost-analytics scan failed: %s', errorMessage(error))
      await writeUsage({ error: `scan failed: ${errorMessage(error)}`, updatedAt: Date.now() })
    } finally {
      scanning = false
      lastScanAt = Date.now()
      if (rescanQueued) {
        rescanQueued = false
        void scan()
      }
    }
  }

  ctx.effect(() => {
    costScope = ctx.settings.register(SETTINGS_NAMESPACE, costSection, {
      base: { currency: config.currency, prices: config.prices },
    })
    ctx.settings.register(USAGE_NAMESPACE, usageSection)
    // A price edit changes which models count as unpriced, so it reseeds the rollup.
    const disposeWatch = costScope.watch(() => { void scan() })
    return () => { disposeWatch() }
  }, 'cost-analytics: settings namespaces and price watch')

  ctx.effect(() => {
    const boot = setTimeout(() => { void scan() }, config.bootDelaySeconds * 1000)
    const interval = setInterval(() => { void scan() }, config.refreshIntervalMinutes * 60_000)
    /** Pending throttled rescan caused by session activity. */
    let activityTimer
    // A settled model request changes the rollup, so the composer pill can
    // track the session without waiting for the refresh interval. Rescans are
    // spaced by `activityRescanSeconds` so a busy session cannot scan the whole
    // corpus continuously.
    const onSessionEvent = (_session, event) => {
      if (config.activityRescanSeconds === 0 || activityTimer !== undefined) return
      if (event?.type !== 'assistant/message' && event?.type !== 'assistant/attempt') return
      const waitMs = Math.max(0, config.activityRescanSeconds * 1000 - (Date.now() - lastScanAt))
      activityTimer = setTimeout(() => {
        activityTimer = undefined
        void scan()
      }, waitMs)
    }
    const disposeActivity = ctx.on('session/event', onSessionEvent)
    return () => {
      clearTimeout(boot)
      clearInterval(interval)
      if (activityTimer !== undefined) clearTimeout(activityTimer)
      disposeActivity()
    }
  }, 'cost-analytics: scan schedule')
}
