import { describe, it, expect, vi } from 'vitest'
import { createMediaUploader } from '../media-upload'
import type { PreparedPhoto } from '../photo-convert'

const photo = new File(['raw'], 'holiday.jpg', { type: 'image/jpeg' })
const converted = new Blob(['png-bytes'], { type: 'image/png' })
const prepared = { blob: converted, filename: 'photo.png' as const }

function uploader(
  respond: () => Response | Promise<Response>,
  prepare: () => Promise<PreparedPhoto> = async () => prepared,
) {
  const fetchImpl = vi.fn(async () => respond())
  const upload = createMediaUploader({ fetchImpl: fetchImpl as unknown as typeof fetch, prepare })
  return { upload, fetchImpl }
}

describe('createMediaUploader', () => {
  it('posts the converted PNG as a single `file` part and returns the url', async () => {
    const { upload, fetchImpl } = uploader(() =>
      Response.json({ id: 7, url: '/media/7' }, { status: 201 }),
    )
    expect(await upload(photo)).toEqual({ url: '/media/7' })

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/media/photos')
    expect(init.method).toBe('POST')
    const form = init.body as FormData
    expect(form.getAll('file')).toHaveLength(1)
    const part = form.get('file') as File
    // (the `photo.png` filename is not observable under happy-dom's FormData)
    expect(part.type).toBe('image/png')
    expect(await part.text()).toBe('png-bytes')
  })

  it('surfaces the server error text', async () => {
    const { upload } = uploader(() =>
      Response.json({ error: 'file exceeds the upload size limit (15 MiB)' }, { status: 413 }),
    )
    await expect(upload(photo)).rejects.toThrow('file exceeds the upload size limit (15 MiB)')
  })

  it('falls back to the status for a non-JSON error body', async () => {
    const { upload } = uploader(() => new Response('<html>bad gateway</html>', { status: 502 }))
    await expect(upload(photo)).rejects.toThrow('Upload failed (HTTP 502)')
  })

  it('reports a network failure', async () => {
    const upload = createMediaUploader({
      fetchImpl: (async () => {
        throw new TypeError('fetch failed')
      }) as unknown as typeof fetch,
      prepare: async () => prepared,
    })
    await expect(upload(photo)).rejects.toThrow('Upload failed: network error')
  })

  it('rejects a 2xx response without a url', async () => {
    const { upload } = uploader(() => Response.json({ id: 1 }, { status: 201 }))
    await expect(upload(photo)).rejects.toThrow('Upload failed: unexpected response')
  })

  it('does not send a request when conversion fails', async () => {
    const { upload, fetchImpl } = uploader(
      () => Response.json({}),
      async () => {
        throw new Error('Could not read this image')
      },
    )
    await expect(upload(photo)).rejects.toThrow('Could not read this image')
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('returns the preparation notice with the url so the editor can show it', async () => {
    const { upload } = uploader(
      () => Response.json({ id: 3, url: '/media/3' }, { status: 201 }),
      async () => ({ ...prepared, notice: 'Only the first frame was kept' }),
    )
    expect(await upload(photo)).toEqual({
      url: '/media/3',
      notice: 'Only the first frame was kept',
    })
  })

  it('uploads an animated GIF blob unchanged', async () => {
    const gif = new Blob(['GIF89a-bytes'], { type: 'image/gif' })
    const { upload, fetchImpl } = uploader(
      () => Response.json({ id: 4, url: '/media/4' }, { status: 201 }),
      async () => ({ blob: gif, filename: 'photo.gif' }),
    )
    expect(await upload(photo)).toEqual({ url: '/media/4' })
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    const part = (init.body as FormData).get('file') as File
    expect(part.type).toBe('image/gif')
    expect(await part.text()).toBe('GIF89a-bytes')
  })
})
