import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { supabase } from '../../../lib/supabaseClient';
import { useClock } from '../../../hooks/useClock';
import { useBeep } from '../../../hooks/useBeep';
import {
    normalizeHHMM12,
    inferNextPhase,
    minutesUntilNextWithPhase,
    addMinutesWithPhase,
} from '../../../utils/timeUtils';

type Label = 'kernel' | 'evals' | 'md' | 'samples';

type TimerRow = {
    id?: string | number | null;
    kernel_time?: string | null;
    kernel_am?: boolean | null;
    evals_time?: string | null;
    evals_am?: boolean | null;
    md_time?: string | null;
    md_am?: boolean | null;
    samples_time?: string | null;
    samples_am?: boolean | null;
};

type TimerPayload = {
    kernel_time: string | null;
    kernel_am: boolean | null;
    evals_time: string | null;
    evals_am: boolean | null;
    md_time: string | null;
    md_am: boolean | null;
    samples_time: string | null;
    samples_am: boolean | null;
};

type InsertTimerResult = {
    id?: string | number | null;
};

const TONES: Record<Label, number> = {
    kernel: 880,
    evals: 740,
    md: 660,
    samples: 520,
};

const TIMER_DISPLAY_NAMES: Record<Label, string> = {
    kernel: 'Kernel',
    evals: 'Evals',
    md: 'Metal & Grind',
    samples: 'Samples',
};

export type UseTimersReturn = {
    // state
    kernelTime: string;
    evalsTime: string;
    mdTime: string;
    samplesTime: string;
    kernelAM: boolean | null;
    evalsAM: boolean | null;
    mdAM: boolean | null;
    samplesAM: boolean | null;
    modalIsOpen: boolean;
    activeTimer: Label | null;
    draftTime: string;
    nextDisplayTime: { label: Exclude<Label, 'samples'>; time: string } | null;
    dueTimers: Label[];
    soundOn: boolean;
    isUnlocked: boolean;
    nowStr: string;
    theme: 'light' | 'dark';
    toggleTheme: () => void;

    // actions
    openModal: (label: Label, current: string) => void;
    cancelModal: () => void;
    saveFromModal: (value: string) => Promise<void>;
    nextTest: (
        minutesToAdd: number,
        currentHHMM: string,
        setNextTime: (v: string) => void,
        label: Label,
        phaseGetter: () => boolean | null
    ) => Promise<void>;
    toggleSound: () => Promise<void>;
};

