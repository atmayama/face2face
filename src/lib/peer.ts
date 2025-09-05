import { writable } from 'svelte/store';
import type Peer from 'peerjs';
import { DataConnection } from 'peerjs';

export const peer = writable<Peer | null>(null);
export const peerId = writable<string | null>(null);
export const isConnected = writable(false);
export const dataConnections = writable(new Map<string, DataConnection>())

type NewData = {
    type: "new",
    payload: string
}
type MessageData = {
    type: "message",
    payload: {
        time: Date,
        message: string
    }
}
type Data = NewData | MessageData

export function initializePeer(id?: string | null): Promise<Peer> {
    return new Promise((resolve, reject) => {
        import('peerjs').then(({ default: PeerJS }) => {
            const newPeer: Peer = new PeerJS(id || '', {});

            newPeer.on('open', (id) => {
                console.log('PeerJS open:', id);
                peer.set(newPeer);
                peerId.set(id);
                isConnected.set(true);
                resolve(newPeer);
            });

            newPeer.on('error', (err) => {
                console.error('PeerJS error:', err);
                reject(err);
            });

            newPeer.on('disconnected', () => {
                console.log('PeerJS disconnected');
            });

            newPeer.on('close', () => {
                console.log('PeerJS close');
            });

            newPeer.on('connection', (conn) => {
                dataConnections.update(connections => connections.set(conn.connectionId, conn))
                conn.on('data', (data) => {
                    const d = (data as Data)
                    switch (d.type) {
                        case "new":
                            {
                                const id = d.payload;
                                const dataConnection = newPeer.connect(id);
                                dataConnections.update(c => c.set(id, dataConnection));
                                break;
                            }
                        default:
                    }
                })
            })
        });

    });
}
