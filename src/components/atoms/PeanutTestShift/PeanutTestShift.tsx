import React from 'react';
import './PeanutTestShift.scss';
import { usePeanutWeekShift } from '../../../hooks/usePeanutWeekShift';

export const PeanutTestShift: React.FC = () => {
  const { loading, error, shift } = usePeanutWeekShift();

  return (
    <section className="peanut-card" aria-live="polite">
      <div className="peanut-card__body">
        <div className="peanut-card__title">Peanut test</div>

        {loading && <div className="peanut-card__status">Loading…</div>}
        {error && !loading && <div className="peanut-card__status peanut-card__status--error">Error</div>}

        {!loading && !error && (
          <div className="peanut-card__value">
            {shift ?? <span className="peanut-card__none">No shift scheduled</span>}
          </div>
        )}
      </div>
    </section>
  );
};

export default PeanutTestShift;
