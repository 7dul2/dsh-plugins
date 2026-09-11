import assert from 'node:assert/strict'
import { test } from 'node:test'
import { decodeImageData, iconDocument, validate } from '../lib/index.js'

test('validates supported images and emits an embedded SVG document', () => {
  const imageData = Buffer.from([1, 2, 3, 4]).toString('base64')
  validate({ imageData, mimeType: 'image/png' }, 4)
  const body = iconDocument(decodeImageData(imageData, 4), 'image/png')
  assert.match(body, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)
  assert.match(body, /data:image\/png;base64,AQIDBA==/)
})

test('rejects malformed, unsupported, and oversized selections', () => {
  assert.throws(() => decodeImageData('not base64', 100), /valid base64/)
  assert.throws(() => validate({ imageData: Buffer.from([1, 2]).toString('base64'), mimeType: 'image/svg+xml' }, 100), /does not support/)
  assert.throws(() => decodeImageData(Buffer.alloc(5).toString('base64'), 4), /between 1 and 4 bytes/)
})
