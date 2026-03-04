import React from 'react';
import './ProductSummary.scss';

export type ProductSummaryData = {
  line_number?: string | number;
  metal_detector?: string | boolean;
  country_code?: string;
  special_sampling_flag?: boolean;
  special_recipe_flag?: boolean;
  usda_flag?: boolean;
};

type ProductSummaryProps = {
  product: ProductSummaryData;
  main: React.ReactNode;
};

const normalizeCountryCode = (code?: string) => {
  if (!code) return null;
  const cleaned = String(code).trim().toUpperCase();
  if (['US', 'USA', 'UNITED STATES', 'UNITED STATES OF AMERICA'].includes(cleaned)) return 'US';
  if (['CA', 'CAN', 'CANADA'].includes(cleaned)) return 'CA';
  if (['MX', 'MEX', 'MEXICO'].includes(cleaned)) return 'MX';
  return null;
};

const CountryFlag: React.FC<{ code?: string }> = ({ code }) => {
  const normalized = normalizeCountryCode(code);
  if (normalized === 'US') {
    return (
      <span className="meta-flag" title="USA" aria-label="USA">
        <svg viewBox="0 0 18 12" aria-hidden>
          <rect width="18" height="12" fill="#b22234" />
          <rect y="2" width="18" height="2" fill="#ffffff" />
          <rect y="6" width="18" height="2" fill="#ffffff" />
          <rect y="10" width="18" height="2" fill="#ffffff" />
          <rect width="7" height="6" fill="#3c3b6e" />
        </svg>
      </span>
    );
  }
  if (normalized === 'CA') {
    return (
      <span className="meta-flag" title="Canada" aria-label="Canada">
        <svg viewBox="0 0 18 12" aria-hidden>
          <rect width="18" height="12" fill="#ffffff" />
          <rect width="4" height="12" fill="#d52b1e" />
          <rect x="14" width="4" height="12" fill="#d52b1e" />
          <polygon points="9,3 10,6 9,9 8,6" fill="#d52b1e" />
        </svg>
      </span>
    );
  }
  if (normalized === 'MX') {
    return (
      <span className="meta-flag" title="Mexico" aria-label="Mexico">
        <svg viewBox="0 0 18 12" aria-hidden>
          <rect width="18" height="12" fill="#ffffff" />
          <rect width="6" height="12" fill="#006847" />
          <rect x="12" width="6" height="12" fill="#ce1126" />
          <circle cx="9" cy="6" r="1.5" fill="#c2a500" />
        </svg>
      </span>
    );
  }
  return null;
};

const ProductSummary: React.FC<ProductSummaryProps> = ({ product, main }) => {
  const metalLabel = typeof product.metal_detector === 'boolean'
    ? (product.metal_detector ? 'MD' : null)
    : (product.metal_detector ? `MD ${product.metal_detector}` : null);

  return (
    <>
      <div className="product-main">{main}</div>
      <div className="product-meta">
        {product.line_number !== null && product.line_number !== undefined && product.line_number !== '' && (
          <span className="meta-item">Line {product.line_number}</span>
        )}
        {metalLabel && <span className="meta-item">{metalLabel}</span>}
        <CountryFlag code={product.country_code} />
        {product.special_sampling_flag && (
          <span className="meta-item meta-icon jar-icon" title="Special sampling" aria-label="Special sampling">
            <svg className="icon-jar" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path d="M7 4h10v3H7z" fill="currentColor" />
              <path d="M8 7h8a2 2 0 0 1 2 2v9a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V9a2 2 0 0 1 2-2z" fill="currentColor" />
              <rect x="9" y="10" width="6" height="7" rx="1" fill="#7a4f1d" />
            </svg>
          </span>
        )}
        {product.special_recipe_flag && <span className="meta-item meta-recipe">Recipe</span>}
        {product.usda_flag && <span className="meta-item meta-usda" title="USDA pricing">USDA</span>}
      </div>
    </>
  );
};

export default ProductSummary;
