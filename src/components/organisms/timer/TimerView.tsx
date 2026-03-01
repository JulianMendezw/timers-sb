import React from 'react';
import { IoAlarmOutline, IoRefresh  } from "react-icons/io5";
import { MdKeyboardArrowLeft, MdKeyboardArrowRight, MdNotifications, MdNotificationsOff } from 'react-icons/md';
import { FaMoon, FaSun } from 'react-icons/fa';
import './timer.scss';
import TimeModal from '../../atoms/modalSetTime/setTimeModal';
import PeanutTestShift from '../../atoms/PeanutTestShift/PeanutTestShift';
import ExtraSample from '../samples/ExtraSample';
import type { UseTimersReturn } from './useTimers';
import { getShiftLabel } from '../../../utils/productionDay';

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
    theme,
    toggleTheme,
    setKernelTime,
    setEvalsTime,
    setMdTime,
    setSamplesTime,
    setKernelAM,
    setEvalsAM,
    setMdAM,
    setSamplesAM,
}) => {
    const now24 = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
    const currentShiftLabel = getShiftLabel(new Date());

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
                    <div className="page-clock" aria-live="polite" title="Hora local">
                        {nowStr}
                        <span className="page-clock__divider"> | </span>
                        <span className="page-clock__24">{now24}</span>
                        <span className="page-clock__divider"> | </span>
                        <span className="page-clock__shift">{currentShiftLabel}</span>
                    </div>
                </div>

                <div className="page-header__right">
                    <PeanutTestShift />
                    <div className="header-controls">
                        <button
                            className={`theme-toggle ${theme === 'light' ? 'light' : 'dark'}`}
                            onClick={toggleTheme}
                            title={theme === 'light' ? 'Switch to dark' : 'Switch to light'}
                            aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
                        >
                            {theme === 'light' ? <FaMoon /> : <FaSun />}
                        </button>

                        <button
                            className={`sound-toggle ${soundOn ? 'on' : 'off'}`}
                            onClick={toggleSound}
                            title={soundOn ? 'Disable sound' : 'Enable sound'}
                            aria-pressed={soundOn}
                        >
                            {soundOn ? <MdNotifications /> : <MdNotificationsOff />}
                        </button>
                    </div>
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
                       <IoAlarmOutline />
                    </button>
                    <button
                        onClick={() =>
                            nextTest(40, kernelTime, setKernelTime, 'kernel', () => kernelAM, (v) => setKernelAM(v))
                        }
                        title="+40"
                    >
                        <IoRefresh />
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
                       <IoAlarmOutline />
                    </button>
                    <button
                        onClick={() =>
                            nextTest(50, evalsTime, setEvalsTime, 'evals', () => evalsAM, (v) => setEvalsAM(v))
                        }
                        title="+50"
                    >
                        <IoRefresh />
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
                       <IoAlarmOutline />
                    </button>
                    <button
                        onClick={() =>
                            nextTest(110, mdTime, setMdTime, 'md', () => mdAM, (v) => setMdAM(v))
                        }
                        title="+110"
                    >
                        <IoRefresh />
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
                       <IoAlarmOutline />
                    </button>
                    <button
                        onClick={() =>
                            nextTest(120, samplesTime, setSamplesTime, 'samples', () => samplesAM, (v) => setSamplesAM(v))
                        }
                        title="+120"
                    >
                        <IoRefresh />
                    </button>
                </div>
            </section>

            <div className="samples-extra-row">
                <ExtraSample />
            </div>

        </div>
    );
};

export default TimerView;