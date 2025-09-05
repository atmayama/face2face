<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { PeerStateManager } from '$lib/peer_state_manager';
	import { getMediaStream } from '$lib/media';
	import { isFullScreen, toggleFullScreen } from '$lib/screen';
	import flipcameraicon from '$lib/assets/icons/flip-camera.svg';
	import cameraOff from '$lib/assets/icons/camera-off.svg';
	import enlarge from '$lib/assets/icons/enlarge.svg';
	import undo from '$lib/assets/icons/undo.svg';
	import chat from '$lib/assets/icons/chat.svg';
	import { goto } from '$app/navigation';

	const action = $page.url.searchParams.get('action') ?? '';
	const roomId = $page.url.searchParams.get('roomId') ?? '';
	const name = $page.url.searchParams.get('name') ?? 'Anonymous';

	let localStream: MediaStream | null = $state(null);
	let peerStateManager: PeerStateManager | null = $state(null);
	let currentFacingMode: 'user' | 'environment' = 'user';
	let showChat = $state(false);

	let connections = $derived(peerStateManager?.connections);
	let messages = $derived(peerStateManager?.messages);

	function sendMessage(event: Event) {
		const input = (event.target as HTMLFormElement).elements.namedItem(
			'message'
		) as HTMLInputElement;
		const message = input.value;
		if (message && peerStateManager) {
			peerStateManager.broadcastMessage(message);
			input.value = '';
		}
	}

	async function toggleCamera() {
		currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
		localStream = await getMediaStream(currentFacingMode);
		if (localStream && peerStateManager) {
			peerStateManager.replaceStream(localStream);
		}
	}

	function exitRoom() {
		if (peerStateManager) {
			const allConnections = peerStateManager.connections;
			for (const connection of get(allConnections).values()) {
				connection.data?.close();
				connection.media?.close();
			}
		}
		localStream?.getTracks().forEach((track) => track.stop());
		goto('/');
	}

	onMount(async () => {
		console.log('onMount');
		localStream = await getMediaStream(currentFacingMode);
		if (localStream) {
			peerStateManager = new PeerStateManager(localStream, name);
			if (action === 'create') {
				await peerStateManager.initializePeer(roomId);
			} else {
				await peerStateManager.initializePeer();
				peerStateManager.addConnection(roomId);
			}
			peerStateManager.messages.subscribe((messages) => {
				if (messages.length > 0) showChat = true;
			});
		}
	});
</script>

<div class="relative h-screen w-screen bg-gray-100 dark:bg-gray-600">
	<!-- Remote Videos -->
	<div class="flex h-full w-full items-center justify-center">
		<div class="flex flex-row flex-wrap items-center justify-center gap-5">
			{#if $connections && $connections.size == 0}
				<span class="text-white">Welcome to Face2Face</span>
			{/if}

			{#if $connections}
				{#each [...$connections.entries()] as [peerId, connection]}
					{#if connection.stream}
						<div class="relative">
							<video
								srcObject={connection.stream}
								autoplay
								class="h-min rounded-xl border-2 border-gray-300 p-2 dark:border-gray-700"
							>
								<track kind="captions" />
							</video>
							<div
								class="bg-opacity-50 absolute bottom-4 left-4 rounded-md bg-black px-2 py-1 text-white"
							>
								{connection.name}
							</div>
						</div>
					{/if}
				{/each}
			{/if}
		</div>
	</div>

	<!-- Self Video -->
	{#if localStream}
		<div
			class="fixed bottom-4 left-4 h-1/4 w-1/4 overflow-hidden rounded-md border-2 border-gray-300 dark:border-gray-700"
		>
			<video srcObject={localStream} autoplay muted class="h-full w-full bg-black object-cover"
			></video>
			<div class="bg-opacity-50 absolute bottom-2 left-2 rounded-md bg-black px-2 py-1 text-white">
				{name} (You)
			</div>
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
				class="rounded-full {$isFullScreen
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
			<button
				class="rounded-full bg-gray-300 p-2 text-white dark:bg-gray-500"
				on:click={() => (showChat = !showChat)}
			>
				<img src={chat} alt="Chat" class="w-5 dark:invert" />
			</button>
		</div>
	</div>

	<!-- Chat Window -->
	{#if showChat}
		<div
			class="fixed right-4 bottom-28 w-80 rounded-lg border-2 border-gray-300 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
		>
			<div class="h-64 overflow-y-auto p-4">
				{#if $messages}
					{#each $messages as msg}
						<div class="mb-2 text-sm text-gray-800 dark:text-gray-200">
							<span class="font-bold">{msg.name}</span>: <span>{msg.text}</span>
						</div>
					{/each}
				{/if}
			</div>
			<form
				on:submit|preventDefault={sendMessage}
				class="border-t-2 border-gray-300 p-4 dark:border-gray-700"
			>
				<input
					name="message"
					type="text"
					class="w-full rounded-md border-2 border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
					placeholder="Type a message..."
				/>
			</form>
		</div>
	{/if}
</div>
