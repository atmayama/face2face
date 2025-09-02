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

<div class="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-600">
	<div class="w-full max-w-md space-y-6 rounded-lg bg-white p-8 shadow-md dark:bg-gray-800">
		<div class="space-y-4">
			<div class="flex items-center space-x-2">
				<input
					type="text"
					bind:value={roomId}
					class="w-full rounded-md border border-gray-300 bg-gray-200 px-3 py-2 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
					placeholder="Enter Room ID"
				/>
			</div>
			<button
				on:click={createRoom}
				class="w-full rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
			>
				Create Room
			</button>
			<button
				on:click={joinRoom}
				class="w-full rounded-md bg-gray-500 px-4 py-2 text-white hover:bg-gray-600 focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:outline-none dark:bg-gray-700 dark:hover:bg-gray-600 dark:focus:ring-gray-500"
			>
				Join Room
			</button>
		</div>
	</div>
</div>
