import { useEffect, useRef, useState } from 'react';
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

    // actions
    openModal: (label: Label, current: string) => void;
    cancelModal: () => void;
    saveFromModal: (value: string) => Promise<void>;
    nextTest: (
        minutesToAdd: number,
        currentHHMM: string,
        setNextTime: (v: string) => void,
        label: Label,
        phaseGetter: () => boolean | null,
        phaseSetter: (v: boolean) => void
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
    const prevDueRef = useRef<Label[]>([]);

    const tones: Record<Label, number> = {
        kernel: 880,
        evals: 740,
        md: 660,
        samples: 520,
    };

    const rowIdRef = useRef<string | number | null>(null);

    const playTripleBeep = (frequency: number, startOffsetMs = 0) => {
        const pipMs = 120;
        const gapMs = 250;
        const volume = 100;
        [0, 1, 2, 3].forEach((i) => {
            setTimeout(() => {
                beep({ freq: frequency, duration: pipMs / 1000, volume });
            }, startOffsetMs + i * (pipMs + gapMs));
        });
    };

    const buildPayloadFromState = (overrides: Partial<Record<string, any>> = {}) => ({
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

    const saveToDB = async (overrides: Partial<Record<string, any>> = {}) => {
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
                    rowIdRef.current = (data as any)?.id ?? null;
                }
            }
        } catch (err) {
            console.error('Failed saving timers to DB', err);
        }
    };

    const loadFromDB = async () => {
        try {
            const { data, error } = await supabase.from('timers').select('*').limit(1).single();
            if (error) {
                console.info('No timers row found or error loading timers:', (error as any).message ?? error);
                return;
            }
            if (data) {
                rowIdRef.current = (data as any).id ?? null;
                setKernelTime(data.kernel_time ?? '00:00');
                setKernelAM(data.kernel_am ?? null);
                setEvalsTime(data.evals_time ?? '00:00');
                setEvalsAM(data.evals_am ?? null);
                setMdTime(data.md_time ?? '00:00');
                setMdAM(data.md_am ?? null);
                setSamplesTime(data.samples_time ?? '00:00');
                setSamplesAM(data.samples_am ?? null);
            }
        } catch (err) {
            console.error('Error loading timers from DB', err);
        }
    };

    const persistTimer = async (label: Label, time: string, am: boolean | null) => {
        const keyTime =
            label === 'kernel' ? 'kernel_time' : label === 'evals' ? 'evals_time' : label === 'md' ? 'md_time' : 'samples_time';
        const keyAm = label === 'kernel' ? 'kernel_am' : label === 'evals' ? 'evals_am' : label === 'md' ? 'md_am' : 'samples_am';
        const overrides: Partial<Record<string, any>> = {};
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
        phaseGetter: () => boolean | null,
        phaseSetter: (v: boolean) => void
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
        const checkDueTimers = () => {
            const now = new Date();
            const hours = now.getHours();
            const minutes = now.getMinutes();
            const twelveHour = (hours % 12) || 12;
            const currentTime = `${twelveHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            const currentIsAM = hours < 12;

            setDueTimers((prev) => {
                const next = [...prev];

                const pushIfDue = (label: Label, t: string, phase: boolean | null) => {
                    if (!t) return;
                    const phaseMatches = phase == null ? true : phase === currentIsAM;
                    if (t === currentTime && phaseMatches && !next.includes(label)) next.push(label);
                };

                pushIfDue('kernel', kernelTime, kernelAM);
                pushIfDue('evals', evalsTime, evalsAM);
                pushIfDue('md', mdTime, mdAM);
                pushIfDue('samples', samplesTime, samplesAM);

                return next;
            });
        };

        checkDueTimers();
        const interval = setInterval(checkDueTimers, 60_000);
        return () => clearInterval(interval);
    }, [kernelTime, evalsTime, mdTime, samplesTime, kernelAM, evalsAM, mdAM, samplesAM]);

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
        if (!soundOn) {
            prevDueRef.current = dueTimers;
            return;
        }

        const prev = prevDueRef.current;
        const newlyDue = dueTimers.filter((label) => !prev.includes(label));

        if (newlyDue.length > 0) {
            const labelStaggerMs = 240;
            newlyDue.slice(0, 4).forEach((label, idx) => {
                const freq = tones[label] ?? 880;
                playTripleBeep(freq, idx * labelStaggerMs);
            });
        }

        prevDueRef.current = dueTimers;
    }, [dueTimers, soundOn, beep]);

    // Load timers on mount
    useEffect(() => {
        loadFromDB();
    }, []);

    const toggleSound = async () => {
        if (!isUnlocked) await unlock();
        setSoundOn((v) => !v);
    };

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
    };
}