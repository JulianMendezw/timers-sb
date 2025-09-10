import React, { useEffect, useState } from 'react';
import { CiAlarmOn, CiRedo } from "react-icons/ci";
import { MdKeyboardArrowLeft, MdKeyboardArrowRight } from "react-icons/md";
import TimeModal from '../atoms/modalSetTime/setTimeModal';
import './timer.scss';

import {
    normalizeHHMM12,
    inferNextPhase,
    minutesUntilNextWithPhase,
    addMinutesWithPhase,
} from '../../utils/timeUtils';

import { useClock } from '../../hooks/useClock';

const Timer: React.FC = () => {
    const [mdTime, setMdTime] = useState('00:00');
    const [evalsTime, setEvalsTime] = useState('00:00');
    const [samplesTime, setSamplesTime] = useState('00:00');
    const [kernelTime, setKernelTime] = useState('00:00');

    const [kernelAM, setKernelAM] = useState<boolean | null>(null);
    const [evalsAM, setEvalsAM] = useState<boolean | null>(null);
    const [mdAM, setMdAM] = useState<boolean | null>(null);
    const [samplesAM, setSamplesAM] = useState<boolean | null>(null);

    const [modalIsOpen, setModalIsOpen] = useState(false);
    const [activeTimer, setActiveTimer] = useState<'kernel' | 'evals' | 'md' | 'samples' | null>(null);
    const [draftTime, setDraftTime] = useState('');

    const [nextDisplayTime, setNextDisplayTime] = useState<{
        label: 'kernel' | 'evals' | 'md' | 'samples';
        time: string;
    } | null>(null);

    const [dueTimers, setDueTimers] = useState<string[]>([]);
    const nowStr = useClock(false);

    const timeSplited = (t: string, highlight: boolean = false, ampm?: boolean | null) => {
        const [hours, minutes] = t.split(':');
        return (
            <p className={`animated-time ${highlight ? 'highlight-red' : ''}`}>
                {hours}
                <span className="blinking-colon">:</span>
                {minutes}
                {ampm != null && <sup className="ampm-badge">{ampm ? '' : ''}</sup>}
            </p>
        );
    };

    const openModal = (label: 'kernel' | 'evals' | 'md' | 'samples', current: string) => {
        setActiveTimer(label);
        setDraftTime(current);
        setModalIsOpen(true);
    };

    const handleSaveFromModal = (value: string) => {
        const t12 = normalizeHHMM12(value);
        const phase = inferNextPhase(t12);

        if (activeTimer === 'kernel') {
            setKernelTime(t12);
            setKernelAM(phase);
            setDueTimers(prev => prev.filter(label => label !== 'kernel'));
        } else if (activeTimer === 'evals') {
            setEvalsTime(t12);
            setEvalsAM(phase);
            setDueTimers(prev => prev.filter(label => label !== 'evals'));
        } else if (activeTimer === 'md') {
            setMdTime(t12);
            setMdAM(phase);
            setDueTimers(prev => prev.filter(label => label !== 'md'));
        } else if (activeTimer === 'samples') {
            setSamplesTime(t12);
            setSamplesAM(phase);
            setDueTimers(prev => prev.filter(label => label !== 'samples'));
        }

        setActiveTimer(null);
        setModalIsOpen(false);
    };

    const handleCancelFromModal = () => {
        setActiveTimer(null);
        setModalIsOpen(false);
    };

    const nextTest = (
        minutesToAdd: number,
        currentHHMM: string,
        setNextTime: React.Dispatch<React.SetStateAction<string>>,
        label: 'kernel' | 'evals' | 'md' | 'samples',
        phaseGetter: () => boolean | null,
        phaseSetter: (v: boolean) => void
    ) => {
        const baseHHMM = normalizeHHMM12(currentHHMM);
        const existingPhase = phaseGetter();
        const effectivePhase = (existingPhase == null) ? inferNextPhase(baseHHMM) : existingPhase;

        const { newHHMM, newIsAM } = addMinutesWithPhase(baseHHMM, effectivePhase, minutesToAdd);

        setNextTime(newHHMM);
        phaseSetter(newIsAM);

        setDueTimers(prev => prev.filter(item => item !== label));
    };

    useEffect(() => {
        const checkDueTimers = () => {
            const now = new Date();
            const hours = now.getHours();
            const minutes = now.getMinutes();
            const twelveHour = (hours % 12) || 12;
            const currentTime = `${twelveHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            const currentIsAM = hours < 12;

            setDueTimers(prev => {
                const next = [...prev];


                const pushIfDue = (
                    label: 'kernel' | 'evals' | 'md' | 'samples',
                    t: string,
                    phase: boolean | null
                ) => {
                    if (!t) return;
                    const phaseMatches = (phase == null) ? true : (phase === currentIsAM);
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
        const interval = setInterval(checkDueTimers, 60000);
        return () => clearInterval(interval);

    }, [kernelTime, evalsTime, mdTime, samplesTime, kernelAM, evalsAM, mdAM, samplesAM]);

    useEffect(() => {
        const getNextTimeWithPriority = () => {
            const now = new Date();
            const items = [
                { label: 'kernel' as const, time: kernelTime, phase: kernelAM },
                { label: 'evals' as const, time: evalsTime, phase: evalsAM },
                { label: 'md' as const, time: mdTime, phase: mdAM },
                { label: 'samples' as const, time: samplesTime, phase: samplesAM },
            ];

            const candidates = items
                .filter(i => i.time && /^\d{1,2}:\d{2}$/.test(i.time) && i.phase !== null)
                .map(i => ({
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
    }, [kernelTime, evalsTime, mdTime, samplesTime, kernelAM, evalsAM, mdAM, samplesAM]);

    return (
        <div>
            <div className="timer-controls">
                <TimeModal
                    name={activeTimer}
                    isOpen={modalIsOpen}
                    initialTime={draftTime}
                    onCancel={handleCancelFromModal}
                    onSave={handleSaveFromModal}
                />

                {/* Kernel */}

                <div className="page-clock" aria-live="polite" title="Hora local">
                    {nowStr}
                </div>

                <div className="kernel">
                    <h2>Kernel:</h2>
                    <div className="time-display">
                        <MdKeyboardArrowRight
                            style={{ visibility: nextDisplayTime?.label === "kernel" ? "visible" : "hidden" }}
                        />
                        {timeSplited(kernelTime, dueTimers.includes('kernel'), kernelAM)}
                        <MdKeyboardArrowLeft
                            style={{ visibility: nextDisplayTime?.label === "kernel" ? "visible" : "hidden" }}
                        />
                    </div>
                    <button onClick={() => openModal('kernel', kernelTime)}>
                        <CiAlarmOn />
                    </button>
                    <button
                        onClick={() =>
                            nextTest(40, kernelTime, setKernelTime, 'kernel', () => kernelAM, v => setKernelAM(v))
                        }
                    >
                        <CiRedo />
                    </button>
                </div>

                {/* Evals */}
                <div className="evals">
                    <h2>Evals:</h2>
                    <div className="time-display">
                        <MdKeyboardArrowRight
                            style={{ visibility: nextDisplayTime?.label === "evals" ? "visible" : "hidden" }}
                        />
                        {timeSplited(evalsTime, dueTimers.includes('evals'), evalsAM)}
                        <MdKeyboardArrowLeft
                            style={{ visibility: nextDisplayTime?.label === "evals" ? "visible" : "hidden" }}
                        />
                    </div>
                    <button onClick={() => openModal('evals', evalsTime)}>
                        <CiAlarmOn />
                    </button>
                    <button
                        onClick={() =>
                            nextTest(50, evalsTime, setEvalsTime, 'evals', () => evalsAM, v => setEvalsAM(v))
                        }
                    >
                        <CiRedo />
                    </button>
                </div>

                {/* Metal & Grind */}
                <div className="metalDetector">
                    <h2>Metal &amp; Grind:</h2>
                    <div className="time-display">
                        <MdKeyboardArrowRight
                            style={{ visibility: nextDisplayTime?.label === "md" ? "visible" : "hidden" }}
                        />
                        {timeSplited(mdTime, dueTimers.includes('md'), mdAM)}
                        <MdKeyboardArrowLeft
                            style={{ visibility: nextDisplayTime?.label === "md" ? "visible" : "hidden" }}
                        />
                    </div>
                    <button onClick={() => openModal('md', mdTime)}>
                        <CiAlarmOn />
                    </button>
                    <button
                        onClick={() =>
                            nextTest(110, mdTime, setMdTime, 'md', () => mdAM, v => setMdAM(v))
                        }
                    >
                        <CiRedo />
                    </button>
                </div>

                {/* Samples */}
                <div className="samples">
                    <h2>Samples:</h2>
                    <div className="time-display">
                        <MdKeyboardArrowRight
                            style={{ visibility: nextDisplayTime?.label === "samples" ? "visible" : "hidden" }}
                        />
                        {timeSplited(samplesTime, dueTimers.includes('samples'), samplesAM)}
                        <MdKeyboardArrowLeft
                            style={{ visibility: nextDisplayTime?.label === "samples" ? "visible" : "hidden" }}
                        />
                    </div>
                    <button onClick={() => openModal('samples', samplesTime)}>
                        <CiAlarmOn />
                    </button>
                    <button
                        onClick={() =>
                            nextTest(120, samplesTime, setSamplesTime, 'samples', () => samplesAM, v => setSamplesAM(v))
                        }
                    >
                        <CiRedo />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Timer;
