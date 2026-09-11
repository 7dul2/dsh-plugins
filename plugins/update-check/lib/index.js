/**
 * Host half of the update-check plugin: registers the `update-check` settings
 * namespace (the one client↔host channel this feature uses), keeps the
 * version facts fresh, and executes the one user command the badge can issue —
 * install the target dsh version into the runtime directory with pnpm, then
 * request a restart through the launcher contract (marker file + exit 75).
 *
 * Restart contract: the managed launcher (`bin/dsh-web`) sets
 * `DSH_UPDATE_MANAGED=1` and treats an exit code of 75 (EX_TEMPFAIL) or a
 * present marker file as "restart me". Without that launcher the install
 * still runs, but the process only records the restart request.
 *
 * Every state field the browser renders lives in the settings namespace; the
 * client keeps transient UI state (registry fetch results, in-flight flags)
 * browser-local so the two sides never overwrite each other's fields.
 *
 * @module @deepseek-ai/dsh-client-ui-update-check
 */

import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import z from '@deepseek-ai/schemastery'
import { compareVersions } from './version.js'
import { summarizeInstallFailure } from './diagnostics.js'

export { summarizeInstallFailure } from './diagnostics.js'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'update-check'

/** Required services: the settings provider owns the namespace and persists writes. */
export const inject = ['settings']

/** Settings namespace owned by this plugin (lowercase/hyphen grammar). */
export const SETTINGS_NAMESPACE = 'update-check'

/** npm dist-tags endpoint; the registry answers it with `access-control-allow-origin: *`. */
const DIST_TAGS_URL = 'https://registry.npmjs.org/-/package'

/** Longest pnpm output persisted into the settings document. */
const OUTPUT_LIMIT = 4000

/** Per-request timeout for the registry dist-tags read. */
const REGISTRY_TIMEOUT_MS = 15_000

/** Channels accepted in the configuration and the settings section. */
const CHANNELS = ['latest', 'next', 'alpha']

/**
 * Deployment configuration. Defaults under `~/.dsh` match the default harness
 * home; deployments that set `DSH_HOME` elsewhere must configure these paths
 * explicitly (a config default cannot read the environment).
 *
 * @typedef {object} Config
 * @property {string} runtimeDir runtime directory the managed launcher boots dsh from; `~` expands to the home directory.
 * @property {string} restartMarkerPath file the install writes before exit 75; the launcher deletes it on restart.
 * @property {'latest' | 'next' | 'alpha'} channel dist-tag the badge and the host-side poll compare against.
 * @property {number} checkIntervalMinutes minutes between host-side registry polls (1+).
 * @property {number} installTimeoutMinutes minutes before a hanging pnpm install is killed (1+).
 * @property {string} pnpmCommand pnpm binary used for the install.
 * @property {string} packageName npm package the plugin updates.
 */

/** @type {import('@deepseek-ai/schemastery').Schema<Config>} Schemastery validation; the Loader rejects invalid entries at load. */
export const Config = z.object({
  runtimeDir: z.string().default('~/.dsh/runtime'),
  restartMarkerPath: z.string().default('~/.dsh/update-restart-requested'),
  channel: z.union([...CHANNELS]).default('latest'),
  checkIntervalMinutes: z.number().step(1).min(1).default(360),
  installTimeoutMinutes: z.number().step(1).min(1).default(10),
  pnpmCommand: z.string().default('pnpm'),
  packageName: z.string().pattern(/^@?[a-z0-9][a-z0-9._/-]*$/).default('@deepseek-ai/dsh'),
})

/**
 * Durable settings section shared with the browser half. Facts
 * (`currentVersion`, `availableVersion`, `managedLauncher`, `packageName`) are
 * written only by the host; `command` is written only by the client;
 * `processedNonce` is host bookkeeping that makes one command idempotent.
 */
const SectionSchema = z.object({
  channel: z.union([...CHANNELS]).default('latest'),
  clientCheckMinutes: z.number().step(1).min(1).default(30),
  packageName: z.string().default(''),
  currentVersion: z.string().default(''),
  availableVersion: z.string().default(''),
  managedLauncher: z.boolean().default(false),
  command: z.string().default(''),
  processedNonce: z.string().default(''),
  installState: z.union(['idle', 'installing', 'restarting', 'error']).default('idle'),
  installTargetVersion: z.string().default(''),
  installError: z.string().default(''),
  installOutput: z.string().default(''),
})

/**
 * Expand a leading `~` to the home directory.
 * @param value - configured filesystem path.
 * @returns the absolute path.
 */
function expandHome(value) {
  if (value === '~') return homedir()
  if (value.startsWith('~/')) return path.join(homedir(), value.slice(2))
  return value
}

