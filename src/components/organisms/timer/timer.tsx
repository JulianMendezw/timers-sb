import React from 'react';
import TimerView from './TimerView';
import { useTimers } from './useTimers';

const TimerContainer: React.FC = () => {
    const hook = useTimers();

    // Dummy setters (values are updated via hook's saveFromModal/nextTest)
    const setKernelTime = (_v: string) => { };
    const setEvalsTime = (_v: string) => { };
    const setMdTime = (_v: string) => { };
    const setSamplesTime = (_v: string) => { };
    const setKernelAM = (_v: boolean) => { };
    const setEvalsAM = (_v: boolean) => { };
    const setMdAM = (_v: boolean) => { };
    const setSamplesAM = (_v: boolean) => { };

    return (
        <TimerView
            {...hook}
            setKernelTime={setKernelTime}
            setEvalsTime={setEvalsTime}
            setMdTime={setMdTime}
            setSamplesTime={setSamplesTime}
            setKernelAM={setKernelAM}
            setEvalsAM={setEvalsAM}
            setMdAM={setMdAM}
            setSamplesAM={setSamplesAM}
        />
    );
};

export default TimerContainer;