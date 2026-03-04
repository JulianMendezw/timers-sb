import React from 'react';
import ProductSummary, { type ProductSummaryData } from '../productSummary/ProductSummary';
import './ProductSuggestionItem.scss';

type ProductSuggestionItemProps = {
  id: string;
  product: ProductSummaryData;
  main: React.ReactNode;
  isFocused: boolean;
  isSelected: boolean;
  isActive: boolean;
  onSelect: () => void;
  onToggleActive: () => void;
};

const ProductSuggestionItem: React.FC<ProductSuggestionItemProps> = ({
  id,
  product,
  main,
  isFocused,
  isSelected,
  isActive,
  onSelect,
  onToggleActive,
}) => {
  return (
    <li key={id} className={`suggestion-item ${isFocused ? 'focused' : ''}`} role="option">
      <button
        type="button"
        className={`suggestion-main ${isSelected ? 'selected' : ''}`}
        onMouseDown={(ev) => ev.preventDefault()}
        onClick={onSelect}
      >
        <ProductSummary product={product} main={main} />
      </button>
      <button
        type="button"
        className={`suggestion-add ${isActive ? 'active' : ''}`}
        onMouseDown={(ev) => ev.preventDefault()}
        onClick={onToggleActive}
      >
        {isActive ? 'Active' : 'Add'}
      </button>
    </li>
  );
};

export default ProductSuggestionItem;
