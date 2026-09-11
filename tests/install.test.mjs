import { test } from 'node:test'
import assert from 'node:assert/strict'
import { appendMounts, migrateLegacyFaviconMount } from '../scripts/install.mjs'
const mount = { id: 'community-model-retry', name: '@deepseek-ai/dsh-client-ui-model-retry' }
test('preserves comments and other configuration, and is idempotent', () => {
 const before = '# user comment\n- id: unrelated\n  disabled: true\n'
 const after = appendMounts(before, [mount])
 assert.ok(after.startsWith(before))
 assert.equal(appendMounts(after, [mount]), after)
})
test('rejects conflicting ids and alternate existing ids for the same package', () => {
 assert.throws(() => appendMounts('- insert:\n    - id: community-model-retry\n      name: different\n', [mount]), /Conflicting/)
 assert.throws(() => appendMounts('- insert:\n    - id: other\n      name: "@deepseek-ai/dsh-client-ui-model-retry"\n', [mount]), /Conflicting/)
})
test('refuses invalid patch documents', () => {
 assert.throws(() => appendMounts('not: an array', [mount]), /array/)
 assert.throws(() => appendMounts('[', [mount]))
})

test('migrates the legacy single-file favicon mount while preserving comments', () => {
 const before = '# icon comment\n- insert:\n    # keep this note\n    - id: custom-favicon\n      name: ./favicon-plugin.mjs\n'
 const mounts = [{ id: 'custom-favicon', name: '@deepseek-ai/dsh-client-ui-favicon' }]
 const migrated = migrateLegacyFaviconMount(before, mounts)
 assert.ok(migrated.includes('# keep this note'))
 assert.ok(migrated.includes('name: "@deepseek-ai/dsh-client-ui-favicon"'))
 assert.equal(migrateLegacyFaviconMount(migrated, mounts), migrated)
})

test('CLI installs and mounts into an isolated profile without duplicate entries', async () => {
 const { mkdtemp, mkdir, writeFile, readFile, rm } = await import('node:fs/promises')
 const { tmpdir } = await import('node:os')
 const { join } = await import('node:path')
 const { spawnSync } = await import('node:child_process')
 if (process.platform === 'win32') return
 const root = await mkdtemp(join(tmpdir(), 'dsh-plugins-installer-'))
 try {
  const profile = join(root, 'profile')
  const bin = join(root, 'bin')
  await mkdir(profile); await mkdir(bin)
  await writeFile(join(profile, 'package.json'), JSON.stringify({ dsh: { profile: { bundles: [] } } }))
  await writeFile(join(bin, 'pnpm'), '#!/bin/sh\nexit 0\n', { mode: 0o700 })
  for (let i = 0; i < 2; i++) {
   const result = spawnSync(process.execPath, ['scripts/install.mjs', 'model-retry', '--profile', profile], { encoding: 'utf8', env: { ...process.env, PATH: bin + ':' + process.env.PATH } })
   assert.equal(result.status, 0, result.stderr)
  }
  const patch = await readFile(join(profile, 'cordis.patch.yml'), 'utf8')
  assert.equal((patch.match(/id: community-model-retry/g) ?? []).length, 1)
 } finally { await rm(root, { recursive: true, force: true }) }
})
