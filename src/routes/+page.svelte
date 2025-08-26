<script lang="ts">
	export const prerender = true;
	import { goto } from '$app/navigation';

	let roomId = '';

	function createRoom() {
		if (roomId) {
			goto(`./room?roomId=${roomId}&action=create`);
		}
	}

	function joinRoom() {
		if (roomId) {
			goto(`./room?roomId=${roomId}&action=join`);
		}
	}
</script>

<div class="flex items-center justify-center min-h-screen bg-gray-100">
	<div class="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
		<h1 class="text-3xl font-bold text-center text-gray-900">Face 2 Face</h1>
		<div class="space-y-4">
			<div class="flex items-center space-x-2">
				<input
					type="text"
					bind:value={roomId}
					class="w-full px-3 py-2 text-gray-900 bg-gray-200 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
					placeholder="Enter Room ID"
				/>
			</div>
			<button
				on:click={createRoom}
				class="w-full px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
			>
				Create Room
			</button>
			<button
				on:click={joinRoom}
				class="w-full px-4 py-2 text-white bg-gray-600 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
			>
				Join Room
			</button>
		</div>
	</div>
</div>