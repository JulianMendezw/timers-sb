import React from 'react';
import { IoRemoveCircleOutline } from 'react-icons/io5';
import './ActiveProductControls.scss';

type ActiveProductControlsProps = {
  isSelectedExtra: boolean;
  isAvailable: boolean;
  onSetExtra: () => void;
  onToggleAvailability: () => void;
  onRemove: () => void;
};

const ActiveProductControls: React.FC<ActiveProductControlsProps> = ({
  isSelectedExtra,
  isAvailable,
  onSetExtra,
  onToggleAvailability,
  onRemove,
}) => {
  return (
    <div className="active-controls">
      <button
        type="button"
        className={`set-extra ${isSelectedExtra ? 'selected' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onSetExtra();
        }}
        disabled={isSelectedExtra}
        aria-pressed={isSelectedExtra}
        title={isSelectedExtra ? 'Current extra' : 'Set as extra'}
      >
        {isSelectedExtra ? 'Extra' : 'Set'}
      </button>
      <button
        type="button"
        className={`availability ${isAvailable ? 'available' : 'unavailable'}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleAvailability();
        }}
        aria-pressed={isAvailable}
        title={isAvailable ? 'Mark unavailable' : 'Mark available'}
      >
        {isAvailable ? (
          <svg className="icon-available" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M9 12.5l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        ) : (
          <svg className="icon-unavailable" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M15 9L9 15M9 9l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        )}
      </button>

      <button
        type="button"
        className="remove"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label="Remove active product"
        title="Remove"
      >
        <IoRemoveCircleOutline className="icon-remove" aria-hidden />
      </button>
    </div>
  );
};

export default ActiveProductControls;
