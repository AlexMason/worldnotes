// ─── Photo uploader (browser) ────────────────────────────────────────────────
// Implements core's ImageUploader port: convert the picked/pasted/dropped file
// to a PNG in the browser, then POST it to /api/media/photos. Errors carry a
// user-presentable message (the editor shows it in a toast).

import type { ImageUploader } from '../core/types'
import { convertToPng } from './photo-convert'

export interface MediaUploaderDeps {
  fetchImpl?: typeof fetch
  convert?: (file: File) => Promise<Blob>
}

export function createMediaUploader(deps: MediaUploaderDeps = {}): ImageUploader {
  const doFetch = deps.fetchImpl ?? ((input, init) => fetch(input, init))
  const convert = deps.convert ?? ((file: File) => convertToPng(file))

  return async (file) => {
    const png = await convert(file)

    const form = new FormData()
    form.append('file', png, 'photo.png')

    let res: Response
    try {
      res = await doFetch('/api/media/photos', { method: 'POST', body: form })
    } catch {
      throw new Error('Upload failed: network error')
    }

    if (!res.ok) {
      let message: string | undefined
      try {
        const body = (await res.json()) as { error?: unknown }
        if (typeof body.error === 'string') message = body.error
      } catch {
        /* non-JSON error body: fall through to the status text */
      }
      throw new Error(message ?? `Upload failed (HTTP ${res.status})`)
    }

    const body = (await res.json()) as { url?: unknown }
    if (typeof body.url !== 'string') throw new Error('Upload failed: unexpected response')
    return { url: body.url }
  }
}
