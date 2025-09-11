import React from 'react';
import './PeanutTestShift.scss';
import { usePeanutWeekShift } from '../../../hooks/usePeanutWeekShift';

// const fmtLong = (iso: string) => {
//   const [y, m, d] = iso.split('-').map(Number);
//   const dt = new Date(y, m - 1, d);
//   return new Intl.DateTimeFormat(undefined, {
//     month: 'long', day: 'numeric', year: 'numeric'
//   }).format(dt);
// };

export const PeanutTestShift: React.FC = () => {
  const { loading, error, shift } = usePeanutWeekShift();

  return (
    <section className="peanut-shift" aria-live="polite">
      <h2 className="peanut-shift__title">Peanut test</h2>

      {loading && <p className="peanut-shift__status">Loading shift…</p>}
      {error && !loading && <p className="peanut-shift__status peanut-shift__status--error">Error: {error}</p>}

      {!loading && !error && (
        <>
          <p className="peanut-shift__subtitle">
            {/* Week of <strong>{fmtLong(weekMondayISO)}</strong> */}
          </p>
          <p className="peanut-shift__line">
            <span className="peanut-shift__label">Shift:</span>{' '}
            <span className={`peanut-shift__value ${shift ? 'peanut-shift__value--ok' : 'peanut-shift__value--none'}`}>
              {shift ?? 'No shift scheduled'}
            </span>
          </p>
        </>
      )}
    </section>
  );
};

export default PeanutTestShift;
