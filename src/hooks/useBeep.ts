import { useCallback, useRef, useState } from 'react';

/**
 * Web Audio API beep with autoplay-safe unlock.
 * - Call `unlock()` once inside a user gesture (click) to satisfy browser policies.
 * - Then call `beep()` anytime.
 */
export function useBeep() {
    const ctxRef = useRef<AudioContext | null>(null);
    const [isUnlocked, setUnlocked] = useState(false);

    const ensureContext = useCallback(async () => {
        if (!ctxRef.current) {
            const AnyAudioContext =
                (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
            ctxRef.current = new AnyAudioContext();
        }
        if (ctxRef.current.state === 'suspended') {
            try {
                await ctxRef.current.resume();
            } catch { /* ignore */ }
        }
        return ctxRef.current;
    }, []);

    /** Call inside a user gesture once to enable audio */
    const unlock = useCallback(async () => {
        const ctx = await ensureContext();
        if (ctx.state === 'running') setUnlocked(true);
    }, [ensureContext]);

    /** Short beep (customizable) */
    const beep = useCallback(
        async (opts?: { freq?: number; duration?: number; volume?: number }) => {
            const { freq = 880, duration = 0.18, volume = 1 } = opts ?? {};
            const ctx = await ensureContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            const t0 = ctx.currentTime;
            const v = Math.max(0.0001, Math.min(1, volume));
            gain.gain.setValueAtTime(0.0001, t0);
            gain.gain.exponentialRampToValueAtTime(v, t0 + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

            osc.type = 'sine';
            osc.frequency.value = freq;
            osc.connect(gain).connect(ctx.destination);
            osc.start(t0);
            osc.stop(t0 + duration);
        },
        [ensureContext]
    );

    return { beep, unlock, isUnlocked };
}
