/**
 * Keep the actionable part of pnpm's output beside its exit code. Pnpm often
 * prints progress after the failure, so prefer diagnostic lines and retain a
 * short tail when it emits no recognizable error marker.
 * @param output - combined stdout and stderr from the install process.
 * @returns a bounded single-line diagnostic, or an empty string.
 */
export function summarizeInstallFailure(output) {
  const lines = output.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  const diagnostic = lines.filter(line => /(?:ERR!|ERR_PNPM|EPERM|EACCES|error|failed|not found|permission denied)/i.test(line))
  const selected = (diagnostic.length > 0 ? diagnostic.slice(-3) : lines.slice(-3)).join(' | ')
  return selected.slice(-600)
}
