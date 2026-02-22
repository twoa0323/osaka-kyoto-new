/**
 * 💡 Haptic Feedback Wrapper
 * Handles navigator.vibrate with a fallback for iOS Safari
 */
export const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' = 'light') => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (!isIOS && navigator.vibrate) {
        // Android / Chrome / Mobile Safari (if supported in future)
        switch (type) {
            case 'light': navigator.vibrate(10); break;
            case 'medium': navigator.vibrate(20); break;
            case 'heavy': navigator.vibrate(50); break;
            case 'success': navigator.vibrate([10, 30, 10]); break;
            case 'warning': navigator.vibrate([50, 100, 50]); break;
        }
    } else {
        // iOS Safari Fallback: Visual "Micro-shake" or just skip if too intrusive
        // Since we can't easily trigger CSS shake from here without a DOM ref,
        // we'll at least provide a hook that could be expanded.
        console.log(`[Haptic Fallback] ${type}`);

        // Optional: Dispatch a custom event that components can listen to for visual feedback
        window.dispatchEvent(new CustomEvent('haptic-feedback', { detail: { type } }));
    }
};
