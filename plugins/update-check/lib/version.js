/**
 * Version ordering shared by the update-check halves.
 *
 * Accepts `x.y.z` with an optional prerelease suffix `-<word>.<n>` (covers
 * `-rc.N` and `-alpha.N`) and an optional ignored `+build` suffix. A release
 * outranks every prerelease of the same triple; within one prerelease word a
 * higher sequence outranks a lower one. Distinct prerelease words compare
 * lexicographically, which orders the npm convention `alpha < beta < rc`
 * correctly without hardcoding a word table.
 *
 * The browser half carries a byte-identical twin of this file inside
 * `lib/client.js` (the client bundle is a self-contained module-table factory
 * with no imports); keep the two in sync.
 *
 * @module @deepseek-ai/dsh-client-ui-update-check/version
 */

/**
 * @typedef {object} ParsedVersion
 * @property {number} major major component.
 * @property {number} minor minor component.
 * @property {number} patch patch component.
 * @property {{ word: string, seq: number } | undefined} pre prerelease half; `undefined` for a release version.
 */

/** `x.y.z[-word.n][+build]`; the leading `v` is tolerated, `n` defaults to 0. */
const VERSION_PATTERN = /^v?(\d+)\.(\d+)\.(\d+)(?:-([A-Za-z0-9]+)(?:\.(\d+))?)?(?:\+.*)?$/

/**
 * Parse one version string.
 * @param {unknown} value - version as printed by npm dist-tags or the dsh manifest.
 * @returns {ParsedVersion | undefined} the parsed version, or `undefined` when the string is not a supported form.
 */
export function parseVersion(value) {
  if (typeof value !== 'string') return undefined
  const match = VERSION_PATTERN.exec(value.trim())
  if (match === null) return undefined
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    pre: match[4] === undefined
      ? undefined
      : { word: match[4].toLowerCase(), seq: match[5] === undefined ? 0 : Number(match[5]) },
  }
}

/**
 * Order two version strings.
 * @param {string} a - left-hand version.
 * @param {string} b - right-hand version.
 * @returns {-1 | 0 | 1} `-1` when `a < b`, `1` when `a > b`, and `0` when equal
 *   or when either side is unparsable — callers treat `0` as "no update", so
 *   an unknown form degrades to a silent badge instead of a wrong prompt.
 */
export function compareVersions(a, b) {
  const left = parseVersion(a)
  const right = parseVersion(b)
  if (left === undefined || right === undefined) return 0
  for (const [l, r] of [[left.major, right.major], [left.minor, right.minor], [left.patch, right.patch]]) {
    if (l !== r) return l < r ? -1 : 1
  }
  if (left.pre === undefined || right.pre === undefined) {
    // One release, one prerelease of the same triple; two releases fall through equal.
    if (left.pre === right.pre) return 0
    return left.pre === undefined ? 1 : -1
  }
  if (left.pre.word !== right.pre.word) return left.pre.word < right.pre.word ? -1 : 1
  if (left.pre.seq !== right.pre.seq) return left.pre.seq < right.pre.seq ? -1 : 1
  return 0
}