/**
 * Resolve the running dsh version from its own package manifest.
 * @returns the manifest `version`.
 * @throws when `@deepseek-ai/dsh` is not resolvable from this module or carries no version.
 */
function readOwnVersion() {
  const require = createRequire(import.meta.url)
  let manifestPath
  try {
    manifestPath = require.resolve('@deepseek-ai/dsh/package.json')
  } catch {
    // dsh ships no exports map today, so the direct subpath resolves; if a
    // future version hides it, fall back to the main entry's owning manifest.
    manifestPath = path.join(path.dirname(require.resolve('@deepseek-ai/dsh')), '..', 'package.json')
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  if (typeof manifest.version !== 'string' || manifest.version === '') {
    throw new Error(`update-check: ${manifestPath} has no version field`)
  }
  return manifest.version
}

/**
 * Read the current npm dist-tags for one package.
 * @param packageName - npm package name.
 * @returns the dist-tags object, or `undefined` on any fetch or body failure.
 */
async function readDistTags(packageName) {
  try {
    const response = await fetch(`${DIST_TAGS_URL}/${packageName}/dist-tags`, { signal: AbortSignal.timeout(REGISTRY_TIMEOUT_MS) })
    if (!response.ok) return undefined
    const body = await response.json()
    return typeof body === 'object' && body !== null ? body : undefined
  } catch {
    // Offline or registry unreachable: the last known facts keep serving and
    // the next poll retries, so a transient miss must not fail the plugin.
    return undefined
  }
}

/**
 * Parse a `command` field value.
 * @param command - `${nonce}|${targetVersion}` as written by the client.
 * @returns the parts, or `undefined` when the field is empty or malformed.
 */
function parseCommand(command) {
  if (typeof command !== 'string' || command === '') return undefined
  const separator = command.indexOf('|')
  if (separator <= 0 || separator === command.length - 1) return undefined
  return { nonce: command.slice(0, separator), version: command.slice(separator + 1) }
}

/** Version form accepted as an install target; also the spawn-argument safety net. */
const TARGET_PATTERN = /^v?\d+\.\d+\.\d+(?:-[A-Za-z0-9]+(?:\.\d+)?)?$/

/**
 * Host plugin body.
 * @param ctx - Host context.
 * @param config - validated composition entry config.
 */
export function apply(ctx, config) {
  const log = ctx.logger('update-check')
  const ownVersion = readOwnVersion()
  const runtimeDir = expandHome(config.runtimeDir)
  const markerPath = expandHome(config.restartMarkerPath)
  const managedLauncher = process.env.DSH_UPDATE_MANAGED === '1'

  /** Resolved namespace section; kept current by the watch below. */
  let section
  /** Set while one install runs; the watch serializes callbacks, this guards re-entry after re-reads. */
  let installing = false

  /**
   * Merge one patch into the namespace user layer; failures are contained
   * because a read-only provider must not kill the process mid-update.
   * @param patch - fields to merge.
   * @returns whether any field actually moved.
   */
  const writeSection = async (patch) => {
    try {
      await ctx.settings.update(SETTINGS_NAMESPACE, patch)
      return true
    } catch (error) {
      log.error('failed to persist update-check state: %s', error instanceof Error ? error.message : String(error))
      return false
    }
  }

  /**
   * Write one fact only when it moved, so polls do not churn the document.
   * @param patch - candidate fact fields.
   * @returns whether any field moved.
   */
  const writeFacts = async (patch) => {
    const changed = Object.entries(patch).some(([key, value]) => section === undefined || section[key] !== value)
    if (!changed) return false
    return writeSection(patch)
  }

  /**
   * Poll the registry and refresh `availableVersion` for the active channel.
   * Unparsable or missing tags keep the previous fact.
   */
  const checkRegistry = async () => {
    const channel = section?.channel ?? config.channel
    const tags = await readDistTags(config.packageName)
    if (tags === undefined) return
    const tagged = tags[channel] ?? tags.latest
    if (typeof tagged !== 'string' || tagged === '') {
      log.warn('registry dist-tags for %s carry no %s tag: %j', config.packageName, channel, tags)
      return
    }
    const staleFailure = section?.installState === 'error'
      ? { installState: 'idle', installError: '', installOutput: '' }
      : {}
    const changed = await writeFacts({ availableVersion: tagged, ...staleFailure })
    if (changed && compareVersions(tagged, ownVersion) > 0) {
      log.info('update available: %s (running %s)', tagged, ownVersion)
    }
  }

  /**
   * Run one pnpm install into the runtime directory.
   * @param targetVersion - validated dsh version to install.
   * @returns `ok: true`, or the failure message plus captured output.
   */
  const runInstall = (targetVersion) => new Promise((resolve) => {
    let output = ''
    let timedOut = false
    const collect = (chunk) => {
      output = (output + chunk.toString()).slice(-OUTPUT_LIMIT)
    }
    const child = spawn(
      config.pnpmCommand,
      ['add', `${config.packageName}@${targetVersion}`, '--dir', runtimeDir],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    )
    const timeout = setTimeout(() => {
      timedOut = true
      child.kill('SIGTERM')
    }, config.installTimeoutMinutes * 60_000)
    child.stdout.on('data', collect)
    child.stderr.on('data', collect)
    child.on('error', (error) => {
      clearTimeout(timeout)
      resolve({ ok: false, message: `failed to start ${config.pnpmCommand}: ${error.message}`, output })
    })
    child.on('close', (code) => {
      clearTimeout(timeout)
      if (timedOut) {
        resolve({ ok: false, message: `install exceeded ${config.installTimeoutMinutes} min and was killed`, output })
        return
      }
      resolve(code === 0
        ? { ok: true }
        : {
          ok: false,
          message: `${config.pnpmCommand} exited with code ${String(code)}${summarizeInstallFailure(output) === '' ? '' : `: ${summarizeInstallFailure(output)}`}`,
          output,
        })
    })
  })

  /**
   * Execute one install command: mark it processed first (a crash mid-install
   * then stays recoverable through a fresh click instead of replaying), run
   * pnpm, and on success write the restart marker and exit 75 for the launcher.
   * @param nonce - command id from the client.
   * @param targetVersion - requested version.
   */
  const processCommand = async (nonce, targetVersion) => {
    installing = true
    try {
      if (!TARGET_PATTERN.test(targetVersion)) {
        await writeSection({
          processedNonce: nonce,
          installState: 'error',
          installError: `refusing to install unparsable target version ${JSON.stringify(targetVersion)}`,
        })
        return
      }
      await writeSection({
        processedNonce: nonce,
        installState: 'installing',
        installTargetVersion: targetVersion,
        installError: '',
        installOutput: '',
      })
      log.info('installing %s@%s into %s', config.packageName, targetVersion, runtimeDir)
      const outcome = await runInstall(targetVersion)
      if (!outcome.ok) {
        await writeSection({ installState: 'error', installError: outcome.message, installOutput: outcome.output })
        return
      }
      try {
        mkdirSync(path.dirname(markerPath), { recursive: true })
        writeFileSync(markerPath, `${targetVersion}\n`)
      } catch (error) {
        await writeSection({
          installState: 'error',
          installError: `install succeeded but the restart marker could not be written: ${error instanceof Error ? error.message : String(error)}`,
        })
        return
      }
      if (managedLauncher) {
        await writeSection({ installState: 'restarting' })
        log.info('update installed; requesting managed launcher restart (exit 75)')
        process.exit(75)
      }
      await writeSection({ installState: 'idle', installError: '更新完成，请手动重启 Harness 以使用新版本。' })
      log.info('update installed; managed launcher not present, manual restart required')
    } finally {
      installing = false
    }
  }

  /**
   * Reaction to every committed section change: the watch serializes its own
   * invocations, and `processedNonce` makes replays no-ops.
   */
  const onSectionChanged = async () => {
    const command = parseCommand(section?.command)
    if (command === undefined || command.nonce === section?.processedNonce || installing) return
    await processCommand(command.nonce, command.version)
  }

  /**
   * Reconcile persisted state at startup: run a command the previous process
   * died before seeing, and clear transient install states the restart made
   * stale (`restarting` is the normal post-update boot; `installing` means
   * the process died mid-install).
   */
  const reconcileAtBoot = async () => {
    if (section === undefined) return
    const command = parseCommand(section.command)
    if (command !== undefined && command.nonce !== section.processedNonce) {
      await processCommand(command.nonce, command.version)
      return
    }
    if (section.installState === 'restarting') {
      await writeSection({ installState: 'idle' })
    } else if (section.installState === 'installing') {
      await writeSection({ installState: 'error', installError: 'the process restarted during the install; run the update again' })
    }
  }

  ctx.effect(() => {
    const scope = ctx.settings.register(SETTINGS_NAMESPACE, SectionSchema, {
      base: { channel: config.channel },
    })
    section = scope.get()
    const disposeWatch = scope.watch((next) => {
      section = next
      return onSectionChanged()
    })
    return () => { disposeWatch() }
  }, 'update-check: settings namespace')

  ctx.effect(() => {
    void reconcileAtBoot()
    void writeFacts({
      packageName: config.packageName,
      currentVersion: ownVersion,
      managedLauncher,
    })
    void checkRegistry()
    const timer = setInterval(() => { void checkRegistry() }, config.checkIntervalMinutes * 60_000)
    return () => { clearInterval(timer) }
  }, 'update-check: version facts and registry poll')
}
