/**
 * Host half of the plugin-manager plugin: keeps a "my plugins" snapshot in the
 * `plugin-manager` settings namespace (the one client↔host channel this
 * feature uses) and executes the user commands the Web tab can issue.
 *
 * The snapshot combines three sources:
 * - the profile's user patch layer (`cordis.patch.yml`): every `insert` row is
 *   a plugin the user mounted themselves;
 * - the configured source directories: first-level folders whose package.json
 *   carries a `dsh` manifest field are local plugin projects, mounted or not;
 * - the running Cordis Loader: entry id/name correlation adds effective
 *   enablement and the root-fiber phase.
 *
 * Commands (client writes `${nonce}|${verb}|${arg}` on the same namespace):
 * - `refresh`  rebuild the snapshot
 * - `toggle`   disable a mounted plugin by appending a disable patch entry, or
 *              re-enable it by removing the block this plugin wrote before;
 *              the profile's live patch watcher re-applies the layer in place
 * - `open`     reveal one snapshot row's folder in the OS file manager
 * - `install`  `pnpm add` one discovered folder into the profile, then append
 *              an `insert` patch entry so the next patch reload mounts it
 *
 * Every patch-file mutation is validated by parsing the candidate text with
 * the same YAML grammar the loader uses before an atomic rename, because a
 * malformed user patch layer fails the live reload loudly.
 *
 * @module @deepseek-ai/dsh-client-ui-plugin-manager
 */

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import z from '@deepseek-ai/schemastery'
import { parse as parseYaml } from 'yaml'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'plugin-manager'

/** Required services: settings owns the namespace; loader correlates runtime state. */
export const inject = ['settings', 'loader']

/** Settings namespace owned by this plugin (lowercase/hyphen grammar). */
export const SETTINGS_NAMESPACE = 'plugin-manager'

/** Longest pnpm output kept in a command result. */
const OUTPUT_LIMIT = 4000

/** Delay before the post-command snapshot refresh that observes a patch reload. */
const RELOAD_OBSERVE_MS = 3000

/** Verbs accepted on the command channel. */
const VERBS = ['refresh', 'toggle', 'open', 'install']

/**
 * Deployment configuration. Defaults match the stock dsh home and this
 * workspace layout; deployments elsewhere configure these paths explicitly
 * (a config default cannot read the environment).
 *
 * @typedef {object} Config
 * @property {string} profileDir profile directory holding `cordis.patch.yml`, `package.json`, and `node_modules`; `~` expands to the home directory.
 * @property {string[]} pluginSourceDirs directories whose first-level folders are scanned for local plugin projects (`package.json` with a `dsh` field).
 * @property {string} openCommand file-manager command; empty picks the platform default.
 * @property {string} pnpmCommand pnpm binary used for installs.
 * @property {number} installTimeoutMinutes minutes before a hanging pnpm install is killed (1+).
 */

/** @type {import('@deepseek-ai/schemastery').Schema<Config>} Schemastery validation; the Loader rejects invalid entries at load. */
export const Config = z.object({
  profileDir: z.string().default('~/.dsh/profiles/web'),
  pluginSourceDirs: z.array(z.string()).default([]),
  openCommand: z.string().default(''),
  pnpmCommand: z.string().default('pnpm'),
  installTimeoutMinutes: z.number().step(1).min(1).default(10),
})

/**
 * Durable settings section shared with the browser half. The snapshot JSON is
 * written only by the host; `command` is written only by the client;
 * `processedNonce` is host bookkeeping that makes one command idempotent.
 */
const SectionSchema = z.object({
  listJson: z.string().default(''),
  command: z.string().default(''),
  processedNonce: z.string().default(''),
  busy: z.boolean().default(false),
  lastError: z.string().default(''),
  lastNotice: z.string().default(''),
})

/** One row of the snapshot the browser tab renders. @typedef {{ key: string, id: string, packageName: string, version: string, description: string, displayName: string, displayDescription: string, path: string, mounted: boolean, installed: boolean, disabled: boolean, fiberPhase: string | null, canToggle: boolean, canOpen: boolean, canInstall: boolean }} PluginRow */

/** One user patch-layer insert row. @typedef {{ id: string, name: string }} InsertRow */

/** Node id grammar shared by the loader; ids outside it are never written. */
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

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
 * Read one JSON file, reporting absence and parse failure as `undefined`.
 * @param file - absolute path.
 * @returns the parsed body, or `undefined` when absent or unparsable.
 */
