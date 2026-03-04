import React from 'react';
import { MdNotifications, MdNotificationsOff } from 'react-icons/md';
import { FaMoon, FaSun } from 'react-icons/fa';
import './timer.scss';
import TimeModal from '../../atoms/modalSetTime/setTimeModal';
import PeanutTestShift from '../../atoms/PeanutTestShift/PeanutTestShift';
import TimerRow from '../../molecules/timerRow/TimerRow';
import ExtraSample from '../samples/ExtraSample';
import type { UseTimersReturn } from './useTimers';
import { getShiftLabel } from '../../../utils/productionDay';

type Props = UseTimersReturn;

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
}) => {
    const noopSetTime: (v: string) => void = () => undefined;

    const now24 = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
    const currentShiftLabel = getShiftLabel(new Date());

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

            <TimerRow
                title="Kernel"
                blockClassName="kernel"
                time={kernelTime}
                isDue={dueTimers.includes('kernel')}
                isNext={nextDisplayTime?.label === 'kernel'}
                ampm={kernelAM}
                onOpen={() => openModal('kernel', kernelTime)}
                onRefresh={() => nextTest(40, kernelTime, noopSetTime, 'kernel', () => kernelAM)}
                refreshTitle="+40"
            />

            <TimerRow
                title="Evals"
                blockClassName="evals"
                time={evalsTime}
                isDue={dueTimers.includes('evals')}
                isNext={nextDisplayTime?.label === 'evals'}
                ampm={evalsAM}
                onOpen={() => openModal('evals', evalsTime)}
                onRefresh={() => nextTest(50, evalsTime, noopSetTime, 'evals', () => evalsAM)}
                refreshTitle="+50"
            />

            <TimerRow
                title="Metal & Grind"
                blockClassName="metalDetector"
                time={mdTime}
                isDue={dueTimers.includes('md')}
                isNext={nextDisplayTime?.label === 'md'}
                ampm={mdAM}
                onOpen={() => openModal('md', mdTime)}
                onRefresh={() => nextTest(110, mdTime, noopSetTime, 'md', () => mdAM)}
                refreshTitle="+110"
            />

            <TimerRow
                title="Samples"
                blockClassName="samples"
                time={samplesTime}
                isDue={dueTimers.includes('samples')}
                isNext={false}
                ampm={samplesAM}
                onOpen={() => openModal('samples', samplesTime)}
                onRefresh={() => nextTest(120, samplesTime, noopSetTime, 'samples', () => samplesAM)}
                refreshTitle="+120"
                hideIndicators
            />

            <div className="samples-extra-row">
                <ExtraSample />
            </div>

        </div>
    );
};

export default TimerView;