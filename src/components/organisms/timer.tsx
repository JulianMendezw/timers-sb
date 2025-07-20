import React, { useState } from 'react';
import { CiAlarmOn, CiRedo } from "react-icons/ci";
import './timer.scss';
import TimeModal from '../atoms/modalSetTime/setTimeModal';

const Timer: React.FC = () => {

    const [time, setTime] = useState('00:00');
    const [mdTime, setMdTime] = React.useState('00:00');
    const [evalsTime, setEvalsTime] = React.useState('00:00');
    const [samplesTime, setSamplesTime] = React.useState('00:00');
    const [kernelTime, setKernelTime] = React.useState('00:00');
    const [modalIsOpen, setModalIsOpen] = React.useState(false);
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


    return <div>
        <div className="timer-controls">
            <TimeModal isOpen={modalIsOpen} onClose={() => onModalClose()} setTime={setTime} time={time} />
            <div className="kernel">
                <h2>Kernel:</h2>
                <p>{kernelTime}</p>
                <button onClick={() => {setActiveTimer('kernel'), setTime(kernelTime), setModalIsOpen(true) }} >
                    <CiAlarmOn />
                </button>
                <button onClick={() => nextTest(40, kernelTime, setKernelTime)}>
                    <CiRedo />
                </button>
            </div>
            <div className="evals">
                <h2>Evals:</h2>
                <p>{evalsTime}</p>
                <button onClick={() => { setActiveTimer('evals'), setTime(evalsTime), setModalIsOpen(true) }} >
                    <CiAlarmOn />
                </button>
                <button onClick={() => nextTest(50, evalsTime, setEvalsTime)}>
                    <CiRedo />
                </button>
            </div>
            <div className="metalDetector">
                <h2>Metal & Grind:</h2>
                <p>{mdTime}</p>
                <button onClick={() => {setActiveTimer('md'), setTime(mdTime), setModalIsOpen(true) }} >
                    <CiAlarmOn />
                </button>
                <button onClick={() => nextTest(110, mdTime, setMdTime)}>
                    <CiRedo />
                </button>
            </div>
            <div className="samples">
                <h2>Samples:</h2>
                <p>{samplesTime}</p>
                <button onClick={() => { setActiveTimer('samples'), setTime(samplesTime), setModalIsOpen(true) }} >
                    <CiAlarmOn />
                </button>
                <button onClick={() => nextTest(120, samplesTime, setSamplesTime)}>
                    <CiRedo />
                </button>
            </div>

        </div>
        {/* Timer functionality will be implemented here */}
    </div>;
};

export default Timer;

