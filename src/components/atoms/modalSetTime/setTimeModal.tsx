import React, { useEffect, useRef } from 'react';
import './SetTimeModal.scss';
import TimePicker from 'react-time-picker';
import 'react-time-picker/dist/TimePicker.css';
import 'react-clock/dist/Clock.css';


interface TimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  time: string;
  setTime: (time: string) => void;
}

const TimeModal: React.FC<TimeModalProps> = ({ isOpen, onClose, time, setTime }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  const handleSubmit = () => {
    onClose();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  useEffect(() => {
    const modalEl = modalRef.current;
    if (modalEl) {
      modalEl.addEventListener('keydown', handleKeyDown);
      modalEl.focus(); // to make sure it's focused
    }

    return () => {
      modalEl?.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!isOpen) return null;


  return (
    <div className={"overlay"}>
      <div className={"modal"} ref={modalRef} tabIndex={-1}>
        <h2>Select Time</h2>
        <TimePicker
          onChange={(value) => {
            if (value !== null) {
              setTime(value);
            }
          }}
          value={time}
          disableClock={true}
          format="HH:mm"
          clearIcon={null}
        />
        <div className={"buttons"}>
          <button onClick={handleSubmit}>Set</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default TimeModal;
