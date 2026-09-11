/**
 * Host half of the browser-tab icon plugin: serves the selected image at the
 * `/favicon.svg` route already linked by the Web shell and stores the image in
 * the user settings document. The browser half chooses a local file and sends
 * its validated image bytes through the settings namespace.
 *
 * @module @deepseek-ai/dsh-client-ui-favicon
 */

import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import z from '@deepseek-ai/schemastery'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'custom-favicon'

/** The route and settings provider must be available before this plugin starts. */
export const inject = ['webServer', 'settings']

/** Settings namespace shared with the browser half. */
export const SETTINGS_NAMESPACE = 'custom-favicon-settings'

/** Image types accepted by the browser picker and served by the route. */
export const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

const DEFAULT_MIME_TYPE = 'image/png'
const DEFAULT_FALLBACK_PATH = '~/.dsh/profiles/web/favicon.png'
const DEFAULT_MAX_ICON_BYTES = 512 * 1024
const MAX_CONFIGURED_ICON_BYTES = 8 * 1024 * 1024
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/
const SVG_SIZE = 128

/**
 * Deployment settings for the fallback image and the durable upload limit.
 * @typedef {object} Config
 * @property {string} fallbackPath image used until the user picks one; `~` expands to the home directory.
 * @property {number} maxIconBytes maximum decoded size of a selected image.
 */

/** @type {import('@deepseek-ai/schemastery').Schema<Config>} */
export const Config = z.object({
  fallbackPath: z.string().default(DEFAULT_FALLBACK_PATH),
  maxIconBytes: z.number().step(1).min(1024).max(MAX_CONFIGURED_ICON_BYTES).default(DEFAULT_MAX_ICON_BYTES),
})

/** Durable image selection shared with the browser settings row. */
export const SectionSchema = z.object({
  imageData: z.string().default(''),
  mimeType: z.union([...IMAGE_MIME_TYPES]).default(DEFAULT_MIME_TYPE),
})

/**
 * Decode and validate one base64 image payload.
 * @param imageData - unprefixed base64 image bytes.
 * @param maxIconBytes - maximum decoded byte length.
 * @returns decoded image bytes, or an empty buffer when no custom image is set.
 */
export function decodeImageData(imageData, maxIconBytes = DEFAULT_MAX_ICON_BYTES) {
  if (imageData === '') return Buffer.alloc(0)
  if (!BASE64_PATTERN.test(imageData) || imageData.length % 4 !== 0) {
    throw new Error('custom-favicon imageData must be valid base64')
  }
  const image = Buffer.from(imageData, 'base64')
  if (image.length === 0 || image.length > maxIconBytes) {
    throw new Error(`custom-favicon image must be between 1 and ${String(maxIconBytes)} bytes`)
  }
  return image
}

/**
 * Validate the settings section before a user write can be persisted.
 * @param value - settings section resolved by Schemastery.
 * @param maxIconBytes - configured decoded image-size limit.
 */
export function validate(value, maxIconBytes = DEFAULT_MAX_ICON_BYTES) {
  if (!IMAGE_MIME_TYPES.includes(value.mimeType)) throw new Error(`custom-favicon does not support ${String(value.mimeType)}`)
  decodeImageData(value.imageData, maxIconBytes)
}

/**
 * Expand a leading `~` in a configured local path.
 * @param value - configured path.
 * @returns an absolute or unchanged path.
 */
function expandHome(value) {
  if (value === '~') return homedir()
  if (value.startsWith('~/')) return path.join(homedir(), value.slice(2))
  return value
}

/**
 * Wrap image bytes in the SVG document expected by the Web shell's favicon link.
 * @param image - image bytes.
 * @param mimeType - validated image MIME type.
 * @returns SVG response body.
 */
export function iconDocument(image, mimeType) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SVG_SIZE}" height="${SVG_SIZE}" viewBox="0 0 ${SVG_SIZE} ${SVG_SIZE}">`
    + `<image width="${SVG_SIZE}" height="${SVG_SIZE}" href="data:${mimeType};base64,${image.toString('base64')}"/></svg>`
}

/**
 * Register the durable settings section and the favicon route.
 * @param ctx - Cordis plugin context.
 * @param config - resolved plugin configuration.
 */
export function apply(ctx, config = { fallbackPath: DEFAULT_FALLBACK_PATH, maxIconBytes: DEFAULT_MAX_ICON_BYTES }) {
  const resolved = Config(config)
  const scope = ctx.settings.register(SETTINGS_NAMESPACE, SectionSchema, {
    validate: value => validate(value, resolved.maxIconBytes),
  })
  const fallbackPath = expandHome(resolved.fallbackPath)
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/favicon.svg',
    handler: async (_req, res) => {
      const selected = scope.get()
      let image
      let mimeType = selected.mimeType
      if (selected.imageData !== '') {
        image = decodeImageData(selected.imageData, resolved.maxIconBytes)
      } else {
        try {
          image = await readFile(fallbackPath)
          mimeType = DEFAULT_MIME_TYPE
        } catch (error) {
          if (error.code !== 'ENOENT') throw error
          res.writeHead(404)
          res.end()
          return
        }
      }
      res.writeHead(200, { 'content-type': 'image/svg+xml', 'cache-control': 'no-store' })
      res.end(iconDocument(image, mimeType))
    },
  }), 'custom-favicon: /favicon.svg')
}
