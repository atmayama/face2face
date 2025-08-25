import { writable } from 'svelte/store';
import type Peer from 'peerjs';

export const peer = writable<Peer | null>(null);
export const peerId = writable<string | null>(null);
export const isConnected = writable(false);

export function initializePeer(id?: string): Promise<Peer> {
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
        });        });

    });
}