function readJsonSafe(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return undefined
  }
}

/**
 * Whether the resolved module specifier of one insert row is a bare package
 * name (as opposed to a relative or absolute file reference).
 * @param moduleName - the row's `name`.
 * @returns whether it names a package.
 */
function isBareSpecifier(moduleName) {
  return !(moduleName.startsWith('./') || moduleName.startsWith('../') || path.isAbsolute(moduleName) || moduleName.startsWith('file:'))
}

/**
 * Resolve one insert row's `name` to an on-disk path under the profile.
 * @param moduleName - the row's `name`.
 * @param profileDir - absolute profile directory.
 * @returns the absolute path, or '' when it cannot be resolved.
 */
function resolveModulePath(moduleName, profileDir) {
  if (moduleName.startsWith('file:')) {
    try {
      return fileURLToPath(moduleName)
    } catch {
      return ''
    }
  }
  if (path.isAbsolute(moduleName)) return moduleName
  if (moduleName.startsWith('./') || moduleName.startsWith('../')) return path.resolve(profileDir, moduleName)
  return path.join(profileDir, 'node_modules', moduleName)
}

/**
 * Short display name for one row: insert id, else the package's short name,
 * else the path's basename.
 * @param row - candidate row fields.
 * @returns the display title.
 */
function rowTitle(row) {
  if (row.id !== '') return row.id
  const packageName = row.packageName
  if (packageName !== '') {
    const unscoped = packageName.startsWith('@') ? packageName.slice(packageName.indexOf('/') + 1) : packageName
    const withoutPrefix = unscoped.startsWith('dsh-client-') ? unscoped.slice('dsh-client-'.length) : unscoped.startsWith('dsh-') ? unscoped.slice(4) : unscoped
    return withoutPrefix
  }
  return path.basename(row.path)
}

/**
 * Derive the insert id convention expects of a package name:
 * `@deepseek-ai/dsh-client-ui-update-check` → `ui-update-check`,
 * `@deepseek-ai/dsh-foo` → `foo`; anything else keeps its basename.
 * @param packageName - npm package name.
 * @returns the derived insert id.
 */
export function deriveInsertId(packageName) {
  const unscoped = packageName.startsWith('@') ? packageName.slice(packageName.indexOf('/') + 1) : packageName
  const withoutPrefix = unscoped.startsWith('dsh-client-') ? unscoped.slice('dsh-client-'.length) : unscoped.startsWith('dsh-') ? unscoped.slice(4) : unscoped
  const candidate = withoutPrefix.replaceAll('/', '-')
  return ID_PATTERN.test(candidate) ? candidate : ''
}

//#region patch-file text surgery -------------------------------------------------

/**
 * Parse a patch-layer document, rejecting anything the loader would reject.
 * @param text - file content.
 * @param sourceLabel - human-readable file identity for error messages.
 * @returns the parsed top-level patch entry array.
 */
function parsePatchDocument(text, sourceLabel) {
  let body
  try {
    body = parseYaml(text)
  } catch (error) {
    throw new Error(`${sourceLabel} is not valid YAML: ${error instanceof Error ? error.message : String(error)}`)
  }
  if (!Array.isArray(body)) throw new Error(`${sourceLabel} must be a top-level YAML array of patch entries`)
  return body
}

/**
 * Whether the document already carries a disable patch entry for one id.
 * @param text - file content.
 * @param id - loader entry id.
 * @returns whether any entry disables that id.
 */
export function patchHasDisable(text, id) {
  return parsePatchDocument(text, 'patch layer')
  .some(entry => entry !== null && typeof entry === 'object' && entry.id === id && entry.disabled === true)
}

/**
 * The exact block this plugin appends when disabling one id. Keeping the
 * writer-recognized shape makes the enable path a precise text removal that
 * never touches the user's own lines.
 * @param id - loader entry id.
 * @returns the block, newline-terminated.
 */
function disableBlock(id) {
  return `# plugin-manager: disabled ${id} (toggle back on in Settings → Plugins → My plugins)\n- id: ${id}\n  disabled: true\n`
}

/**
 * Remove the disable block this plugin wrote for one id, if present.
 * @param text - file content.
 * @param id - loader entry id.
 * @returns the content without that block.
 */
export function removeDisableBlock(text, id) {
  const escaped = id.replaceAll('$', '\\$')
  const pattern = new RegExp(`(?:^# plugin-manager: disabled ${escaped} \\(toggle back on in Settings → Plugins → My plugins\\)\\n)?^- id: ${escaped}\\n  disabled: true\\n?`, 'm')
  return text.replace(pattern, '')
}

