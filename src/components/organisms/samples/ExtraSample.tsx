import React from 'react';
import './ExtraSample.scss';
import ProductSummary from '../../molecules/productSummary/ProductSummary';
import ActiveProductControls from '../../molecules/activeProductControls/ActiveProductControls';
import ProductSuggestionItem from '../../molecules/productSuggestionItem/ProductSuggestionItem';
import { formatMainLine, useExtraSample } from './useExtraSample';

const highlightMatch = (text?: string, q?: string) => {
  if (!text || !q) return text ?? '';
  const raw = q.trim().toLowerCase();
  if (!raw) return text;
  const idx = text.toLowerCase().indexOf(raw);
  if (idx === -1) return text;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + raw.length);
  const after = text.slice(idx + raw.length);
  return (
    <>
      {before}
      <span className="match">{match}</span>
      {after}
    </>
  );
};

const ExtraSample: React.FC = () => {
  const {
    products,
    query,
    fetchInfo,
    focusedIndex,
    saveInfo,
    activeIds,
    availability,
    draggedId,
    dragOverId,
    selectedHour,
    saving,
    extraId,
    visibleSuggestions,
    formattedLastSample,
    setSelectedHour,
    handleInputKeyDown,
    saveSampleRecord,
    toggleAvailability,
    handleDragStart,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    handleSearchChange,
    handleSearchFocus,
    handleSearchBlur,
    handleSuggestionSelect,
    handleSuggestionToggleActive,
    handleSetExtraFromActive,
    handleRemoveActive,
  } = useExtraSample();

  return (
    <aside className="extra-sample-box">
      <div className="extra-sample-header">
        <h3>Products</h3>
      </div>

      <div className="active-products">
        <div className="active-products-header">
          <div className="search-wrap">
            <input
              aria-label="Search active products"
              placeholder="Search product name or item..."
              value={query}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              onKeyDown={handleInputKeyDown}
              autoComplete="off"
            />

            {fetchInfo && <div className="fetch-info muted">{fetchInfo}</div>}

            {visibleSuggestions.length > 0 && (
              <ul className="suggestions-dropdown" role="listbox">
                {visibleSuggestions.map((p, idx) => {
                  const key = p.item_number ?? p.id;
                  const isActive = activeIds.includes(key);
                  const mainLine = formatMainLine(p) || (p.product_name ?? p.name ?? '');

                  return (
                    <ProductSuggestionItem
                      key={p.id}
                      id={String(p.id)}
                      product={p}
                      main={highlightMatch(mainLine, query)}
                      isFocused={idx === focusedIndex}
                      isSelected={extraId === p.id}
                      isActive={isActive}
                      onSelect={() => handleSuggestionSelect(p)}
                      onToggleActive={() => handleSuggestionToggleActive(p, isActive)}
                    />
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="active-help muted">Mark availability for grabbing an extra; unavailable products will be skipped.</div>
        {activeIds.length === 0 && <p className="muted">No active products selected.</p>}

        <div className="active-list">
          {activeIds.map((id) => {
            const p = products.find((x) => x.id === id || x.item_number === id);
            if (!p) return null;

            const isAvailable = availability[id] !== false;
            const isSelectedExtra = extraId === p.id;
            const isDragged = draggedId === id;
            const isDragOver = dragOverId === id;

            return (
              <div
                key={id}
                draggable
                onDragStart={() => handleDragStart(id)}
                onDragOver={handleDragOver}
                onDragEnter={() => handleDragEnter(id)}
                onDragLeave={handleDragLeave}
                onDrop={() => {
                  void handleDrop(id);
                }}
                onDragEnd={handleDragEnd}
                className={`active-item ${isSelectedExtra ? 'selected' : ''} ${isDragged ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
              >
                <div>
                  <ProductSummary product={p} main={formatMainLine(p) || (p.product_name ?? p.name)} />
                </div>

                <ActiveProductControls
                  isSelectedExtra={isSelectedExtra}
                  isAvailable={isAvailable}
                  onSetExtra={() => handleSetExtraFromActive(p, isSelectedExtra, isAvailable)}
                  onToggleAvailability={() => {
                    void toggleAvailability(id);
                  }}
                  onRemove={() => handleRemoveActive(id)}
                />
              </div>
            );
          })}
        </div>

        <div className="next-extra">
          <div className="hour-picker-row">
            <div className="hour-picker-section">
              <label htmlFor="hour-select" className="hour-picker-label">Sample Hour (24h):</label>
              <select
                id="hour-select"
                className="hour-picker-select"
                value={selectedHour}
                onChange={(e) => setSelectedHour(parseInt(e.target.value, 10))}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </div>

            <button type="button" className="take-sample" onClick={() => void saveSampleRecord()} disabled={saving}>
              {saving ? 'Saving…' : 'Take Sample Now'}
            </button>
          </div>

          {saveInfo && <div className="save-info muted">{saveInfo}</div>}
          <div className="save-info muted">{formattedLastSample}</div>
        </div>
      </div>
    </aside>
  );
};

export default ExtraSample;
