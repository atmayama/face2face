
export async function getMediaStream(facingMode: 'user' | 'environment'): Promise<MediaStream | null> {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode,
                width: 320,
                height: 240,
                frameRate: 10,
                echoCancellation: true,
                backgroundBlur: true
            },
            audio: { frameRate: 5, echoCancellation: true }
        });
        return stream;
    } catch (err) {
        console.error('Error accessing media devices:', err);
    }
    return null
}