/**
 * Compose the patched text for one toggle, validating the candidate with the
 * loader's YAML grammar before it leaves this function.
 * @param text - current file content.
 * @param id - loader entry id.
 * @param enable - true to re-enable (remove this plugin's disable block), false to disable (append one).
 * @returns the new file content.
 */
export function togglePatchText(text, id, enable) {
  if (!ID_PATTERN.test(id)) throw new Error(`refusing to toggle non-conforming entry id ${JSON.stringify(id)}`)
  const next = enable ? removeDisableBlock(text, id) : `${text.endsWith('\n') || text === '' ? text : `${text}\n`}${disableBlock(id)}`
  parsePatchDocument(next, 'candidate patch layer')
  if (enable === patchHasDisable(next, id)) {
    throw new Error(`toggle of ${id} did not reach the intended state; edit the patch file by hand`)
  }
  return next
}

/**
 * Compose the patched text that appends one `insert` patch entry. A separate
 * top-level entry keeps the user's existing list and its comments verbatim;
 * the loader applies every entry in order.
 * @param text - current file content.
 * @param id - insert id for the new row.
 * @param packageName - module specifier the row mounts.
 * @returns the new file content.
 */
export function appendInsertRow(text, id, packageName) {
  if (!ID_PATTERN.test(id)) throw new Error(`refusing to insert non-conforming entry id ${JSON.stringify(id)}`)
  const next = `${text.endsWith('\n') || text === '' ? text : `${text}\n`}# plugin-manager: mounted ${packageName} (Settings → Plugins → My plugins)\n- insert:\n    - id: ${id}\n      name: '${packageName}'\n`
  parsePatchDocument(next, 'candidate patch layer')
  return next
}

/**
 * The insert rows of one parsed patch document, in document order.
 * @param text - file content.
 * @returns id/name pairs for every `insert` row that names one.
 */
export function readInsertRows(text) {
  const rows = []
  for (const entry of parsePatchDocument(text, 'patch layer')) {
    if (entry === null || typeof entry !== 'object' || !Array.isArray(entry.insert)) continue
    for (const row of entry.insert) {
      if (row !== null && typeof row === 'object' && typeof row.name === 'string' && row.name !== '') {
        rows.push({ id: typeof row.id === 'string' ? row.id : '', name: row.name })
      }
    }
  }
  return rows
}

//#endregion

//#region commands ----------------------------------------------------------------

/**
 * Parse a `command` field value.
 * @param command - `${nonce}|${verb}|${arg}` as written by the client.
 * @returns the parts, or `undefined` when the field is empty or malformed.
 */
export function parseCommandSpec(command) {
  if (typeof command !== 'string' || command === '') return undefined
  const first = command.indexOf('|')
  if (first <= 0) return undefined
  const nonce = command.slice(0, first)
  const rest = command.slice(first + 1)
  const second = rest.indexOf('|')
  if (second < 0) return undefined
  const verb = rest.slice(0, second)
  const arg = rest.slice(second + 1)
  if (!VERBS.includes(verb)) return undefined
  if (verb !== 'refresh' && arg === '') return undefined
  return { nonce, verb, arg }
}

//#endregion

/**
 * Host plugin body.
 * @param ctx - Host context.
 * @param config - validated composition entry config.
 */
