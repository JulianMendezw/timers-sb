import React from 'react';
import TimerView from './TimerView';
import { useTimers } from './useTimers';

const TimerContainer: React.FC = () => {
    const hook = useTimers();

    return <TimerView {...hook} />;
};

export default TimerContainer;