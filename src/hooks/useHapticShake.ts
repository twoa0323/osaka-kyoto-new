import { useEffect } from 'react';

export const useHapticShake = () => {
    useEffect(() => {
        const handleHaptic = (e: Event) => {
            const customEvent = e as CustomEvent;
            // You could handle different types differently here

            document.body.classList.remove('haptic-shake');
            // Trigger reflow to restart animation
            void document.body.offsetWidth;
            document.body.classList.add('haptic-shake');

            setTimeout(() => {
                document.body.classList.remove('haptic-shake');
            }, 200);
        };

        window.addEventListener('haptic-feedback', handleHaptic);
        return () => window.removeEventListener('haptic-feedback', handleHaptic);
    }, []);
};
