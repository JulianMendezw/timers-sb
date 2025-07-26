import React, { useEffect, useState } from 'react';
import { CiAlarmOn, CiRedo } from "react-icons/ci";
import { MdKeyboardArrowLeft, MdKeyboardArrowRight } from "react-icons/md";
import './timer.scss';
import TimeModal from '../atoms/modalSetTime/setTimeModal';

const Timer: React.FC = () => {

    const [time, setTime] = useState('00:00');
    const [mdTime, setMdTime] = React.useState('00:00');
    const [evalsTime, setEvalsTime] = React.useState('00:00');
    const [samplesTime, setSamplesTime] = React.useState('00:00');
    const [kernelTime, setKernelTime] = React.useState('00:00');
    const [modalIsOpen, setModalIsOpen] = React.useState(false);
    const [nextDisplayTime, setNextDisplayTime] = useState<{ label: string; time: string } | null>(null);
    const [activeTimer, setActiveTimer] = useState<'kernel' | 'evals' | 'md' | 'samples' | null>(null);


    const onModalClose = () => {
        if (activeTimer === 'kernel') setKernelTime(time);
        else if (activeTimer === 'evals') setEvalsTime(time);
        else if (activeTimer === 'md') setMdTime(time);
        else if (activeTimer === 'samples') setSamplesTime(time);

        setActiveTimer(null);
        setModalIsOpen(false);
    };

    const nextTest = (
        minutesToAdd: number,
        currentTime: string,
        setNextTime: React.Dispatch<React.SetStateAction<string>>
    ) => {
        const [hourStr, minuteStr] = currentTime.split(':');
        let hour = parseInt(hourStr, 10);
        let minute = parseInt(minuteStr, 10);

        // Add total minutes
        const totalMinutes = hour * 60 + minute + minutesToAdd;

        // Calculate new hour and minute
        let newHour = Math.floor(totalMinutes / 60);
        let newMinute = totalMinutes % 60;

        // Convert to 12-hour format
        newHour = newHour % 12;
        if (newHour === 0) newHour = 12;

        const formattedTime = `${newHour.toString().padStart(2, '0')}:${newMinute
            .toString()
            .padStart(2, '0')}`;

        setNextTime(formattedTime);
    };
    const timeSplited = (time: string) => {
        const [hours, minutes] = time.split(':');
        return (
            <p className="animated-time">
                {hours}
                <span className="blinking-colon">:</span>
                {minutes}
            </p>
        );
    };

    useEffect(() => {
        const getNextTimeWithPriority = () => {
            const times = [
                { label: 'kernel', time: kernelTime },
                { label: 'evals', time: evalsTime },
                { label: 'md', time: mdTime }
            ];

            const toMinutes = (time: string) => {
                const [hourStr, minuteStr] = time.split(':');
                return parseInt(hourStr, 10) * 60 + parseInt(minuteStr, 10);
            };

            const sortedTimes = times.sort((a, b) => {
                const aMinutes = toMinutes(a.time);
                const bMinutes = toMinutes(b.time);

                if (aMinutes === bMinutes) {
                    if (a.label === 'md') return -1;
                    if (b.label === 'md') return 1;
                }

                return aMinutes - bMinutes;
            });

            setNextDisplayTime(sortedTimes[0]);
        };

        getNextTimeWithPriority();
    }, [kernelTime, evalsTime, mdTime]);

    return <div>
        <div className="timer-controls">
            {nextDisplayTime && (
                <div className="next-time-display">
                    <h3>Next Scheduled Test:</h3>
                    <p>{nextDisplayTime.label}: {nextDisplayTime.time}</p>
                </div>
            )}
            <TimeModal isOpen={modalIsOpen} onClose={() => onModalClose()} setTime={setTime} time={time} />
            <div className="kernel">
                <h2>Kernel:</h2>
                <div className="time-display">
                    <MdKeyboardArrowRight
                        style={{ visibility: nextDisplayTime?.label === "kernel" ? "visible" : "hidden" }}
                    />
                    {timeSplited(kernelTime)}
                    <MdKeyboardArrowLeft
                        style={{ visibility: nextDisplayTime?.label === "kernel" ? "visible" : "hidden" }}
                    />
                </div>
                <button onClick={() => { setActiveTimer('kernel'); setTime(kernelTime); setModalIsOpen(true); }}>
                    <CiAlarmOn />
                </button>
                <button onClick={() => nextTest(40, kernelTime, setKernelTime)}>
                    <CiRedo />
                </button>
            </div>

            <div className="evals">
                <h2>Evals:</h2>
                <div className="time-display">
                    <MdKeyboardArrowRight
                        style={{ visibility: nextDisplayTime?.label === "evals" ? "visible" : "hidden" }}
                    />
                    {timeSplited(evalsTime)}
                    <MdKeyboardArrowLeft
                        style={{ visibility: nextDisplayTime?.label === "evals" ? "visible" : "hidden" }}
                    />
                </div>
                <button onClick={() => { setActiveTimer('evals'); setTime(evalsTime); setModalIsOpen(true); }}>
                    <CiAlarmOn />
                </button>
                <button onClick={() => nextTest(50, evalsTime, setEvalsTime)}>
                    <CiRedo />
                </button>
            </div>

            <div className="metalDetector">
                <h2>Metal & Grind:</h2>
                <div className="time-display">
                    <MdKeyboardArrowRight
                        style={{ visibility: nextDisplayTime?.label === "md" ? "visible" : "hidden" }}
                    />
                    {timeSplited(mdTime)}
                    <MdKeyboardArrowLeft
                        style={{ visibility: nextDisplayTime?.label === "md" ? "visible" : "hidden" }}
                    />
                </div>
                <button onClick={() => { setActiveTimer('md'); setTime(mdTime); setModalIsOpen(true); }}>
                    <CiAlarmOn />
                </button>
                <button onClick={() => nextTest(110, mdTime, setMdTime)}>
                    <CiRedo />
                </button>
            </div>

            <div className="samples">
                <h2>Samples:</h2>
                <div className="time-display">
                    <MdKeyboardArrowRight
                        style={{ visibility: nextDisplayTime?.label === "samples" ? "visible" : "hidden" }}
                    />
                    {timeSplited(samplesTime)}
                    <MdKeyboardArrowLeft
                        style={{ visibility: nextDisplayTime?.label === "samples" ? "visible" : "hidden" }}
                    />
                </div>
                <button onClick={() => { setActiveTimer('samples'); setTime(samplesTime); setModalIsOpen(true); }}>
                    <CiAlarmOn />
                </button>
                <button onClick={() => nextTest(120, samplesTime, setSamplesTime)}>
                    <CiRedo />
                </button>
            </div>

        </div>
    </div>;
};

export default Timer;