export function apply(ctx, config) {
  const log = ctx.logger('plugin-manager')
  const profileDir = expandHome(config.profileDir)
  const patchFile = path.join(profileDir, 'cordis.patch.yml')
  const profileManifestFile = path.join(profileDir, 'package.json')
  const sourceDirs = config.pluginSourceDirs.map(expandHome)
  /** Platform default file-manager command; empty string defers to `openCommand`. */
  const platformOpen = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open'

  /** Resolved namespace section; kept current by the watch below. */
  let section
  /** Set while one command runs; the watch serializes callbacks, this guards re-entry after re-reads. */
  let processing = false
  /** Snapshot rows from the last build; `open`/`install` args must name one of these paths. */
  let knownPaths = new Set()
  /** Pending post-command re-observe timer. */
  let observeTimer

  /**
   * Merge one patch into the namespace user layer; failures are contained
   * because a broken write must not kill the process.
   * @param patch - fields to merge.
   * @returns whether the write succeeded.
   */
  const writeSection = async (patch) => {
    try {
      await ctx.settings.update(SETTINGS_NAMESPACE, patch)
      return true
    } catch (error) {
      log.error('failed to persist plugin-manager state: %s', error instanceof Error ? error.message : String(error))
      return false
    }
  }

  /**
   * Read the patch layer text, reporting absence as empty.
   * @returns the file content, or '' when the file does not exist yet.
   */
  const readPatchText = () => {
    try {
      return readFileSync(patchFile, 'utf8')
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException | null} */(error)?.code === 'ENOENT') return ''
      throw error
    }
  }

  /**
   * Atomically publish new patch-file text: a same-directory temporary file
   * plus rename, so the live watcher never reads a partial write.
   * @param text - new file content.
   */
  const writePatchText = (text) => {
    mkdirSync(profileDir, { recursive: true })
    const tempFile = `${patchFile}.plugin-manager-${process.pid}.tmp`
    writeFileSync(tempFile, text, 'utf8')
    renameSync(tempFile, patchFile)
  }

  /**
   * Packages the profile manifest already depends on.
   * @returns the dependency names of the profile `package.json`.
   */
  const installedPackageNames = () => {
    const manifest = readJsonSafe(profileManifestFile)
    const dependencies = manifest !== undefined && typeof manifest === 'object' ? manifest.dependencies : undefined
    return dependencies !== null && typeof dependencies === 'object' ? new Set(Object.keys(dependencies)) : new Set()
  }

  /**
   * First-level folders of one source directory that look like local plugin
   * projects: a readable `package.json` carrying a `dsh` manifest field.
   * @param dir - absolute source directory.
   * @returns absolute plugin project folders.
   */
  const discoverProjectFolders = (dir) => {
    let names
    try {
      names = readdirNames(dir)
    } catch (error) {
      // A configured source directory may not exist on a given machine; the
      // remaining directories still contribute rows.
      log.warn('source directory %s is unreadable: %s', dir, error instanceof Error ? error.message : String(error))
      return []
    }
    const folders = []
    for (const entry of names) {
      if (entry === 'node_modules' || entry === '.git') continue
      const folder = path.join(dir, entry)
      const manifest = readJsonSafe(path.join(folder, 'package.json'))
      if (manifest !== undefined && typeof manifest === 'object' && manifest.dsh !== undefined && typeof manifest.name === 'string') {
        folders.push(folder)
      }
    }
    return folders
  }

  /**
   * Names of a directory's first-level entries.
   * @param dir - absolute directory.
   * @returns entry names.
   */
  function readdirNames(dir) {
    return readdirSync(dir)
  }

  /**
   * Effective root-fiber phase of one row, correlated against the running
   * Loader by insert id first and module specifier second.
   * @param id - insert id ('' when absent).
   * @param moduleName - module specifier ('' when absent).
   * @returns the fiber phase, or null when no entry matches.
   */
  const fiberPhaseOf = (id, moduleName) => {
    let entries
    try {
      entries = ctx.loader.entries()
    } catch {
      return null
    }
    for (const entry of entries) {
      if (entry.options?.group === true) continue
      const matches = (id !== '' && entry.id === id) || (moduleName !== '' && entry.options?.name === moduleName)
      if (!matches) continue
      const state = entry.fiber?.state
      return FIBER_PHASE[/** @type {keyof typeof FIBER_PHASE} */(state)] ?? null
    }
    return null
  }

  /** Runtime mirror of Cordis FiberState, read defensively for unknown numbers. */
  const FIBER_PHASE = {
    0: 'pending',
    1: 'loading',
    2: 'active',
    3: 'failed',
    4: null,
    5: 'unloading',
  }

  /**
   * Author-owned display metadata from one plugin manifest: the package
   * author's localized name and description, shown verbatim ahead of the
   * npm-facing fields.
   * @param manifest - parsed `package.json` body, or undefined.
   * @returns display name/description pair, each '' when absent.
   */
  function displayMeta(manifest) {
    const declared = manifest !== undefined && typeof manifest === 'object' ? manifest.dsh?.client : undefined
    return {
      displayName: typeof declared?.displayName === 'string' ? declared.displayName : '',
      displayDescription: typeof declared?.displayDescription === 'string' ? declared.displayDescription : '',
    }
  }

  /**
   * Build the full snapshot from the patch layer, the source directories, and
   * the running Loader.
   * @returns snapshot rows in stable order: mounted rows first.
   */
  const buildRows = () => {
    /** @type {PluginRow[]} */
    const rows = []
    const rowByPath = new Map()
    const installed = installedPackageNames()
    let patchText
    let insertRows = []
    let disabledIds = new Set()
    try {
      patchText = readPatchText()
      insertRows = patchText === '' ? [] : readInsertRows(patchText)
      disabledIds = patchText === '' ? new Set() : new Set(
        parseYaml(patchText)
        .filter(entry => entry !== null && typeof entry === 'object' && entry.disabled === true && typeof entry.id === 'string')
        .map(entry => entry.id),
      )
    } catch (error) {
      // A patch file the loader would reject must not blank the tab; the
      // command path surfaces the same message when the user acts.
      log.warn('patch layer unreadable: %s', error instanceof Error ? error.message : String(error))
    }
    for (const insert of insertRows) {
      const isPackage = isBareSpecifier(insert.name)
      const resolved = resolveModulePath(insert.name, profileDir)
      const manifest = isPackage ? readJsonSafe(path.join(resolved, 'package.json')) : undefined
      const disabled = (insert.id !== '' && disabledIds.has(insert.id))
      const meta = displayMeta(manifest)
      /** @type {PluginRow} */
      const row = {
        key: `mounted:${insert.id || insert.name}`,
        id: insert.id,
        packageName: isPackage ? insert.name : '',
        version: typeof manifest?.version === 'string' ? manifest.version : '',
        description: typeof manifest?.description === 'string' ? manifest.description : '',
        displayName: meta.displayName,
        displayDescription: meta.displayDescription,
        path: resolved,
        mounted: true,
        installed: isPackage ? installed.has(insert.name) : existsSync(resolved),
        disabled,
        fiberPhase: disabled ? null : fiberPhaseOf(insert.id, insert.name),
        canToggle: insert.id !== '' && ID_PATTERN.test(insert.id),
        canOpen: existsSync(resolved),
        canInstall: false,
      }
      row.title = rowTitle(row)
      rows.push(row)
      if (row.path !== '') rowByPath.set(row.path, row)
    }
    for (const sourceDir of sourceDirs) {
      for (const folder of discoverProjectFolders(sourceDir)) {
        const manifest = readJsonSafe(path.join(folder, 'package.json'))
        const packageName = typeof manifest?.name === 'string' ? manifest.name : ''
        const mountedRow = rowByPath.get(realpathSafe(folder))
        ?? rows.find(row => row.packageName !== '' && row.packageName === packageName)
        if (mountedRow !== undefined) {
          // The discovered project is the same plugin as a mounted row: the
          // project folder is the friendlier path to open, so prefer it.
          if (existsSync(folder)) mountedRow.path = folder
          continue
        }
        /** @type {PluginRow} */
        const row = {
          key: `discovered:${folder}`,
          id: '',
          packageName,
          version: typeof manifest?.version === 'string' ? manifest.version : '',
          description: typeof manifest?.description === 'string' ? manifest.description : '',
          displayName: displayMeta(manifest).displayName,
          displayDescription: displayMeta(manifest).displayDescription,
          path: folder,
          mounted: false,
          installed: installed.has(packageName),
          disabled: false,
          fiberPhase: null,
          canToggle: false,
          canOpen: existsSync(folder),
          canInstall: !installed.has(packageName) && deriveInsertId(packageName) !== '',
        }
        row.title = rowTitle(row)
        rows.push(row)
        if (row.path !== '') rowByPath.set(row.path, row)
      }
    }
    return rows
  }

  /**
   * Real path of one folder, or the folder itself when the link target is
   * unreadable.
   * @param folder - absolute folder path.
   * @returns the real path.
   */
  function realpathSafe(folder) {
    try {
      return realpathSync(folder)
    } catch {
      return folder
    }
  }

  /**
   * Rebuild the snapshot and publish it; clears the transient result fields
   * when `resetResult` says the build follows a completed command.
   * @param resetResult - whether to clear `lastError`/`lastNotice`.
   */
  const publishSnapshot = async (resetResult = false) => {
    const rows = buildRows()
    knownPaths = new Set(rows.map(row => row.path).filter(pathValue => pathValue !== ''))
    await writeSection({
      listJson: JSON.stringify(rows),
      ...(resetResult ? { lastError: '', lastNotice: '' } : {}),
    })
  }

  /**
   * Run one pnpm install of a local folder into the profile.
   * @param folder - absolute plugin project folder.
   * @returns `ok: true`, or the failure message plus captured output.
   */
  const runInstall = (folder) => new Promise((resolve) => {
    let output = ''
    let timedOut = false
    const collect = (chunk) => {
      output = (output + chunk.toString()).slice(-OUTPUT_LIMIT)
    }
    const child = spawn(
      config.pnpmCommand,
      ['add', folder, '--dir', profileDir],
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
        : { ok: false, message: `${config.pnpmCommand} exited with code ${String(code)}`, output })
    })
  })

  /**
   * Open one folder in the OS file manager.
   * @param folder - absolute folder path.
   * @returns `ok: true`, or the failure message.
   */
  const runOpen = (folder) => new Promise((resolve) => {
    const command = config.openCommand !== '' ? config.openCommand : platformOpen
    const child = spawn(command, [folder], { stdio: 'ignore' })
    child.on('error', (error) => {
      resolve({ ok: false, message: `failed to start ${command}: ${error.message}` })
    })
    child.on('close', (code) => {
      resolve(code === 0 ? { ok: true } : { ok: false, message: `${command} exited with code ${String(code)}` })
    })
  })

  /**
   * Execute one command. `processedNonce` is recorded first, so a crash
   * mid-command stays recoverable through a fresh click instead of replaying.
   * @param spec - parsed command.
   * @returns the user-facing result notice, or an error to persist.
   */
  const processCommand = async (spec) => {
    const { verb, arg } = spec
    if (verb === 'refresh') return { notice: '' }
    if (verb === 'toggle') {
      const text = readPatchText()
      const enable = patchHasDisable(text, arg)
      writePatchText(togglePatchText(text, arg, enable))
      return { notice: enable ? `已重新启用 ${arg}，补丁层热重载中` : `已禁用 ${arg}，补丁层热重载中` }
    }
    if (!knownPaths.has(arg)) {
      throw new Error('the request does not name a path in the current plugin list')
    }
    if (verb === 'open') {
      const outcome = await runOpen(arg)
      if (!outcome.ok) throw new Error(outcome.message)
      return { notice: '' }
    }
    // verb === 'install'
    const manifest = readJsonSafe(path.join(arg, 'package.json'))
    const packageName = typeof manifest?.name === 'string' ? manifest.name : ''
    const insertId = deriveInsertId(packageName)
    if (packageName === '' || insertId === '') throw new Error(`${arg} has no usable plugin package name`)
    const outcome = await runInstall(arg)
    if (!outcome.ok) throw new Error(`${outcome.message}${outcome.output === '' ? '' : `\n${outcome.output}`}`)
    writePatchText(appendInsertRow(readPatchText(), insertId, packageName))
    return { notice: `已安装并挂载 ${packageName}，补丁层热重载中` }
  }

  /**
   * Reaction to every committed section change: the watch serializes its own
   * invocations, and `processedNonce` makes replays no-ops.
   */
  const onSectionChanged = async () => {
    const spec = parseCommandSpec(section?.command)
    if (spec === undefined || spec.nonce === section?.processedNonce || processing) return
    processing = true
    try {
      await writeSection({ processedNonce: spec.nonce, busy: true, lastError: '', lastNotice: '' })
      try {
        const { notice } = await processCommand(spec)
        await publishSnapshot(true)
        if (notice !== '') await writeSection({ busy: false, lastNotice: notice })
        else await writeSection({ busy: false })
        // A patch mutation reloads the layer asynchronously; observe the new
        // runtime state once the reload has had a moment to land.
        clearTimeout(observeTimer)
        observeTimer = setTimeout(() => { void publishSnapshot() }, RELOAD_OBSERVE_MS)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        log.warn('command %s failed: %s', spec.verb, message)
        await writeSection({ busy: false, lastError: message })
      }
    } finally {
      processing = false
    }
  }

  ctx.effect(() => {
    const scope = ctx.settings.register(SETTINGS_NAMESPACE, SectionSchema, {})
    section = scope.get()
    const disposeWatch = scope.watch((next) => {
      section = next
      return onSectionChanged()
    })
    return () => {
      disposeWatch()
      clearTimeout(observeTimer)
    }
  }, 'plugin-manager: settings namespace')

  ctx.effect(() => {
    void publishSnapshot()
    // Fiber phases observed at boot read as `loading` while the composition
    // is still starting; one delayed re-observe publishes the settled state.
    observeTimer = setTimeout(() => { void publishSnapshot() }, RELOAD_OBSERVE_MS)
    return () => { clearTimeout(observeTimer) }
  }, 'plugin-manager: initial snapshot')
}
