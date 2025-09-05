import { writable, get } from 'svelte/store';
import Peer, { type DataConnection, type MediaConnection } from 'peerjs';
import { resolve } from '$app/paths';

type Connection = { data: DataConnection | null; media: MediaConnection | null; stream: MediaStream | null };

export type PeerMessage<T extends string, P> = {
    type: T;
    payload: P;
};

export type NewUserMessage = PeerMessage<'new-user', { peerId: string }>;
export type ChatPayload = { date: string, text: string };
export type ChatMessage = PeerMessage<'chat-message', ChatPayload>;

export type AllMessages = NewUserMessage | ChatMessage;

export class PeerStateManager {
    public peer = writable<Peer | null>(null);
    public peerId = writable<string | null>(null);
    public connections = writable<Map<string, Connection>>(new Map());
    public isLeader = writable<boolean>(false);
    public messages = writable<ChatPayload[]>([]);
    private mediaStream: MediaStream;

    constructor(mediaStream: MediaStream) {
        this.mediaStream = mediaStream;
        this.peer.subscribe((peer) => {
            if (peer) {
                this._listenForIncomingConnections(peer);
            }
        });
        this.peerId.subscribe((peerId) => {
            console.log(`Peer ID: ${peerId}`)
        })
    }

    public initializePeer(peerId?: string): Promise<void> {
        console.log(`Initializing peer with id: ${peerId || 'generated'}`);
        if (peerId) {
            this.isLeader.set(true);
            console.log('This peer is the leader');
        }
        const newPeer = new Peer(peerId || '');
        return new Promise((resolve, reject) => {
            newPeer.on('open', () => {
                this.peer.set(newPeer);
                resolve();
            })
            newPeer.on('error', reject)
        })

    }

    private _listenForIncomingConnections(peer: Peer) {
        console.log("Listening to incoming connecitons");
        peer.on('connection', (dataConnection) => {
            console.log(`Incoming data connection from ${dataConnection.peer}`);
            this._addDataConnectionToStore(dataConnection);
        });
        peer.on('call', (mediaConnection) => {
            console.log(`Incoming media connection from ${mediaConnection.peer}`);
            mediaConnection.on('stream', (stream) => {
                console.log(`Received stream from ${mediaConnection.peer}`);
                this._addStreamToStore(mediaConnection.peer, stream);
            });
            mediaConnection.answer(this.mediaStream);
            this._addMediaConnectionToStore(mediaConnection);
        });
    }

    private _addStreamToStore(peerId: string, stream: MediaStream) {
        console.log(`Adding stream from ${peerId} to store`);
        this.connections.update((connections) => {
            const peerConnections = connections.get(peerId);
            if (peerConnections) {
                peerConnections.stream = stream;
            }
            return connections;
        });
    }

    private _addDataConnectionToStore(connection: DataConnection) {
        const isNewPeer = !get(this.connections).has(connection.peer);

        this.connections.update((connections) => {
            const peerConnections = connections.get(connection.peer) || { data: null, media: null, stream: null };
            peerConnections.data = connection;
            connections.set(connection.peer, peerConnections);
            return connections;
        });

        connection.on('close', () => {
            this.removeDataConnection(connection);
        });
        connection.on('data', (data: unknown) => {
            this._handleIncomingData(data as AllMessages);
        });

        if (isNewPeer && get(this.isLeader)) {
            this._broadcastNewUser(connection.peer);
        }
    }

    private _broadcastNewUser(newPeerId: string) {
        const allPeers = get(this.connections);
        const message: NewUserMessage = { type: 'new-user', payload: { peerId: newPeerId } };

        for (const [peerId, connection] of allPeers.entries()) {
            if (peerId !== newPeerId && connection.data && connection.data.open) {
                console.log(`Broadcasting new user: ${newPeerId} to ${peerId}`);
                this.sendData(peerId, message);
            }
        }
    }

    private _handleIncomingData(message: AllMessages) {
        console.log('Handling incoming data:', message);
        switch (message.type) {
            case 'new-user':
                this.addConnection(message.payload.peerId);
                break;
            case 'chat-message':
                this.messages.update((messages) => [...messages, message.payload]);
                break;
            default:
                console.warn('Unknown message type:', message.type);
        }
    }

    private _addMediaConnectionToStore(connection: MediaConnection) {
        this.connections.update((connections) => {
            const peerConnections = connections.get(connection.peer) || { data: null, media: null, stream: null };
            peerConnections.media = connection;
            connections.set(connection.peer, peerConnections);
            return connections;
        });
        connection.on('close', () => {
            this.removeMediaConnection(connection);
        });
    }

    public addConnection(peerId: string) {
        console.log(`Initiating connection to peer: ${peerId}`);
        const peer = get(this.peer);
        if (!peer) {
            console.error("Peer not initialized. Call initializePeer() first.");
            return;
        }

        const dataConnection = peer.connect(peerId);
        const mediaConnection = peer.call(peerId, this.mediaStream);

        this._addDataConnectionToStore(dataConnection);
        this._addMediaConnectionToStore(mediaConnection);

        mediaConnection.on('stream', (stream) => {
            this._addStreamToStore(mediaConnection.peer, stream);
        });
    }

    public sendData(peerId: string, message: AllMessages) {
        console.log(`Sending data to ${peerId}:`, message);
        const peerConnections = get(this.connections).get(peerId);
        if (peerConnections?.data) {
            peerConnections.data.send(message);
        }
    }

    public broadcastMessage(text: string) {
        console.log(`Broadcasting message: ${text}`);
        const message: ChatMessage = {
            type: 'chat-message',
            payload: {
                date: new Date().toISOString(),
                text: text,
            }
        };

        this.messages.update((messages) => [...messages, message.payload]);

        const allPeers = get(this.connections);
        for (const [peerId, connection] of allPeers.entries()) {
            if (connection.data && connection.data.open) {
                this.sendData(peerId, message);
            }
        }
    }

    public replaceStream(newStream: MediaStream) {
        console.log('Replacing media stream');
        this.mediaStream = newStream;
        const allPeers = get(this.connections);
        for (const [peerId, connection] of allPeers.entries()) {
            if (connection.media) {
                const videoTrack = newStream.getVideoTracks()[0];
                if (videoTrack) {
                    const sender = connection.media.peerConnection
                        .getSenders()
                        .find((s) => s.track?.kind === 'video');
                    if (sender) {
                        sender.replaceTrack(videoTrack);
                    }
                }
            }
        }
    }

    public removeDataConnection(connection: DataConnection) {
        console.log(`Removing data connection from ${connection.peer}`);
        this.connections.update((connections) => {
            const peerConnections = connections.get(connection.peer);
            if (peerConnections && peerConnections.data?.connectionId === connection.connectionId) {
                peerConnections.data?.close();
                peerConnections.data = null;
                if (peerConnections.media === null) {
                    connections.delete(connection.peer);
                }
            }
            return connections;
        });
    }

    public removeMediaConnection(connection: MediaConnection) {
        console.log(`Removing media connection from ${connection.peer}`);
        this.connections.update((connections) => {
            const peerConnections = connections.get(connection.peer);
            if (peerConnections && peerConnections.media?.connectionId === connection.connectionId) {
                peerConnections.media?.close();
                peerConnections.stream?.getTracks().forEach(track => track.stop());
                peerConnections.media = null;
                peerConnections.stream = null;
                if (peerConnections.data === null) {
                    connections.delete(connection.peer);
                }
            }
            return connections;
        });
    }
}
