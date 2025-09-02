<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import favicon from '$lib/assets/favicon.ico';
	import lightIcon from '$lib/assets/icons/light.svg';
	import darkIcon from '$lib/assets/icons/dark.svg';

	let { children } = $props();

	let dark = $state(false);

	onMount(() => {
		if (typeof window !== 'undefined') {
			const savedTheme = localStorage.getItem('theme');
			if (savedTheme) {
				dark = savedTheme === 'dark';
			} else {
				dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			}
		}
	});

	$effect(() => {
		if (typeof window !== 'undefined') {
			document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
			localStorage.setItem('theme', dark ? 'dark' : 'light');
		}
	});
	function toggleTheme() {
		dark = !dark;
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class={dark ? 'dark' : ''}>
	<header class="fixed top-0 z-10 h-5 w-screen">
		<div class="container mx-auto flex items-center justify-between px-6 py-4">
			<div></div>
			<div class="flex items-end space-x-4">
				<button
					class="rounded-3xl bg-gray-200 p-2 font-bold text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
					onclick={toggleTheme}
					aria-label="Toggle Theme"
				>
					<img
						src={dark ? lightIcon : darkIcon}
						class="h-5 w-5 duration-500 ease-in-out dark:invert"
						alt="Toggle"
					/>
				</button>
			</div>
		</div>
	</header>

	{@render children?.()}
</div>
