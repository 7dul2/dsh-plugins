import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
const root = new URL('../', import.meta.url)
const patterns = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['provider key', /\b(?:sk-[A-Za-z0-9_-]{20,}|AIza[A-Za-z0-9_-]{25,}|gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})/],
  ['credential assignment', /(?:api[_-]?key|access[_-]?token|secret|password)\s*[:=]\s*['"][A-Za-z0-9+/_=-]{16,}['"]/i],
  ['personal path', /\/Users\/(?!example(?:\/|\b))[^/\s]+\//],
  ['credential URL', /https?:\/\/[^\s/:]+:[^\s/@]+@/],
]
let count = 0
let failed = false
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (['node_modules', '.git'].includes(entry.name)) continue
    const path = join(dir, entry.name)
    if (entry.isSymbolicLink()) { console.error(`Unexpected symlink: ${relative(root.pathname, path)}`); failed = true; continue }
    if (entry.isDirectory()) { await walk(path); continue }
    count++
    if (/^(?:\.env(?:\..*)?|settings\.ya?ml|cordis\.patch\.yml)$|\.(?:pem|key|p12|pfx|log|bak)$/.test(entry.name)) {
      console.error(`Forbidden filename: ${relative(root.pathname, path)}`); failed = true
    }
    const lines = (await readFile(path, 'utf8')).split('\n')
    for (const [index, line] of lines.entries()) for (const [label, pattern] of patterns) {
      if (pattern.test(line)) { console.error(`${label}: ${relative(root.pathname, path)}:${index + 1}`); failed = true }
    }
  }
}
await walk(root.pathname)
console.log(`Scanned ${count} files; ${failed ? 'findings require review' : 'no matches in configured credential patterns'}. Values are never printed.`)
if (failed) process.exitCode = 1
