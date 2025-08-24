<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { peer, peerId, initializePeer } from '$lib/peer';
	import type { MediaConnection } from 'peerjs';

	const action = $page.url.searchParams.get('action');

	let localStream: MediaStream;
	let remoteStreams = new Map<string, MediaStream>();
	let connections = new Map<string, MediaConnection>();
	let currentFacingMode: 'user' | 'environment' = 'user';
	let isMobile: boolean = false; // Added for mobile detection

	async function getMediaStream(facingMode: 'user' | 'environment') {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode, width: 320, height: 240, frameRate: 10 }, audio: {frameRate:10} });
			localStream = stream;
		} catch (err) {
			console.error('Error accessing media devices:', err);
			// Handle error, e.g., show a message to the user
		}
	}

	async function toggleCamera() {
		currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
		await getMediaStream(currentFacingMode);

		console.log('Toggled camera. New localStream:', localStream);

		// Update peers with the new camera stream
		for (const connection of connections.values()) {
			const videoTrack = localStream.getVideoTracks()[0];
			if (videoTrack) {
				const sender = connection.peerConnection.getSenders().find(s => s.track?.kind === 'video');
				if (sender) {
					sender.replaceTrack(videoTrack);
					console.log('Replaced track for peer:', connection.peer, 'with new track:', videoTrack);
				} else {
					console.warn('No video sender found for peer:', connection.peer);
				}
			} else {
				console.warn('No video track found in localStream after camera toggle.');
			}
		}
	}

	onMount(async () => {
		isMobile = window.innerWidth <= 768; // Example breakpoint for mobile devices

		if (action === 'create') {
			await initializePeer($page.params.roomId);
		} else {
			await initializePeer();
		}

		await getMediaStream(currentFacingMode);
		console.log('Initial localStream on mount:', localStream);

		const currentPeer = $peer;
		if (currentPeer) {
			currentPeer.on('call', (call) => {
				call.answer(localStream);
				call.on('stream', (userVideoStream) => {
					remoteStreams.set(call.peer, userVideoStream);
					remoteStreams = remoteStreams;
				});
				connections.set(call.peer, call);
			});

			// This is a simplified example, in a real-world scenario you'd use a signaling server
			// to exchange peer information before connecting.
			// For this example, we will just assume that we know the other peer's ID.
			// We will need to implement a way to get all peer IDs in the room.
			// For now, we will just connect to the roomId
			if ($page.params.roomId && currentPeer.id !== $page.params.roomId) {
				const call = currentPeer.call($page.params.roomId, localStream);
				if (call) {
					call.on('stream', (userVideoStream) => {
						remoteStreams.set($page.params.roomId!, userVideoStream);
						remoteStreams = remoteStreams;
					});
					connections.set($page.params.roomId, call);
				}
			}
		}
	});
</script>

<div class="container mx-auto p-4">
	<h1 class="text-2xl font-bold mb-4">Room: {$page.params.roomId}</h1>
	<p>Your Peer ID: {$peerId}</p>
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			{#if localStream}
				<div>
					<h2 class="text-xl font-semibold">Your Video</h2>
					<video srcObject={localStream} autoplay class="w-full h-auto bg-black"></video>
				</div>
			{/if}
		{#if isMobile}
			<button on:click={toggleCamera} class="px-4 py-2 bg-blue-500 text-white rounded-md mt-4">
				Switch Camera
			</button>
		{/if}
			{#each [...remoteStreams.entries()] as [peerId, stream]}
				{#if stream}
					<div>
						<h2 class="text-xl font-semibold">Remote Video from {peerId}</h2>
						<video srcObject={stream} autoplay class="w-full h-auto bg-black"></video>
					</div>
				{/if}
			{/each}
		</div>

</div>