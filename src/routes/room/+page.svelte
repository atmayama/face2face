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
let isMobile: boolean = false;
	

function videoStream(videoElement: HTMLVideoElement, stream: MediaStream) {
	videoElement.srcObject = stream;
	return {
		update(newStream: MediaStream) {
			videoElement.srcObject = newStream;
		},
		destroy() {
			// Clean up if necessary
		}
	};
}

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
	isMobile = window.innerWidth <= 768;
	

	if (action === 'create') {
		await initializePeer($page.url.searchParams.get('roomId'));
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

		if ($page.url.searchParams.get('roomId') && currentPeer.id !== $page.url.searchParams.get('roomId')) {
			const call = currentPeer.call($page.url.searchParams.get('roomId'), localStream);
			if (call) {
				call.on('stream', (userVideoStream) => {
					remoteStreams.set($page.url.searchParams.get('roomId')!, userVideoStream);
					remoteStreams = remoteStreams;
				});
				connections.set($page.url.searchParams.get('roomId'), call);
			}
		}
	}
});
</script>

<div class="relative w-screen h-screen">
  <!-- Remote Videos -->
  <div class="flex flex-wrap w-full h-full gap-2">
	  <div class="flex flex-row flex-wrap justify-center gap-1 w-full">
    {#each [...remoteStreams.entries()] as [peerId, stream]}
      {#if stream}
          <video use:videoStream={stream} autoplay class="border-2 border-white rounded-xl max-h-screen" style="width: calc(100%/{Math.min(remoteStreams.size,2)} - 1rem)">
			<track kind="captions"/>
		</video>
		{/if}
	{/each}
	</div>
  </div>

  <!-- Self Video -->
  {#if localStream}
    <div class="fixed bottom-4 left-4 w-1/4 h-1/4 border-2 border-white rounded-md overflow-hidden">
      <video use:videoStream={localStream} autoplay muted class="w-full h-full object-cover bg-black"></video>
    </div>
  {/if}

  <!-- Switch Camera Button -->
  {#if isMobile}
  <button on:click={toggleCamera} class="absolute bottom-4 right-4 bg-blue-500 text-white rounded-full p-4 shadow-lg">
    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 10h4m0 0l-4-4m4 4l-4 4M8 14H4m0 0l4 4m-4-4l4-4" />
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18.5a6.5 6.5 0 100-13 6.5 6.5 0 000 13z" />
    </svg>
  </button>
{/if}
</div>