export function useTimers(): UseTimersReturn {
    const [mdTime, setMdTime] = useState('00:00');
    const [evalsTime, setEvalsTime] = useState('00:00');
    const [samplesTime, setSamplesTime] = useState('00:00');
    const [kernelTime, setKernelTime] = useState('00:00');

    const [kernelAM, setKernelAM] = useState<boolean | null>(null);
    const [evalsAM, setEvalsAM] = useState<boolean | null>(null);
    const [mdAM, setMdAM] = useState<boolean | null>(null);
    const [samplesAM, setSamplesAM] = useState<boolean | null>(null);

    const [modalIsOpen, setModalIsOpen] = useState(false);
    const [activeTimer, setActiveTimer] = useState<Label | null>(null);
    const [draftTime, setDraftTime] = useState('');

    const [nextDisplayTime, setNextDisplayTime] = useState<{
        label: Exclude<Label, 'samples'>;
        time: string;
    } | null>(null);

    const [dueTimers, setDueTimers] = useState<Label[]>([]);

    const nowStr = useClock(false);
    const { beep, unlock, isUnlocked } = useBeep();
    const [soundOn, setSoundOn] = useState(true);
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        try {
            const saved = localStorage.getItem('theme');
            if (saved === 'light' || saved === 'dark') return saved;
        } catch {
            /* ignore */
        }
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    });
    const prevDueRef = useRef<Label[]>([]);

    const rowIdRef = useRef<string | number | null>(null);

    const getDueLabelsNow = useCallback((times: {
        kernelTime: string;
        evalsTime: string;
        mdTime: string;
        samplesTime: string;
        kernelAM: boolean | null;
        evalsAM: boolean | null;
        mdAM: boolean | null;
        samplesAM: boolean | null;
    }): Label[] => {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const twelveHour = (hours % 12) || 12;
        const currentTime = `${twelveHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        const currentIsAM = hours < 12;

        const dueNow: Label[] = [];
        const pushIfDue = (label: Label, t: string, phase: boolean | null) => {
            if (!t) return;
            const phaseMatches = phase == null ? true : phase === currentIsAM;
            if (t === currentTime && phaseMatches) dueNow.push(label);
        };

        pushIfDue('kernel', times.kernelTime, times.kernelAM);
        pushIfDue('evals', times.evalsTime, times.evalsAM);
        pushIfDue('md', times.mdTime, times.mdAM);
        pushIfDue('samples', times.samplesTime, times.samplesAM);

        return dueNow;
    }, []);

    // Function to check which timers are currently due
    // Adds newly due timers to the list without removing previously due ones
    const checkDueTimers = useCallback((times: {
        kernelTime: string;
        evalsTime: string;
        mdTime: string;
        samplesTime: string;
        kernelAM: boolean | null;
        evalsAM: boolean | null;
        mdAM: boolean | null;
        samplesAM: boolean | null;
    }) => {
        const newlyDue = getDueLabelsNow(times);

        // Add newly due timers without removing existing ones
        // Timers are only removed when explicitly updated via saveFromModal or nextTest
        if (newlyDue.length > 0) {
            setDueTimers((prev) => {
                const combined = [...prev];
                for (const label of newlyDue) {
                    if (!combined.includes(label)) combined.push(label);
                }
                return combined;
            });
        }
    }, [getDueLabelsNow]);

    const playTripleBeep = useCallback((frequency: number, startOffsetMs = 0) => {
        const pipMs = 120;
        const gapMs = 250;
        const volume = 100;
        [0, 1, 2, 3].forEach((i) => {
            setTimeout(() => {
                beep({ freq: frequency, duration: pipMs / 1000, volume });
            }, startOffsetMs + i * (pipMs + gapMs));
        });
    }, [beep]);

    const buildPayloadFromState = (overrides: Partial<TimerPayload> = {}): TimerPayload => ({
        kernel_time: kernelTime || null,
        kernel_am: kernelAM,
        evals_time: evalsTime || null,
        evals_am: evalsAM,
        md_time: mdTime || null,
        md_am: mdAM,
        samples_time: samplesTime || null,
        samples_am: samplesAM,
        ...overrides,
    });

    const saveToDB = async (overrides: Partial<TimerPayload> = {}) => {
        try {
            const payload = buildPayloadFromState(overrides);
            if (rowIdRef.current) {
                const { error } = await supabase.from('timers').update(payload).eq('id', rowIdRef.current);
                if (error) console.error('Supabase update error:', error);
            } else {
                const { data, error } = await supabase.from('timers').insert([payload]).select('id').single();
                if (error) {
                    console.error('Supabase insert error:', error);
                } else {
                    rowIdRef.current = (data as InsertTimerResult | null)?.id ?? null;
                }
            }
        } catch (err) {
            console.error('Failed saving timers to DB', err);
        }
    };

    const applyTimerRow = useCallback((data: TimerRow) => {
        rowIdRef.current = data.id ?? null;
        setKernelTime(data.kernel_time ?? '00:00');
        setKernelAM(data.kernel_am ?? null);
        setEvalsTime(data.evals_time ?? '00:00');
        setEvalsAM(data.evals_am ?? null);
        setMdTime(data.md_time ?? '00:00');
        setMdAM(data.md_am ?? null);
        setSamplesTime(data.samples_time ?? '00:00');
        setSamplesAM(data.samples_am ?? null);
    }, []);

    const loadFromDB = useCallback(async () => {
        try {
            const { data, error } = await supabase.from('timers').select('*').order('id', { ascending: false }).limit(1).maybeSingle();
            if (error) {
                const message = (error as { message?: string })?.message ?? error;
                console.info('No timers row found or error loading timers:', message);
                return;
            }
            if (data) {
                applyTimerRow(data as TimerRow);
            }
        } catch (err) {
            console.error('Error loading timers from DB', err);
        }
    }, [applyTimerRow]);

    const persistTimer = async (label: Label, time: string, am: boolean | null) => {
        const keyTime =
            label === 'kernel' ? 'kernel_time' : label === 'evals' ? 'evals_time' : label === 'md' ? 'md_time' : 'samples_time';
        const keyAm = label === 'kernel' ? 'kernel_am' : label === 'evals' ? 'evals_am' : label === 'md' ? 'md_am' : 'samples_am';
        const overrides: Partial<TimerPayload> = {};
        overrides[keyTime] = time;
        overrides[keyAm] = am;
        await saveToDB(overrides);
    };

    const openModal = (label: Label, current: string) => {
        setActiveTimer(label);
        setDraftTime(current);
        setModalIsOpen(true);
    };

    const cancelModal = () => {
        setActiveTimer(null);
        setModalIsOpen(false);
    };

    const saveFromModal = async (value: string) => {
        const t12 = normalizeHHMM12(value);
        const phase = inferNextPhase(t12);

        if (activeTimer === 'kernel') {
            setKernelTime(t12);
            setKernelAM(phase);
            setDueTimers((prev) => prev.filter((l) => l !== 'kernel'));
            await persistTimer('kernel', t12, phase);
        } else if (activeTimer === 'evals') {
            setEvalsTime(t12);
            setEvalsAM(phase);
            setDueTimers((prev) => prev.filter((l) => l !== 'evals'));
            await persistTimer('evals', t12, phase);
        } else if (activeTimer === 'md') {
            setMdTime(t12);
            setMdAM(phase);
            setDueTimers((prev) => prev.filter((l) => l !== 'md'));
            await persistTimer('md', t12, phase);
        } else if (activeTimer === 'samples') {
            setSamplesTime(t12);
            setSamplesAM(phase);
            setDueTimers((prev) => prev.filter((l) => l !== 'samples'));
            await persistTimer('samples', t12, phase);
        }

        setActiveTimer(null);
        setModalIsOpen(false);
    };

    const nextTest = async (
        minutesToAdd: number,
        currentHHMM: string,
        setNextTime: (v: string) => void,
        label: Label,
        phaseGetter: () => boolean | null
    ) => {
        const baseHHMM = normalizeHHMM12(currentHHMM);
        const existingPhase = phaseGetter();
        const effectivePhase = existingPhase == null ? inferNextPhase(baseHHMM) : existingPhase;

        const { newHHMM, newIsAM } = addMinutesWithPhase(baseHHMM, effectivePhase, minutesToAdd);

        // Try to update the view-provided setter (may be a no-op)
        try {
            setNextTime(newHHMM);
        } catch {
            /* ignore */
        }

        // Also update the hook's internal state so the UI reflects the change
        switch (label) {
            case 'kernel':
                setKernelTime(newHHMM);
                setKernelAM(newIsAM);
                break;
            case 'evals':
                setEvalsTime(newHHMM);
                setEvalsAM(newIsAM);
                break;
            case 'md':
                setMdTime(newHHMM);
                setMdAM(newIsAM);
                break;
            case 'samples':
                setSamplesTime(newHHMM);
                setSamplesAM(newIsAM);
                break;
        }

        setDueTimers((prev) => prev.filter((item) => item !== label));

        await persistTimer(label, newHHMM, newIsAM);
    };

    // Check timers due
    useEffect(() => {
        // Check immediately when dependencies change
        checkDueTimers({
            kernelTime,
            evalsTime,
            mdTime,
            samplesTime,
            kernelAM,
            evalsAM,
            mdAM,
            samplesAM,
        });

        // Also check every 60 seconds as a fallback
        const interval = setInterval(() => {
            checkDueTimers({
                kernelTime,
                evalsTime,
                mdTime,
                samplesTime,
                kernelAM,
                evalsAM,
                mdAM,
                samplesAM,
            });
        }, 60_000);
        return () => clearInterval(interval);
    }, [kernelTime, evalsTime, mdTime, samplesTime, kernelAM, evalsAM, mdAM, samplesAM, checkDueTimers]);

    // Compute "next"
    useEffect(() => {
        const getNextTimeWithPriority = () => {
            const now = new Date();
            const items = [
                { label: 'kernel' as const, time: kernelTime, phase: kernelAM },
                { label: 'evals' as const, time: evalsTime, phase: evalsAM },
                { label: 'md' as const, time: mdTime, phase: mdAM },
            ];

            const candidates = items
                .filter((i) => i.time && /^\d{1,2}:\d{2}$/.test(i.time) && i.phase !== null)
                .map((i) => ({
                    ...i,
                    delta: minutesUntilNextWithPhase(normalizeHHMM12(i.time), i.phase as boolean, now),
                }));

            if (candidates.length === 0) {
                setNextDisplayTime(null);
                return;
            }

            candidates.sort((a, b) => {
                if (a.delta !== b.delta) return a.delta - b.delta;
                if (a.label === 'md' && b.label !== 'md') return -1;
                if (b.label === 'md' && a.label !== 'md') return 1;
                return 0;
            });

            setNextDisplayTime({ label: candidates[0].label, time: candidates[0].time });
        };

        getNextTimeWithPriority();
    }, [kernelTime, evalsTime, mdTime, kernelAM, evalsAM, mdAM]);

    // Beep on newly-due timers
    useEffect(() => {
        const prev = prevDueRef.current;
        const newlyDue = dueTimers.filter((label) => !prev.includes(label));

        if (newlyDue.length > 0) {
            newlyDue.slice(0, 4).forEach((label) => {
                toast.info(`${TIMER_DISPLAY_NAMES[label]} is due now`, {
                    toastId: `due-${label}`,
                    autoClose: 10000,
                    closeOnClick: false,
                    draggable: false,
                    closeButton: false,
                });
            });

            if (soundOn) {
                const labelStaggerMs = 240;
                newlyDue.slice(0, 4).forEach((label, idx) => {
                    const freq = TONES[label] ?? 880;
                    playTripleBeep(freq, idx * labelStaggerMs);
                });
            }
        }

        prevDueRef.current = dueTimers;
    }, [dueTimers, soundOn, playTripleBeep]);

    // Load timers on mount
    useEffect(() => {
        loadFromDB();

        const channel = supabase
            .channel('public:timers_live')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'timers' }, (payload: { new?: TimerRow; record?: TimerRow }) => {
                const record = payload?.new ?? payload?.record;
                if (record) {
                    applyTimerRow(record as TimerRow);
                    const timerRow = record as TimerRow;
                    setDueTimers(getDueLabelsNow({
                        kernelTime: timerRow.kernel_time ?? '00:00',
                        evalsTime: timerRow.evals_time ?? '00:00',
                        mdTime: timerRow.md_time ?? '00:00',
                        samplesTime: timerRow.samples_time ?? '00:00',
                        kernelAM: timerRow.kernel_am ?? null,
                        evalsAM: timerRow.evals_am ?? null,
                        mdAM: timerRow.md_am ?? null,
                        samplesAM: timerRow.samples_am ?? null,
                    }));
                    return;
                }

                void loadFromDB();
            })
            .subscribe();

        return () => {
            void (async () => {
                try {
                    if (typeof supabase.removeChannel === 'function') await supabase.removeChannel(channel);
                    else if (channel && typeof channel.unsubscribe === 'function') await channel.unsubscribe();
                } catch (err) {
                    console.warn('Failed to unsubscribe timers realtime channel', err);
                }
            })();
        };
    }, [applyTimerRow, loadFromDB, getDueLabelsNow]);

    const toggleSound = async () => {
        if (!isUnlocked) await unlock();
        setSoundOn((v) => !v);
    };

    // Theme management: persist and apply to document
    const applyTheme = (t: 'light' | 'dark') => {
        try {
            document.documentElement.dataset.theme = t;
            localStorage.setItem('theme', t);
        } catch {
            /* ignore */
        }
    };

    // initialize theme on mount and whenever it changes
    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

    return {
        kernelTime,
        evalsTime,
        mdTime,
        samplesTime,
        kernelAM,
        evalsAM,
        mdAM,
        samplesAM,
        modalIsOpen,
        activeTimer,
        draftTime,
        nextDisplayTime,
        dueTimers,
        soundOn,
        isUnlocked,
        nowStr,
        openModal,
        cancelModal,
        saveFromModal,
        nextTest,
        toggleSound,
        theme,
        toggleTheme,
    };
}