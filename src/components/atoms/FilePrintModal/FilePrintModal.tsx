import React, { useEffect, useRef, useState } from 'react';
import './FilePrintModal.scss';
import { supabase } from '../../../lib/supabaseClient';
import { useWorkDay, formatWorkDateYYMMDD, formatWorkDateMMYearNext } from '../../../hooks/useWorkDay';

type Props = {
  bucket: string;
  userId: string;
  fileName: string;
  onClose: () => void;
};

const FilePrintModal: React.FC<Props> = ({ bucket, userId, fileName, onClose }) => {
  const previewRef = useRef<HTMLIFrameElement | null>(null);
  const workDate = useWorkDay();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [htmlContent, setHtmlContent] = useState('');
  const [lotCode, setLotCode] = useState(() => formatWorkDateYYMMDD(workDate));
  const [bestBy, setBestBy] = useState(() => formatWorkDateMMYearNext(workDate));

  // Load HTML template on mount
  useEffect(() => {
    let cancelled = false;
    const loadTemplate = async () => {
      setLoading(true);
      setError(null);
      try {
        const filePath = `${userId}/${fileName}`;
        const { data, error } = await supabase.storage.from(bucket).download(filePath);
        if (error) throw error;
        const text = await data.text();
        if (!cancelled) setHtmlContent(text);
      } catch (err: any) {
        console.error('Template load error', err);
        if (!cancelled) setError(err.message ?? String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadTemplate();
    return () => { cancelled = true; };
  }, [bucket, userId, fileName]);

  // Update preview whenever values change
  useEffect(() => {
    if (previewRef.current && htmlContent) {
      let html = htmlContent
        .replace(/\{\{lot_code\}\}/g, lotCode)
        .replace(/\{\{best_by\}\}/g, bestBy);
      const doc = previewRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
      }
    }
  }, [htmlContent, lotCode, bestBy]);

  const handlePrint = () => {
    if (previewRef.current && previewRef.current.contentWindow) {
      previewRef.current.contentWindow.focus();
      previewRef.current.contentWindow.print();
    }
  };

  return (
    <div className="file-print-modal" role="dialog" aria-modal="true">
      <div className="file-print-modal__backdrop" onClick={onClose} />
      <div className="file-print-modal__panel">
        <header className="file-print-modal__header">
          <h3>{fileName.split('-')[1] ?? fileName}</h3>
          <button className="close" onClick={onClose}>×</button>
        </header>

        <div className="file-print-modal__body">
          <aside className="file-print-modal__controls">
            <div className="section">
              <h4>Text Values</h4>
              <label>
                Lot code
                <input value={lotCode} onChange={(e) => setLotCode(e.target.value)} />
              </label>
              <label>
                Best by
                <input value={bestBy} onChange={(e) => setBestBy(e.target.value)} />
              </label>
            </div>

            <div className="actions">
              <button onClick={handlePrint} className="btn primary" disabled={loading}>Print</button>
              <button onClick={onClose} className="btn">Close</button>
            </div>
            {loading && <div className="muted">Loading template…</div>}
            {error && <div className="error">{error}</div>}
          </aside>

          <iframe
            className="file-print-modal__preview"
            ref={previewRef}
            title="Preview"
            style={{ width: '100%', height: '500px', border: '1px solid #ccc', background: '#fff' }}
          />
        </div>
      </div>
    </div>
  );
};

export default FilePrintModal;
