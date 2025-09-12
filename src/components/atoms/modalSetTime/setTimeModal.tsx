import React, { useCallback, useEffect, useRef, useState } from 'react';
import TimePicker from 'react-time-picker';
import 'react-time-picker/dist/TimePicker.css';
import 'react-clock/dist/Clock.css';
import './SetTimeModal.scss';

type Label = 'kernel' | 'evals' | 'md' | 'samples' | null;

interface TimeModalProps {
  name: Label;
  isOpen: boolean;
  initialTime: string;
  onSave: (value: string) => void;
  onCancel: () => void;
}

const TimeModal: React.FC<TimeModalProps> = ({
  name,
  isOpen,
  initialTime,
  onSave,
  onCancel,
}) => {
  const [local, setLocal] = useState<string>(initialTime ?? '');
  const overlayRef = useRef<HTMLDivElement>(null);

  // Reset local value each time the modal opens or initialTime changes
  useEffect(() => {
    if (isOpen) setLocal(initialTime ?? '');
  }, [isOpen, initialTime]);

  const handleSubmit = useCallback(() => {
    if (local && /^\d{1,2}:\d{2}$/.test(local)) {
      onSave(local);
    }
  }, [local, onSave]);

  // Robust ESC + Enter handling: document listener in capture phase
  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    };

    document.addEventListener('keydown', onKey, true);  // capture
    return () => document.removeEventListener('keydown', onKey, true);
  }, [isOpen, onCancel, handleSubmit]);

  // Autofocus fallback: after mount, focus/select the first TimePicker input
  useEffect(() => {
    if (!isOpen) return;
    const id = requestAnimationFrame(() => {
      const input = overlayRef.current?.querySelector<HTMLInputElement>(
        '.react-time-picker__inputGroup input:not([disabled])'
      );
      input?.focus();
      input?.select?.();
    });
    return () => cancelAnimationFrame(id);
  }, [isOpen]);

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onCancel();
  };

  if (!isOpen) return null;

  return (
    <div
      className="stm-overlay"
      ref={overlayRef}
      onMouseDown={handleBackdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="stm-title"
    >
      <div className="stm-modal" role="document">
        <h2 id="stm-title" className="stm-title">
          {name === 'md' ? 'METAL & GRIND' : (name ?? '').toUpperCase()}
        </h2>

        <label className="stm-label" htmlFor="stm-time-input">
          Select Time
        </label>

        <div className="stm-picker">
          <TimePicker
            id="stm-time-input"
            autoFocus                 // ✅ no JSX block comment here
            value={local}
            onChange={(value) => {
              if (value !== null) setLocal(String(value));
            }}
            disableClock={true}
            format="HH:mm"
            clearIcon={null}
            clockIcon={null}
          />
        </div>

        <div className="stm-buttons">
          <button type="button" className="btn btn--primary" onClick={handleSubmit}>
            Set
          </button>
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimeModal;
