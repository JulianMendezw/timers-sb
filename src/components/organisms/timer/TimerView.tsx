import React from 'react';
import { CiAlarmOn, CiRedo } from 'react-icons/ci';
import { MdKeyboardArrowLeft, MdKeyboardArrowRight } from 'react-icons/md';
import './timer.scss';
import TimeModal from '../../atoms/modalSetTime/setTimeModal';
import PeanutTestShift from '../../atoms/PeanutTestShift/PeanutTestShift';
import type { UseTimersReturn } from './useTimers';

type Props = UseTimersReturn & {
    setKernelTime: (v: string) => void;
    setEvalsTime: (v: string) => void;
    setMdTime: (v: string) => void;
    setSamplesTime: (v: string) => void;
    setKernelAM: (v: boolean) => void;
    setEvalsAM: (v: boolean) => void;
    setMdAM: (v: boolean) => void;
    setSamplesAM: (v: boolean) => void;
};

const TimerView: React.FC<Props> = ({
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
    nowStr,
    openModal,
    cancelModal,
    saveFromModal,
    nextTest,
    toggleSound,
    setKernelTime,
    setEvalsTime,
    setMdTime,
    setSamplesTime,
    setKernelAM,
    setEvalsAM,
    setMdAM,
    setSamplesAM,
}) => {
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

    return (
        <div className="timer-page">
            <header className="page-header">
                <div className="page-header__left">
                    <h1 className="page-title">QA Timers SB</h1>
                    <div className="page-clock" aria-live="polite" title="Hora local">
                        {nowStr}
                    </div>
                </div>

                <div className="page-header__right">
                    <button
                        className={`sound-toggle ${soundOn ? 'on' : 'off'}`}
                        onClick={toggleSound}
                        title={soundOn ? 'Disable sound' : 'Enable sound'}
                    >
                        🔔 {soundOn ? 'On' : 'Off'}
                    </button>
                </div>
            </header>

            <TimeModal
                name={activeTimer}
                isOpen={modalIsOpen}
                initialTime={draftTime}
                onCancel={cancelModal}
                onSave={saveFromModal}
            />

            {/* Kernel */}
            <section className="timer-block kernel">
                <h2>Kernel:</h2>
                <div className="time-display">
                    <MdKeyboardArrowRight
                        style={{ visibility: nextDisplayTime?.label === 'kernel' ? 'visible' : 'hidden' }}
                    />
                    {timeSplited(kernelTime, dueTimers.includes('kernel'), kernelAM)}
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
                        title="+40"
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
                    {timeSplited(evalsTime, dueTimers.includes('evals'), evalsAM)}
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
                        title="+50"
                    >
                        <CiRedo />
                    </button>
                </div>
            </section>

            {/* MD */}
            <section className="timer-block metalDetector">
                <h2>Metal &amp; Grind:</h2>
                <div className="time-display">
                    <MdKeyboardArrowRight style={{ visibility: nextDisplayTime?.label === 'md' ? 'visible' : 'hidden' }} />
                    {timeSplited(mdTime, dueTimers.includes('md'), mdAM)}
                    <MdKeyboardArrowLeft style={{ visibility: nextDisplayTime?.label === 'md' ? 'visible' : 'hidden' }} />
                </div>
                <div className="timer-actions">
                    <button onClick={() => openModal('md', mdTime)}>
                        <CiAlarmOn />
                    </button>
                    <button
                        onClick={() =>
                            nextTest(110, mdTime, setMdTime, 'md', () => mdAM, (v) => setMdAM(v))
                        }
                        title="+110"
                    >
                        <CiRedo />
                    </button>
                </div>
            </section>

            {/* Samples */}
            <section className="timer-block samples">
                <h2>Samples:</h2>
                <div className="time-display">
                    <MdKeyboardArrowRight style={{ visibility: 'hidden' }} />
                    {timeSplited(samplesTime, dueTimers.includes('samples'), samplesAM)}
                    <MdKeyboardArrowLeft style={{ visibility: 'hidden' }} />
                </div>
                <div className="timer-actions">
                    <button onClick={() => openModal('samples', samplesTime)}>
                        <CiAlarmOn />
                    </button>
                    <button
                        onClick={() =>
                            nextTest(120, samplesTime, setSamplesTime, 'samples', () => samplesAM, (v) => setSamplesAM(v))
                        }
                        title="+120"
                    >
                        <CiRedo />
                    </button>
                </div>
            </section>

            <PeanutTestShift />
        </div>
    );
};

export default TimerView;