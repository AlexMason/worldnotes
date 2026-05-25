/**
 * WorldNotes Sync Server
 *
 * WebSocket server for real-time Yjs document sync.
 * Uses y-protocols for the sync wire protocol.
 *
 * Usage: npx tsx src/server/index.ts [--port 1234]
 */

import { WebSocketServer, WebSocket } from 'ws'
import * as Y from 'yjs'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'
import * as syncProtocol from 'y-protocols/sync'
import * as awarenessProtocol from 'y-protocols/awareness'
import { createServer } from 'http'

function parsePort(): number {
  const idx = process.argv.indexOf('--port')
  if (idx !== -1 && process.argv[idx + 1]) {
    return parseInt(process.argv[idx + 1]!, 10)
  }
  return 1234
}

const PORT = parsePort()

// Per-room state
const rooms = new Map<
  string,
  {
    doc: Y.Doc
    awareness: awarenessProtocol.Awareness
    clients: Set<WebSocket>
  }
>()

function getRoom(roomName: string) {
  let room = rooms.get(roomName)
  if (!room) {
    const doc = new Y.Doc()
    const awareness = new awarenessProtocol.Awareness(doc)
    room = { doc, awareness, clients: new Set() }
    rooms.set(roomName, room)

    // Listen for document updates and broadcast to all clients in room
    doc.on('update', (update: Uint8Array) => {
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, 0) // messageSync
      syncProtocol.writeUpdate(encoder, update)
      const message = encoding.toUint8Array(encoder)
      broadcast(room!, message)
    })

    // Listen for awareness changes and broadcast
    awareness.on('update', ({ added, updated, removed }: {
      added: number[]
      updated: number[]
      removed: number[]
    }) => {
      const changedClients = added.concat(updated, removed)
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, 1) // messageAwareness
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients),
      )
      const message = encoding.toUint8Array(encoder)
      broadcast(room!, message)
    })
  }
  return room
}

function broadcast(
  room: { clients: Set<WebSocket> },
  message: Uint8Array,
): void {
  for (const client of room.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message)
    }
  }
}

function setupWSConnection(ws: WebSocket, roomName: string): void {
  const room = getRoom(roomName)
  room.clients.add(ws)

  // Send sync step 1 (current document state)
  const syncEncoder = encoding.createEncoder()
  encoding.writeVarUint(syncEncoder, 0) // messageSync
  syncProtocol.writeSyncStep1(syncEncoder, room.doc)
  ws.send(encoding.toUint8Array(syncEncoder))

  // Send current awareness states
  const awarenessEncoder = encoding.createEncoder()
  encoding.writeVarUint(awarenessEncoder, 1) // messageAwareness
  encoding.writeVarUint8Array(
    awarenessEncoder,
    awarenessProtocol.encodeAwarenessUpdate(
      room.awareness,
      Array.from(room.awareness.getStates().keys()),
    ),
  )
  if (encoding.length(awarenessEncoder) > 1) {
    ws.send(encoding.toUint8Array(awarenessEncoder))
  }

  ws.on('message', (data: Buffer) => {
    const message = new Uint8Array(data)
    const decoder = decoding.createDecoder(message)
    const messageType = decoding.readVarUint(decoder)

    switch (messageType) {
      case 0: {
        // Sync message
        const encoder = encoding.createEncoder()
        encoding.writeVarUint(encoder, 0) // messageSync
        syncProtocol.readSyncMessage(
          decoder,
          encoder,
          room.doc,
          null,
        )
        if (encoding.length(encoder) > 1) {
          ws.send(encoding.toUint8Array(encoder))
        }
        break
      }
      case 1: {
        // Awareness message
        awarenessProtocol.applyAwarenessUpdate(
          room.awareness,
          decoding.readVarUint8Array(decoder),
          ws as unknown as { clientID: number; clock: number },
        )
        break
      }
    }
  })

  ws.on('close', () => {
    room.clients.delete(ws)
    awarenessProtocol.removeAwarenessStates(
      room.awareness,
      [(ws as unknown as { clientID: number }).clientID],
      'connection closed',
    )
  })

  ws.on('error', () => {
    room.clients.delete(ws)
  })
}

const httpServer = createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('WorldNotes Sync Server\n')
})

const wss = new WebSocketServer({ noServer: true })

httpServer.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url ?? '/', `http://localhost:${PORT}`)
  const roomName = url.searchParams.get('room') ?? 'default'

  wss.handleUpgrade(request, socket, head, (ws) => {
    setupWSConnection(ws, roomName)
  })
})

httpServer.listen(PORT, () => {
  console.log(`WorldNotes sync server listening on ws://localhost:${PORT}`)
})
