#!/usr/bin/env node
import { readFile, writeFile, rename, unlink, open } from 'node:fs/promises'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import YAML from 'yaml'

export const plugins = ['favicon', 'model-retry', 'plugin-dev', 'plugin-manager', 'archived-chats', 'cost-analytics', 'update-check']
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Preserve existing YAML and refuse collisions instead of replacing user config. */
export function appendMounts(original, mounts) {
  const rows = YAML.parse(original) ?? []
  if (!Array.isArray(rows)) throw new Error('Profile patch must be a YAML array')
  const existing = rows.flatMap(row => row?.insert ?? [])
  const additions = mounts.filter(mount => {
    const matches = existing.filter(row => row.id === mount.id || row.name === mount.name)
    if (matches.length === 0) return true
    if (matches.length !== 1 || matches[0].id !== mount.id || matches[0].name !== mount.name) throw new Error(`Conflicting mount: ${mount.id}`)
    return false
  })
  if (!additions.length) return original
  const text = original.trimEnd() + '\n\n' + YAML.stringify([{ insert: additions }])
  YAML.parse(text)
  return text
}

/** Migrate the original single-file favicon mount without rewriting user comments. */
export function migrateLegacyFaviconMount(original, mounts) {
  if (!mounts.some(mount => mount.id === 'custom-favicon')) return original
  const rows = YAML.parse(original) ?? []
  if (!Array.isArray(rows)) throw new Error('Profile patch must be a YAML array')
  const legacy = rows.flatMap(row => row?.insert ?? []).filter(row => row?.id === 'custom-favicon' && row?.name === './favicon-plugin.mjs')
  if (legacy.length === 0) return original
  if (legacy.length > 1) throw new Error('Conflicting legacy custom-favicon mounts')
  const matches = [...original.matchAll(/^(\s*name:\s*)\.\/favicon-plugin\.mjs\s*$/gm)]
  if (matches.length !== 1) throw new Error('Could not safely migrate the legacy custom-favicon mount')
  const match = matches[0]
  const packageName = mounts.find(mount => mount.id === 'custom-favicon').name
  return original.slice(0, match.index) + `${match[1]}${JSON.stringify(packageName)}` + original.slice(match.index + match[0].length)
}

async function main(args) {
  if (!args.length || args.includes('--help')) {
    console.log('node scripts/install.mjs <plugin-name|all> [--profile /absolute/profile/path]\nPlugins: ' + plugins.join(', '))
    return
  }
  const [name, ...options] = args
  if (options.length && (options.length !== 2 || options[0] !== '--profile')) throw new Error('Use --profile <path>')
  const selected = name === 'all' ? plugins : plugins.includes(name) ? [name] : []
  if (!selected.length) throw new Error('Unknown plugin; use --help')
  const profile = resolve(options[1] ?? join(process.env.DSH_HOME ?? join(homedir(), '.dsh'), 'profiles/web'))
  const manifest = JSON.parse(await readFile(join(profile, 'package.json'), 'utf8'))
  if (!manifest.dsh?.profile) throw new Error('Expected an existing DSH profile; install Harness first')
  const patch = join(profile, 'cordis.patch.yml')
  const readPatch = async () => { try { return await readFile(patch, 'utf8') } catch (error) { if (error.code === 'ENOENT') return ''; throw error } }
  const lockPath = join(profile, '.community-plugins-install.lock')
  const lock = await open(lockPath, 'wx', 0o600)
  try {
    const before = await readPatch()
    const mounts = await Promise.all(selected.map(async id => {
      const pkg = JSON.parse(await readFile(join(root, 'plugins', id, 'package.json'), 'utf8'))
      return { id: id === 'favicon' ? 'custom-favicon' : `community-${id}`, name: pkg.name }
    }))
    const after = appendMounts(migrateLegacyFaviconMount(before, mounts), mounts)
    const result = spawnSync(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', ['--dir', profile, 'add', '--config.auto-install-peers=true', ...selected.map(id => `file:${join(root, 'plugins', id)}`)], { stdio: 'inherit' })
    if (result.error) throw result.error
    if (result.status !== 0) throw new Error('Dependency installation failed; patch was not changed')
    if (await readPatch() !== before) throw new Error('Profile patch changed during install; dependencies installed but mount not written. Retry after reviewing the patch.')
    if (after !== before) {
      if (before) await writeFile(`${patch}.${randomUUID()}.bak`, before, { mode: 0o600, flag: 'wx' })
      const temp = `${patch}.${randomUUID()}.tmp`
      await writeFile(temp, after, { mode: 0o600, flag: 'wx' })
      await rename(temp, patch)
    }
    console.log(`Installed: ${selected.join(', ')}\nProfile: ${profile}\nRefresh the Web page; restart Harness if the profile does not reload live.`)
  } finally { await lock.close(); await unlink(lockPath) }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1 })
}
