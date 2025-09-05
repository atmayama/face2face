import { writable } from 'svelte/store';

export const isFullScreen = writable(false);

export function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

if (typeof document !== 'undefined') {
    document.addEventListener('fullscreenchange', () => {
        isFullScreen.set(!!document.fullscreenElement);
    });
}
