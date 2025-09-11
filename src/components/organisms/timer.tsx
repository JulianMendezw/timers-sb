import React, { useEffect, useRef, useState } from 'react';
import { CiAlarmOn, CiRedo } from 'react-icons/ci';
import { MdKeyboardArrowLeft, MdKeyboardArrowRight } from 'react-icons/md';

// Styles
import './timer.scss';

// Components
import TimeModal from '../atoms/modalSetTime/setTimeModal';
import PeanutTestShift from '../atoms/PeanutTestShift/PeanutTestShift';

// Utils
import {
    normalizeHHMM12,
    inferNextPhase,
    minutesUntilNextWithPhase,
    addMinutesWithPhase,
} from '../../utils/timeUtils';

// Hooks
import { useClock } from '../../hooks/useClock';
import { useBeep } from '../../hooks/useBeep';

type Label = 'kernel' | 'evals' | 'md' | 'samples';

const Timer: React.FC = () => {
    // Times (HH:MM 12h)
    const [mdTime, setMdTime] = useState('00:00');
    const [evalsTime, setEvalsTime] = useState('00:00');
    const [samplesTime, setSamplesTime] = useState('00:00');
    const [kernelTime, setKernelTime] = useState('00:00');

    // Phase anchored for next occurrence (AM=true, PM=false)
    const [kernelAM, setKernelAM] = useState<boolean | null>(null);
    const [evalsAM, setEvalsAM] = useState<boolean | null>(null);
    const [mdAM, setMdAM] = useState<boolean | null>(null);
    const [samplesAM, setSamplesAM] = useState<boolean | null>(null);

    // Modal
    const [modalIsOpen, setModalIsOpen] = useState(false);
    const [activeTimer, setActiveTimer] = useState<Label | null>(null);
    const [draftTime, setDraftTime] = useState('');

    // Next display (arrows) — samples excluded by design
    const [nextDisplayTime, setNextDisplayTime] = useState<{
        label: Exclude<Label, 'samples'>;
        time: string;
    } | null>(null);

    // Due (for blinking)
    const [dueTimers, setDueTimers] = useState<Label[]>([]);

    // Clock
    const nowStr = useClock(false);

    // Sound
    const { beep, unlock, isUnlocked } = useBeep();
    const [soundOn, setSoundOn] = useState(true);
    const prevDueRef = useRef<Label[]>([]);
    const tones: Record<Label, number> = {
        kernel: 880,
        evals: 740,
        md: 660,
        samples: 520,
    };

    // Render HH:MM with optional highlight and AM/PM badge
    const timeSplited = (t: string, highlight = false, ampm?: boolean | null) => {
        const [hours, minutes] = t.split(':');
        return (
            <p className={`animated-time ${highlight ? 'highlight-red' : ''}`}>
                {hours}
                <span className="blinking-colon">:</span>
                {minutes}
                {ampm != null && <sup className="ampm-badge">{ampm ? 'AM' : 'PM'}</sup>}
            </p>
        );
    };

    // Open modal with current value
    const openModal = (label: Label, current: string) => {
        setActiveTimer(label);
        setDraftTime(current);
        setModalIsOpen(true);
    };

    // Save from modal: set HH:MM + anchored phase
    const handleSaveFromModal = (value: string) => {
        const t12 = normalizeHHMM12(value);
        const phase = inferNextPhase(t12);

        if (activeTimer === 'kernel') {
            setKernelTime(t12);
            setKernelAM(phase);
            setDueTimers((prev) => prev.filter((l) => l !== 'kernel'));
        } else if (activeTimer === 'evals') {
            setEvalsTime(t12);
            setEvalsAM(phase);
            setDueTimers((prev) => prev.filter((l) => l !== 'evals'));
        } else if (activeTimer === 'md') {
            setMdTime(t12);
            setMdAM(phase);
            setDueTimers((prev) => prev.filter((l) => l !== 'md'));
        } else if (activeTimer === 'samples') {
            setSamplesTime(t12);
            setSamplesAM(phase);
            setDueTimers((prev) => prev.filter((l) => l !== 'samples'));
        }

        setActiveTimer(null);
        setModalIsOpen(false);
    };

    const handleCancelFromModal = () => {
        setActiveTimer(null);
        setModalIsOpen(false);
    };

    // Next (add minutes) preserving anchored phase
    const nextTest = (
        minutesToAdd: number,
        currentHHMM: string,
        setNextTime: React.Dispatch<React.SetStateAction<string>>,
        label: Label,
        phaseGetter: () => boolean | null,
        phaseSetter: (v: boolean) => void
    ) => {
        const baseHHMM = normalizeHHMM12(currentHHMM);
        const existingPhase = phaseGetter();
        const effectivePhase = existingPhase == null ? inferNextPhase(baseHHMM) : existingPhase;

        const { newHHMM, newIsAM } = addMinutesWithPhase(baseHHMM, effectivePhase, minutesToAdd);

        setNextTime(newHHMM);
        phaseSetter(newIsAM);
        setDueTimers((prev) => prev.filter((item) => item !== label));
    };

    // Check timers due (coincide HH:MM y fase; si fase null, tolerante)
    useEffect(() => {
        const checkDueTimers = () => {
            const now = new Date();
            const hours = now.getHours();
            const minutes = now.getMinutes();
            const twelveHour = (hours % 12) || 12;
            const currentTime = `${twelveHour.toString().padStart(2, '0')}:${minutes
                .toString()
                .padStart(2, '0')}`;
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

        // Run now and then every minute
        checkDueTimers();
        const interval = setInterval(checkDueTimers, 60_000);
        return () => clearInterval(interval);
    }, [kernelTime, evalsTime, mdTime, samplesTime, kernelAM, evalsAM, mdAM, samplesAM]);

    // Compute "next" (exclude samples from arrow indicator)
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

    // 🔔 Beep on every newly-due timer
    useEffect(() => {
        if (!soundOn) {
            prevDueRef.current = dueTimers; // keep in sync even when muted
            return;
        }

        const prev = prevDueRef.current;
        const newlyDue = dueTimers.filter((label) => !prev.includes(label));

        if (newlyDue.length > 0) {
            // Play a quick sequence: one beep per newly-due label (capped for safety)
            newlyDue.slice(0, 4).forEach((label, idx) => {
                setTimeout(() => {
                    beep({ freq: tones[label] ?? 880, duration: 0.16, volume: 0.22 });
                }, idx * 180);
            });
        }

        prevDueRef.current = dueTimers;
    }, [dueTimers, soundOn, beep]);

    return (
        <div className="timer-page">
            {/* Header */}
            <header className="page-header">
                <div className="page-header__left">
                    <h1 className="page-title">QA Timers SB</h1>
                    <div className="page-clock" aria-live="polite" title="Hora local">
                        {nowStr}
                    </div>
                </div>

                <div className="page-header__right">
                    {/* Sound toggle */}
                    <button
                        className={`sound-toggle ${soundOn ? 'on' : 'off'}`}
                        onClick={async () => {
                            if (!isUnlocked) await unlock();
                            setSoundOn((v) => !v);
                        }}
                        title={soundOn ? 'Disable sound' : 'Enable sound'}
                    >
                        🔔 {soundOn ? 'On' : 'Off'}
                    </button>
                </div>
            </header>

            {/* Modal */}
            <TimeModal
                name={activeTimer}
                isOpen={modalIsOpen}
                initialTime={draftTime}
                onCancel={handleCancelFromModal}
                onSave={handleSaveFromModal}
            />

            {/* Kernel */}
            <section className="timer-block kernel">
                <h2>Kernel:</h2>
                <div className="time-display">
                    <MdKeyboardArrowRight
                        style={{ visibility: nextDisplayTime?.label === 'kernel' ? 'visible' : 'hidden' }}
                    />
                    {timeSplited(kernelTime, dueTimers.includes('kernel'))}
                    <MdKeyboardArrowLeft
                        style={{ visibility: nextDisplayTime?.label === 'kernel' ? 'visible' : 'hidden' }}
                    />
                </div>
                <div className="timer-actions">
                    <button onClick={() => openModal('kernel', kernelTime)}>
                        <CiAlarmOn />
                    </button>
                    <button
                        onClick={() =>
                            nextTest(40, kernelTime, setKernelTime, 'kernel', () => kernelAM, (v) => setKernelAM(v))
                        }
                    >
                        <CiRedo />
                    </button>
                </div>
            </section>

            {/* Evals */}
            <section className="timer-block evals">
                <h2>Evals:</h2>
                <div className="time-display">
                    <MdKeyboardArrowRight
                        style={{ visibility: nextDisplayTime?.label === 'evals' ? 'visible' : 'hidden' }}
                    />
                    {timeSplited(evalsTime, dueTimers.includes('evals'))}
                    <MdKeyboardArrowLeft
                        style={{ visibility: nextDisplayTime?.label === 'evals' ? 'visible' : 'hidden' }}
                    />
                </div>
                <div className="timer-actions">
                    <button onClick={() => openModal('evals', evalsTime)}>
                        <CiAlarmOn />
                    </button>
                    <button
                        onClick={() =>
                            nextTest(50, evalsTime, setEvalsTime, 'evals', () => evalsAM, (v) => setEvalsAM(v))
                        }
                    >
                        <CiRedo />
                    </button>
                </div>
            </section>

            {/* Metal & Grind */}
            <section className="timer-block metalDetector">
                <h2>Metal &amp; Grind:</h2>
                <div className="time-display">
                    <MdKeyboardArrowRight
                        style={{ visibility: nextDisplayTime?.label === 'md' ? 'visible' : 'hidden' }}
                    />
                    {timeSplited(mdTime, dueTimers.includes('md'), mdAM)}
                    <MdKeyboardArrowLeft
                        style={{ visibility: nextDisplayTime?.label === 'md' ? 'visible' : 'hidden' }}
                    />
                </div>
                <div className="timer-actions">
                    <button onClick={() => openModal('md', mdTime)}>
                        <CiAlarmOn />
                    </button>
                    <button
                        onClick={() =>
                            nextTest(110, mdTime, setMdTime, 'md', () => mdAM, (v) => setMdAM(v))
                        }
                    >
                        <CiRedo />
                    </button>
                </div>
            </section>

            {/* Samples (no arrows by design) */}
            <section className="timer-block samples">
                <h2>Samples:</h2>
                <div className="time-display">
                    <MdKeyboardArrowRight style={{ visibility: 'hidden' }} />
                    {timeSplited(samplesTime, dueTimers.includes('samples'))}
                    <MdKeyboardArrowLeft style={{ visibility: 'hidden' }} />
                </div>
                <div className="timer-actions">
                    <button onClick={() => openModal('samples', samplesTime)}>
                        <CiAlarmOn />
                    </button>
                    <button
                        onClick={() =>
                            nextTest(
                                120,
                                samplesTime,
                                setSamplesTime,
                                'samples',
                                () => samplesAM,
                                (v) => setSamplesAM(v)
                            )
                        }
                    >
                        <CiRedo />
                    </button>
                </div>
            </section>
            <PeanutTestShift />
        </div>
    );
};

export default Timer;
