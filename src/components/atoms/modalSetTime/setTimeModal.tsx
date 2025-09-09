import React, { useEffect, useRef, useState } from 'react';
import './SetTimeModal.scss';
import TimePicker from 'react-time-picker';
import 'react-time-picker/dist/TimePicker.css';
import 'react-clock/dist/Clock.css';

interface TimeModalProps {
  name: 'kernel' | 'evals' | 'md' | 'samples' | null;
  isOpen: boolean;
  initialTime: string;                 // valor inicial al abrir
  onSave: (value: string) => void;     // confirmar y devolver el valor
  onCancel: () => void;                // cancelar sin modificar el padre
}

const TimeModal: React.FC<TimeModalProps> = ({ name, isOpen, initialTime, onSave, onCancel }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [local, setLocal] = useState<string>(initialTime ?? '');

  // Resetear el valor local cada vez que abrimos o cambia el initialTime
  useEffect(() => {
    if (isOpen) setLocal(initialTime ?? '');
  }, [isOpen, initialTime]);

  const handleSubmit = () => {
    if (local && /^\d{1,2}:\d{2}$/.test(local)) onSave(local);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') onCancel();
  };

  useEffect(() => {
    const modalEl = modalRef.current;
    if (modalEl) {
      modalEl.addEventListener('keydown', handleKeyDown as any);
      modalEl.focus();
    }
    return () => {
      modalEl?.removeEventListener('keydown', handleKeyDown as any);
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="overlay">
      <div className="modal" ref={modalRef} tabIndex={-1}>
        <h2>{name === 'md' ? 'METAL AND GRIND' : name?.toUpperCase()}</h2>
        <p>Select Time</p>

        <TimePicker
          onChange={(value) => {
            if (value !== null) setLocal(String(value));
          }}
          value={local}
          disableClock={true}
          format="HH:mm"          // Mantén 24h aquí si no quieres manejar AM/PM del picker
          clearIcon={null}
        />

        <div className="buttons">
          <button
            onClick={handleSubmit}
            disabled={!local || !/^\d{1,2}:\d{2}$/.test(local)}
          >
            Set
          </button>
          <button onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default TimeModal;
