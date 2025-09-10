import { useEffect, useState } from 'react';

/**
 * Optimized clock hook:
 * - 12-hour format with AM/PM (e.g., "07:45 PM")
 * - Optional seconds ("07:45:12 PM")
 * - Aligns updates to next second/minute boundary to minimize re-renders.
 *
 * Usage:
 *   const nowStr = useClock();      // "hh:mm AM/PM", ticks once per minute
 *   const nowStr = useClock(true);  // "hh:mm:ss AM/PM", ticks once per second
 */
export function useClock(withSeconds: boolean = false): string {
    const [nowStr, setNowStr] = useState('');

    useEffect(() => {
        let timerId: number | undefined;

        const format12h = (d: Date) => {
            const isAM = d.getHours() < 12;
            const h12 = (d.getHours() % 12) || 12;
            const hh = h12.toString().padStart(2, '0');
            const mm = d.getMinutes().toString().padStart(2, '0');
            const ss = d.getSeconds().toString().padStart(2, '0');
            return `${hh}:${mm}${withSeconds ? `:${ss}` : ''} ${isAM ? 'AM' : 'PM'}`;
        };

        const update = () => setNowStr(format12h(new Date()));

        const scheduleNextTick = () => {
            const d = new Date();
            // Time until the next exact boundary (second or minute), minus current ms component.
            const msToNext = withSeconds
                ? 1000 - d.getMilliseconds()                                 // next second boundary
                : (60 - d.getSeconds()) * 1000 - d.getMilliseconds();        // next minute boundary

            // Clamp to a reasonable minimum to avoid rapid loops due to timing jitter.
            const delay = Math.max(50, msToNext % (withSeconds ? 1000 : 60000));

            timerId = window.setTimeout(() => {
                update();
                scheduleNextTick(); // recursively schedule the following tick
            }, delay);
        };

        update();          // initial render
        scheduleNextTick();

        return () => {
            if (timerId) window.clearTimeout(timerId);
        };
    }, [withSeconds]);

    return nowStr;
}
