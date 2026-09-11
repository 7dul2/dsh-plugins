/**
 * Unit tests for the host half's patch-file text surgery and command parsing.
 * These functions are the only file-mutating logic of the plugin, so they are
 * exercised against the exact grammar the loader applies.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'

const host = await import('../lib/index.js')

const SAMPLE = [
  '# dsh profile patch layer',
  '- insert:',
  '    # Custom browser-tab icon.',
  '    - id: custom-favicon',
  '      name: ./favicon-plugin.mjs',
  '    - id: ui-update-check',
  "      name: '@deepseek-ai/dsh-client-ui-update-check'",
  '    - id: ui-archived-chats',
  "      name: '@deepseek-ai/dsh-client-ui-archived-chats'",
  '',
].join('\n')

test('deriveInsertId follows the dsh package name conventions', () => {
  assert.equal(host.deriveInsertId('@deepseek-ai/dsh-client-ui-update-check'), 'ui-update-check')
  assert.equal(host.deriveInsertId('@deepseek-ai/dsh-foo/bar'), 'foo-bar')
  assert.equal(host.deriveInsertId('my-plain-plugin'), 'my-plain-plugin')
})

test('toggle disable appends a marked block that re-parses and re-enables exactly', () => {
  const disabled = host.togglePatchText(SAMPLE, 'ui-update-check', false)
  assert.ok(host.patchHasDisable(disabled, 'ui-update-check'))
  // The user's own rows and comments survive byte-for-byte.
  assert.ok(disabled.includes('# Custom browser-tab icon.'))
  assert.ok(disabled.includes("name: '@deepseek-ai/dsh-client-ui-update-check'"))
  const enabled = host.togglePatchText(disabled, 'ui-update-check', true)
  assert.ok(!host.patchHasDisable(enabled, 'ui-update-check'))
  assert.equal(enabled, SAMPLE)
})

test('toggle rejects non-conforming ids and non-array documents', () => {
  assert.throws(() => host.togglePatchText(SAMPLE, 'bad id!', false))
  assert.throws(() => host.togglePatchText('just: a map', 'x', false))
})

test('appendInsertRow adds one top-level insert entry and keeps the file an array', () => {
  const next = host.appendInsertRow(SAMPLE, 'ui-cost-analytics', '@deepseek-ai/dsh-client-ui-cost-analytics')
  const rows = host.readInsertRows(next)
  assert.equal(rows.length, 4)
  assert.deepEqual(rows.at(-1), { id: 'ui-cost-analytics', name: '@deepseek-ai/dsh-client-ui-cost-analytics' })
  assert.ok(next.includes('# dsh profile patch layer'))
})

test('readInsertRows collects rows across multiple insert entries', () => {
  const text = `${SAMPLE}- id: ui-archived-chats\n  disabled: true\n- insert:\n    - id: ui-cost-analytics\n      name: '@deepseek-ai/dsh-client-ui-cost-analytics'\n`
  const rows = host.readInsertRows(text)
  assert.equal(rows.length, 4)
  assert.ok(host.patchHasDisable(text, 'ui-archived-chats'))
})

test('parseCommandSpec accepts exactly the four verbs with non-empty args', () => {
  assert.deepEqual(host.parseCommandSpec('n1|refresh|'), { nonce: 'n1', verb: 'refresh', arg: '' })
  assert.deepEqual(host.parseCommandSpec('n2|toggle|ui-update-check'), { nonce: 'n2', verb: 'toggle', arg: 'ui-update-check' })
  assert.deepEqual(host.parseCommandSpec('n3|open|/tmp/x'), { nonce: 'n3', verb: 'open', arg: '/tmp/x' })
  assert.equal(host.parseCommandSpec('n4|uninstall|x'), undefined)
  assert.equal(host.parseCommandSpec('n5|open|'), undefined)
  assert.equal(host.parseCommandSpec('garbage'), undefined)
  assert.equal(host.parseCommandSpec(''), undefined)
})
