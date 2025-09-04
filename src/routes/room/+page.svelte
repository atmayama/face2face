<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { peer, peerId, initializePeer } from '$lib/peer';
	import type { MediaConnection } from 'peerjs';
	import flipcameraicon from '$lib/assets/icons/flip-camera.svg';
	import cameraOff from '$lib/assets/icons/camera-off.svg';
	import enlarge from '$lib/assets/icons/enlarge.svg';
	import undo from '$lib/assets/icons/undo.svg';
	import { goto } from '$app/navigation';

	const action = $page.url.searchParams.get('action');
	const roomId = $page.url.searchParams.get('roomId') ?? '';

	let localStream: MediaStream | undefined = $state();
	let remoteStreams = $state(new Map<string, MediaStream>());
	let connections = new Map<string, MediaConnection>();
	let currentFacingMode: 'user' | 'environment' = 'user';
	let isFullScreen = $state(false);

	async function getMediaStream(facingMode: 'user' | 'environment') {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode, width: 320, height: 240, frameRate: 10 },
				audio: { frameRate: 10 }
			});
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
			const videoTrack = localStream!.getVideoTracks()[0];
			if (videoTrack) {
				const sender = connection.peerConnection
					.getSenders()
					.find((s) => s.track?.kind === 'video');
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

	function toggleFullScreen() {
		if (!document.fullscreenElement) {
			document.documentElement.requestFullscreen();
			isFullScreen = true;
		} else {
			if (document.exitFullscreen) {
				document.exitFullscreen();
				isFullScreen = false;
			}
		}
	}

	function exitRoom() {
		for (const connection of connections.values()) {
			connection.close();
		}
		localStream!.getTracks().forEach((track) => track.stop());
		goto('/');
	}

	onMount(async () => {
		if (action === 'create') {
			await initializePeer(roomId);
		} else {
			await initializePeer();
		}

		await getMediaStream(currentFacingMode);
		console.log('Initial localStream on mount:', localStream);

		const currentPeer = $peer;
		if (currentPeer) {
			currentPeer.on('call', (call) => {
				console.log(`Call from ${call.peer}`);
				call.answer(localStream);
				call.on('stream', (userVideoStream) => {
					console.log(`stream from ${call.peer}`);
					remoteStreams.set(call.peer, userVideoStream);
					remoteStreams = new Map(remoteStreams);
				});
				connections.set(call.peer, call);
			});

			if (roomId && currentPeer.id !== roomId) {
				console.log(`Calling ${roomId}`);
				const call = currentPeer.call(roomId, localStream!);
				if (call) {
					call.on('stream', (userVideoStream) => {
						console.log(`Response from ${roomId}`);
						remoteStreams = remoteStreams.set(roomId, userVideoStream);
						remoteStreams = new Map(remoteStreams);
					});
					connections.set(roomId, call);
				}
			}
		}

		document.addEventListener('fullscreenchange', (event) => {
			if (!document.fullscreenElement) {
				isFullScreen = false;
			}
		});
	});
</script>

<div class="relative h-screen w-screen bg-gray-100 dark:bg-gray-600">
	<!-- Remote Videos -->
	<div class="flex h-full w-full items-center justify-center">
		<div class="flex flex-row flex-wrap items-center justify-center gap-5">
			{#if remoteStreams.size == 0}
				<span class="text-white">Welcome to Face2Face</span>
			{/if}

			{#each [...remoteStreams.entries()] as [peerId, stream]}
				{#if stream}
					<video
						srcObject={stream}
						autoplay
						class="h-min rounded-xl border-2 border-gray-300 p-2 dark:border-gray-700"
					>
						<track kind="captions" />
					</video>
				{/if}
			{/each}
		</div>
	</div>

	<!-- Self Video -->
	{#if localStream}
		<div
			class="fixed bottom-4 left-4 h-1/4 w-1/4 overflow-hidden rounded-md border-2 border-gray-300 dark:border-gray-700"
		>
			<video srcObject={localStream} autoplay muted class="h-full w-full bg-black object-cover"
			></video>
		</div>
	{/if}

	<!-- Menu Bar -->
	<div class="fixed bottom-16 left-1/2 z-10 -translate-x-1/2">
		<div
			class="bg-opacity-75 flex space-x-4 rounded-full bg-gray-200 p-2 shadow-lg dark:bg-gray-800"
		>
			<button class="rounded-full bg-gray-300 p-2 text-white dark:bg-gray-500">
				<img src={cameraOff} alt="camera off" class="w-5 dark:invert" />
			</button>
			<button
				class="rounded-full {isFullScreen
					? 'bg-red-400'
					: 'bg-gray-300 dark:bg-gray-500'} p-2 text-white"
				on:click={toggleFullScreen}
			>
				<img src={enlarge} alt="enlarge" class="w-5 dark:invert" />
			</button>
			<button
				class="rounded-full bg-gray-300 p-2 text-white lg:hidden dark:bg-gray-500"
				on:click={toggleCamera}
			>
				<img src={flipcameraicon} alt="Flip Camera" class="w-5 dark:invert" />
			</button>
			<button class="rounded-full bg-gray-300 p-2 text-white dark:bg-gray-500" on:click={exitRoom}>
				<img src={undo} alt="Exit Room" class="w-5 dark:invert" />
			</button>
		</div>
	</div>
</div>
