import React from 'react';
import { IoAlarmOutline, IoRefresh } from 'react-icons/io5';
import { MdKeyboardArrowLeft, MdKeyboardArrowRight } from 'react-icons/md';
import './TimerRow.scss';

type TimerRowProps = {
  title: string;
  blockClassName: string;
  time: string;
  isDue: boolean;
  isNext: boolean;
  ampm?: boolean | null;
  onOpen: () => void;
  onRefresh: () => void;
  refreshTitle: string;
  hideIndicators?: boolean;
};

const TimerRow: React.FC<TimerRowProps> = ({
  title,
  blockClassName,
  time,
  isDue,
  isNext,
  ampm,
  onOpen,
  onRefresh,
  refreshTitle,
  hideIndicators = false,
}) => {
  const [hours, minutes] = (time || '00:00').split(':');
  const indicatorVisibility = hideIndicators ? 'hidden' : isNext ? 'visible' : 'hidden';

  return (
    <section className={`timer-block ${blockClassName}`}>
      <h2>{title}:</h2>
      <div className="time-display">
        <MdKeyboardArrowRight style={{ visibility: indicatorVisibility }} />
        <p className={`animated-time ${isDue ? 'highlight-red' : ''}`}>
          {hours}
          <span className="blinking-colon">:</span>
          {minutes}
          {ampm != null && <sup className="ampm-badge">{ampm ? 'AM' : 'PM'}</sup>}
        </p>
        <MdKeyboardArrowLeft style={{ visibility: indicatorVisibility }} />
      </div>
      <div className="timer-actions">
        <button onClick={onOpen}>
          <IoAlarmOutline />
        </button>
        <button onClick={onRefresh} title={refreshTitle}>
          <IoRefresh />
        </button>
      </div>
    </section>
  );
};

export default TimerRow;
