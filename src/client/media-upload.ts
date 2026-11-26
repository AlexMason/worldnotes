// ─── Photo uploader (browser) ────────────────────────────────────────────────
// Implements core's ImageUploader port: prepare the picked/pasted/dropped file
// in the browser (PNG conversion, or an animated GIF kept as is), then POST it
// to /api/media/photos. Errors carry a user-presentable message (the editor
// shows it in a toast); a `notice` reports something lost along the way.

import type { ImageUploader } from '../core/types'
import { preparePhoto, type PreparedPhoto } from './photo-convert'

export interface MediaUploaderDeps {
  fetchImpl?: typeof fetch
  prepare?: (file: File) => Promise<PreparedPhoto>
}

export function createMediaUploader(deps: MediaUploaderDeps = {}): ImageUploader {
  const doFetch = deps.fetchImpl ?? ((input, init) => fetch(input, init))
  const prepare = deps.prepare ?? ((file: File) => preparePhoto(file))

  return async (file) => {
    const { blob, filename, notice } = await prepare(file)

    const form = new FormData()
    form.append('file', blob, filename)

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
    return notice ? { url: body.url, notice } : { url: body.url }
  }
}
