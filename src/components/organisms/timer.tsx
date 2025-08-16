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
        if (activeTimer === 'kernel') {
            setKernelTime(time);
            setDueTimers(prev => prev.filter(label => label !== 'kernel'));
        } else if (activeTimer === 'evals') {
            setEvalsTime(time);
            setDueTimers(prev => prev.filter(label => label !== 'evals'));
        } else if (activeTimer === 'md') {
            setMdTime(time);
            setDueTimers(prev => prev.filter(label => label !== 'md'));
        } else if (activeTimer === 'samples') {
            setSamplesTime(time);
            setDueTimers(prev => prev.filter(label => label !== 'samples'));
        }

        setActiveTimer(null);
        setModalIsOpen(false);
    };


    const nextTest = (
        minutesToAdd: number,
        currentTime: string,
        setNextTime: React.Dispatch<React.SetStateAction<string>>,
        label: 'kernel' | 'evals' | 'md' | 'samples'
    ) => {
        const [hourStr, minuteStr] = currentTime.split(':');
        let hour = parseInt(hourStr, 10);
        let minute = parseInt(minuteStr, 10);

        const totalMinutes = hour * 60 + minute + minutesToAdd;
        let newHour = Math.floor(totalMinutes / 60);
        let newMinute = totalMinutes % 60;

        newHour = newHour % 12;
        if (newHour === 0) newHour = 12;

        const formattedTime = `${newHour.toString().padStart(2, '0')}:${newMinute
            .toString()
            .padStart(2, '0')}`;

        setNextTime(formattedTime);

        // Remove from dueTimers
        setDueTimers(prev => prev.filter(item => item !== label));
    };

    const timeSplited = (time: string, highlight: boolean = false) => {
        const [hours, minutes] = time.split(':');
        return (
            <p className={`animated-time ${highlight ? 'highlight-red' : ''}`}>
                {hours}
                <span className="blinking-colon">:</span>
                {minutes}
            </p>
        );
    };


    const [dueTimers, setDueTimers] = useState<string[]>([]);

    useEffect(() => {
        const checkDueTimers = () => {
            const now = new Date();
            const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

            setDueTimers(prev => {
                const newDue = [...prev];

                if (kernelTime === currentTime && !prev.includes('kernel')) newDue.push('kernel');
                if (evalsTime === currentTime && !prev.includes('evals')) newDue.push('evals');
                if (mdTime === currentTime && !prev.includes('md')) newDue.push('md');
                if (samplesTime === currentTime && !prev.includes('samples')) newDue.push('samples');

                return newDue;
            });
        };

        checkDueTimers();
        const interval = setInterval(checkDueTimers, 60000);
        return () => clearInterval(interval);
    }, [kernelTime, evalsTime, mdTime, samplesTime]);



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
            <TimeModal isOpen={modalIsOpen} onClose={() => onModalClose()} setTime={setTime} time={time} />
            <div className="kernel">
                <h2>Kernel:</h2>
                <div className="time-display">
                    <MdKeyboardArrowRight
                        style={{ visibility: nextDisplayTime?.label === "kernel" ? "visible" : "hidden" }}
                    />
                    {timeSplited(kernelTime, dueTimers.includes('kernel'))}
                    <MdKeyboardArrowLeft
                        style={{ visibility: nextDisplayTime?.label === "kernel" ? "visible" : "hidden" }}
                    />
                </div>
                <button onClick={() => { setActiveTimer('kernel'); setTime(kernelTime); setModalIsOpen(true); }}>
                    <CiAlarmOn />
                </button>

                <button onClick={() => nextTest(40, kernelTime, setKernelTime, 'kernel')}>

                    <CiRedo />
                </button>
            </div>

            <div className="evals">
                <h2>Evals:</h2>
                <div className="time-display">
                    <MdKeyboardArrowRight
                        style={{ visibility: nextDisplayTime?.label === "evals" ? "visible" : "hidden" }}
                    />
                    {timeSplited(evalsTime, dueTimers.includes('evals'))}

                    <MdKeyboardArrowLeft
                        style={{ visibility: nextDisplayTime?.label === "evals" ? "visible" : "hidden" }}
                    />
                </div>
                <button onClick={() => { setActiveTimer('evals'); setTime(evalsTime); setModalIsOpen(true); }}>
                    <CiAlarmOn />
                </button>
                <button onClick={() => nextTest(50, evalsTime, setEvalsTime, 'evals')}>

                    <CiRedo />
                </button>
            </div>

            <div className="metalDetector">
                <h2>Metal & Grind:</h2>
                <div className="time-display">
                    <MdKeyboardArrowRight
                        style={{ visibility: nextDisplayTime?.label === "md" ? "visible" : "hidden" }}
                    />
                    {timeSplited(mdTime, dueTimers.includes('md'))}
                    <MdKeyboardArrowLeft
                        style={{ visibility: nextDisplayTime?.label === "md" ? "visible" : "hidden" }}
                    />
                </div>
                <button onClick={() => { setActiveTimer('md'); setTime(mdTime); setModalIsOpen(true); }}>
                    <CiAlarmOn />
                </button>
                <button onClick={() => nextTest(110, mdTime, setMdTime, 'md')}>

                    <CiRedo />
                </button>
            </div>

            <div className="samples">
                <h2>Samples:</h2>
                <div className="time-display">
                    <MdKeyboardArrowRight
                        style={{ visibility: nextDisplayTime?.label === "samples" ? "visible" : "hidden" }}
                    />
                    {timeSplited(samplesTime, dueTimers.includes('samples'))}

                    <MdKeyboardArrowLeft
                        style={{ visibility: nextDisplayTime?.label === "samples" ? "visible" : "hidden" }}
                    />
                </div>
                <button onClick={() => { setActiveTimer('samples'); setTime(samplesTime); setModalIsOpen(true); }}>
                    <CiAlarmOn />
                </button>
                <button onClick={() => nextTest(120, samplesTime, setSamplesTime, 'samples')}>
                    <CiRedo />
                </button>
            </div>

        </div>
    </div>;
};

export default Timer;
