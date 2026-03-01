import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { insertSampleRecord } from '../../../lib/sampleRecordsClient';
import { fetchActiveProductIds, setActiveProduct, subscribeActiveProducts, setAvailability as setAvailabilityServer, fetchAvailabilityMap, subscribeAvailability, setProductOrder } from '../../../lib/activeProducts';
import { pickNextExtra, previewNextExtra, loadRotationState, saveRotationState, syncRotationToActiveOrder } from '../../../utils/sampleRotation';
import { stripItemNumberPrefix } from '../../../utils/itemNumber';
import { useProductionDay } from '../../../hooks/useProductionDay';
import { toast } from 'react-toastify';
import './ExtraSample.scss';
import { IoRemoveCircleOutline } from 'react-icons/io5';

type Product = {
  id: string;
  customer?: string | null;
  formula?: string | null;
  pack_count?: number | string | null;
  unit_size?: number | string | null;
  unit_size_uom?: string | null;
  container_1?: string | null;
  product_name?: string;
  name?: string;
  item_number?: string;
  is_active?: boolean;
  special_sampling_flag?: boolean;
  special_recipe_flag?: boolean;
  line_number?: string | number;
  metal_detector?: string | boolean;
  country_code?: string;
  usda_flag?: boolean;
};

const normalizeCountryCode = (code?: string) => {
  if (!code) return null;
  const cleaned = String(code).trim().toUpperCase();
  if (['US', 'USA', 'UNITED STATES', 'UNITED STATES OF AMERICA'].includes(cleaned)) return 'US';
  if (['CA', 'CAN', 'CANADA'].includes(cleaned)) return 'CA';
  if (['MX', 'MEX', 'MEXICO'].includes(cleaned)) return 'MX';
  return null;
};

const renderCountryFlag = (code?: string) => {
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

const formatPackSize = (packCountRaw?: number | string | null, unitSizeRaw?: number | string | null, unitSizeUom?: string | null) => {
  if (unitSizeRaw == null || unitSizeRaw === '') return null;
  const packCount = Number(packCountRaw);
  const unitSize = String(unitSizeRaw);
  const uomNormalized = unitSizeUom ? String(unitSizeUom).trim() : '';
  const uom = uomNormalized.toLowerCase() === 'lb' ? '#' : uomNormalized;
  const sizeText = uom === '#'
    ? `${unitSize}${uom}`
    : `${unitSize}${uom ? ` ${uom}` : ''}`;
  if (Number.isFinite(packCount) && packCount > 1) return `${packCount}x ${sizeText}`;
  return sizeText;
};

const formatMainLine = (p: Product) => {
  const packSize = formatPackSize(p.pack_count, p.unit_size, p.unit_size_uom);
  const parts = [stripItemNumberPrefix(p.item_number), p.customer, p.formula, p.container_1, packSize].filter(Boolean);
  return parts.join(' | ');
};

const ExtraSample: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [fetchInfo, setFetchInfo] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [inputFocused, setInputFocused] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveInfo, setSaveInfo] = useState<string | null>(null);
  const [extraId, setExtraId] = useState<string | null>(null);
  const [activeIds, setActiveIds] = useState<string[]>([]);
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [selectedHour, setSelectedHour] = useState<number>(new Date().getHours());
  const [debugActionFlags, setDebugActionFlags] = useState({
    dragReorder: false,
    manualExtraSet: false,
  });
  const { getSampledAt } = useProductionDay();
  const serverActiveLoaded = useRef(false);
  const prevActiveRef = useRef<string[]>([]);
  const rotationInitializedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    const STORAGE_KEY = 'finished_products_cache_v1';

    const load = async () => {

      // Try cache first (valid 24h)
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { ts: number; rows: any[] };
          if (Date.now() - parsed.ts < 24 * 60 * 60 * 1000) {
            const mappedCached: Product[] = parsed.rows.map((r: any) => ({
              id: r.item_id ?? r.id ?? r.product_id ?? String(Math.random()),
              customer: r.customer ?? null,
              formula: r.formula ?? r.formula_name ?? null,
              pack_count: r.pack_count ?? r.packCount ?? null,
              unit_size: r.unit_size ?? r.unitSize ?? null,
              unit_size_uom: r.unit_size_uom ?? r.unitSizeUom ?? null,
              container_1: r.container_1 ?? r.container ?? null,
              product_name: r.description ?? r.product_name ?? r.name ?? r.product ?? r.itemNumber ?? r.item_number,
              name: r.description ?? r.name ?? r.product_name ?? r.product,
              item_number: r.item_id ?? r.item_number ?? r.itemNumber ?? r.id ?? '',
              is_active: true,
              special_sampling_flag: !!r.special_sampling_flag,
              special_recipe_flag: !!r.special_recipe_flag,
              line_number: r.line_number ?? r.line ?? r.line_no ?? null,
              metal_detector: r.metal_detector ?? r.md ?? null,
              country_code: r.country_code ?? r.country ?? null,
              usda_flag: !!r.usda_flag,
            }));
            if (mounted) {
              setProducts(mappedCached);
              return;
            }
          }
        }
      } catch (e) {
        // ignore cache parse errors
      }

      const tryFetch = async (table: string) => {
        try {
          const { data, error } = await supabase.from(table).select('*');
          if (error) {
            console.warn('Supabase error fetching', table, error);
            setFetchInfo(`Error fetching ${table}: ${(error as any)?.message ?? String(error)}`);
            return null;
          }
          if (data && Array.isArray(data) && data.length > 0) return data as any[];
          console.info('No rows in', table);
          return null;
        } catch (e) {
          console.error('Unexpected fetch error', e);
          setFetchInfo(`Unexpected error fetching ${table}: ${String(e)}`);
        }
        return null;
      };

      const tables = ['finished_products', 'products', 'active_products', 'bulk_production_labels'];
      let rows: any[] | null = null;
      for (const t of tables) {
        // eslint-disable-next-line no-await-in-loop
        rows = await tryFetch(t);
        if (rows) break;
      }

      if (mounted) {
        const mapped: Product[] = (rows ?? []).map((r: any) => ({
          id: r.item_id ?? r.id ?? r.product_id ?? String(Math.random()),
          customer: r.customer ?? null,
          formula: r.formula ?? r.formula_name ?? null,
          pack_count: r.pack_count ?? r.packCount ?? null,
          unit_size: r.unit_size ?? r.unitSize ?? null,
          unit_size_uom: r.unit_size_uom ?? r.unitSizeUom ?? null,
          container_1: r.container_1 ?? r.container ?? null,
          product_name: r.description ?? r.product_name ?? r.name ?? r.product ?? r.itemNumber ?? r.item_number,
          name: r.description ?? r.name ?? r.product_name ?? r.product,
          item_number: r.item_id ?? r.item_number ?? r.itemNumber ?? r.id ?? '',
          is_active: true,
          special_sampling_flag: !!r.special_sampling_flag,
          special_recipe_flag: !!r.special_recipe_flag,
          line_number: r.line_number ?? r.line ?? r.line_no ?? null,
          metal_detector: r.metal_detector ?? r.md ?? null,
          country_code: r.country_code ?? r.country ?? null,
          usda_flag: !!r.usda_flag,
        }));
        setProducts(mapped);

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ ts: Date.now(), rows: rows ?? [] }));
        } catch (e) {
          // ignore storage errors
        }
        if (!rows || rows.length === 0) {
          setFetchInfo('No product rows found in configured tables. Check Supabase table or anon key permissions.');
        } else {
          setFetchInfo(null);
        }
      }
    };

    // restore selections from localStorage (quick local fallback)
    try {
      const aRaw = localStorage.getItem('samples_active_ids_v1');
      if (aRaw) setActiveIds(JSON.parse(aRaw));
      const eRaw = localStorage.getItem('samples_extra_id_v1');
      if (eRaw) setExtraId(eRaw);
      const availRaw = localStorage.getItem('samples_availability_v1');
      if (availRaw) setAvailability(JSON.parse(availRaw));
    } catch (e) {
      // ignore
    }

    // then refresh from server to keep in sync and subscribe for realtime updates
    (async () => {
      try {
        const serverActive = await fetchActiveProductIds();
        if (serverActive && serverActive.length > 0) {
          setActiveIds(serverActive);
          try {
            localStorage.setItem('samples_active_ids_v1', JSON.stringify(serverActive));
          } catch { }
        }
        // useEffect must not be called here; already handled at top level
      } catch (err) {
        console.warn('Could not fetch active products from server', err);
      }
    })().finally(() => {
      // mark that initial server sync has completed so subsequent active changes
      // (adds by the user or realtime updates) can trigger auto-selection logic
      serverActiveLoaded.current = true;
    });

    // fetch availability map from server and merge into local availability
    (async () => {
      try {
        const map = await fetchAvailabilityMap();
        if (map && Object.keys(map).length > 0) {
          setAvailability((prev) => ({ ...prev, ...map }));
          try {
            localStorage.setItem('samples_availability_v1', JSON.stringify({ ...availability, ...map }));
          } catch { }
        }
      } catch (e) {
        console.warn('Failed to fetch availability map', e);
      }
    })();

    const unsubscribe = subscribeActiveProducts((ids) => {
      setActiveIds(ids);
      try {
        localStorage.setItem('samples_active_ids_v1', JSON.stringify(ids));
      } catch { }
    });

    const unsubAvail = subscribeAvailability((patch) => {
      // patch may be a single-entry map; merge into availability
      setAvailability((prev) => ({ ...prev, ...patch }));
      try {
        localStorage.setItem('samples_availability_v1', JSON.stringify({ ...availability, ...patch }));
      } catch { }
    });

    load();
    return () => {
      mounted = false;
      // cleanup realtime subscription if present
      try {
        if (typeof unsubscribe === 'function') unsubscribe();
        if (typeof unsubAvail === 'function') unsubAvail();
      } catch {
        // ignore
      }
    };
  }, []);

  // debug helpers removed from UI

  // Show all products here; active marking happens in the next step after selection.
  const allProducts = useMemo(() => products, [products]);
  const filtered = useMemo(() => {
    const raw = query.trim().toLowerCase();
    const q = raw.replace(/\s+/g, '');
    if (!q) {
      // When not typing, no suggestions (Google-like)
      return [];
    }

    // Prefer item_number matches (normalize spaces/dashes) then name matches
    const itemMatches: Product[] = [];
    const nameMatches: Product[] = [];

    for (const p of allProducts) {
      const itemNorm = (p.item_number ?? '').toLowerCase().replace(/\s+/g, '');
      const nameNorm = (p.product_name ?? p.name ?? '').toLowerCase();
      if (itemNorm.includes(q)) itemMatches.push(p);
      else if (nameNorm.includes(raw)) nameMatches.push(p);
    }

    const combined = [...itemMatches, ...nameMatches];
    return combined.slice(0, 10);
  }, [query, allProducts]);

  const visibleSuggestions = showSuggestions && inputFocused && query.trim().length > 0 ? filtered : [];

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

  const onInputKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (visibleSuggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((i) => Math.min(i + 1, visibleSuggestions.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const sel = visibleSuggestions[focusedIndex >= 0 ? focusedIndex : 0];
      if (sel) {
        const dbKey = sel.item_number ?? sel.id;
        setExtraId((cur) => (cur === sel.id ? null : sel.id));
        // optimistic: add to active products and persist to server
        setActiveIds((cur) => (cur.includes(dbKey) ? cur : [...cur, dbKey]));
        try {
          setShowSuggestions(false);
          setInputFocused(false);
          await setActiveProduct(dbKey, true);
        } catch (err) {
          console.error('Failed persisting Enter selection', err);
          setSaveInfo('Server save failed');
          // revert optimistic add
          setActiveIds((cur) => cur.filter((id) => id !== dbKey));
        }
        setQuery(sel.product_name ?? sel.item_number ?? '');
      }
      return;
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false);
      setInputFocused(false);
      setFocusedIndex(-1);
    }
  };

  // Persist to server on demand
  const saveSampleRecord = async () => {
    setSaving(true);
    try {
      const activeProductsList = activeIds
        .map((id) => products.find((p) => p.id === id || p.item_number === id))
        .filter(Boolean)
        .map((p) => {
          if (p?.item_number) return stripItemNumberPrefix(p.item_number);
          return p?.product_name ?? p?.id ?? '';
        });

      // Always let the rotation algorithm pick the extra when taking a sample now
      const pick = pickNextExtra(activeIds, availability);
      let selectedExtraKey: string | null = pick.next ?? null;

      if (!selectedExtraKey) {
        // fallback: pick the first active product that is available (defensive)
        const fallback = activeIds.find((id) => availability[id] !== false) ?? null;
        if (fallback) {
          selectedExtraKey = fallback;
          // Update rotation state to mark fallback as completed so rotation stays consistent
          try {
            const st = loadRotationState();
            if (!st.completed.includes(fallback)) st.completed.push(fallback);
            st.pending = st.pending.filter((i) => i !== fallback);
            st.lastActiveSnapshot = activeIds;
            saveRotationState(st);
          } catch (e) {
            console.warn('Failed updating rotation state for fallback pick', e);
          }
        } else {
          toast.error('No eligible extra to pick');
          setSaving(false);
          return;
        }
      }

      // Ensure the UI highlights the picked product: find product by db key and set extraId to its internal id
      const pickedProduct = products.find((p) => p.id === selectedExtraKey || p.item_number === selectedExtraKey);
      if (pickedProduct) {
        setExtraId(pickedProduct.id);
      } else {
        // if we couldn't find a product record, still set the raw key so downstream persists correctly
        setExtraId(selectedExtraKey);
      }

      const extra = products.find((p) => p.id === selectedExtraKey || p.item_number === selectedExtraKey);

      const sampledAt = getSampledAt(selectedHour);

      const payload = {
        production_day_id: null,  // Database expects UUID, not date string
        hour_code: selectedHour,
        sampled_at: sampledAt,
        active_products: activeProductsList,
        extra_product: extra ? (extra.item_number ? stripItemNumberPrefix(extra.item_number) : (extra.product_name ?? extra.id)) : null,
        cycle_number: 0,
        notes: {
          debug_mode: 'rotation-test',
          predicted_extra: selectedExtraKey ? stripItemNumberPrefix(selectedExtraKey) : null,
          selected_extra: extra ? (extra.item_number ? stripItemNumberPrefix(extra.item_number) : (extra.product_name ?? extra.id)) : null,
          drag_reorder_since_last_sample: debugActionFlags.dragReorder,
          manual_set_extra_since_last_sample: debugActionFlags.manualExtraSet,
        },
      } as any;

      const result = await insertSampleRecord(payload);

      if (!result.ok) {
        console.error('Failed saving sample_records', { details: result.error });
        toast.error(`Save failed: ${result.error}`);
        return;
      }

      toast.success('Saved to server');
      setDebugActionFlags({ dragReorder: false, manualExtraSet: false });

      // leave the extra selection highlighted in the UI after taking the sample
    } catch (err) {
      console.error('Save exception', err);
      toast.error(`Save exception: ${String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  // persist selections immediately to localStorage (no Save button)
  useEffect(() => {
    try {
      localStorage.setItem('samples_active_ids_v1', JSON.stringify(activeIds));
    } catch (e) {
      // ignore
    }

    const unmatched = activeIds.filter(id => !products.some(p => p.id === id || p.item_number === id));
    if (unmatched.length > 0) {
      console.warn('ActiveIds with no matching product:', unmatched);
    }
  }, [activeIds]);

  // persist availability map
  useEffect(() => {
    try {
      localStorage.setItem('samples_availability_v1', JSON.stringify(availability));
    } catch (e) {
      // ignore
    }
  }, [availability]);

  // Load rotation state on mount and sync extraId ONCE
  useEffect(() => {
    if (rotationInitializedRef.current) return;
    if (activeIds.length === 0 || products.length === 0) return;

    // Wait for availability to be initialized for all activeIds
    const allAvailabilityLoaded = activeIds.every(id => typeof availability[id] !== 'undefined');
    if (!allAvailabilityLoaded) return;

    rotationInitializedRef.current = true;

    try {
      const rotationState = loadRotationState();

      if (rotationState.completed && rotationState.completed.length > 0) {
        // Try to restore the last picked product
        const lastPicked = rotationState.completed[rotationState.completed.length - 1];
        const product = products.find((p) => p.id === lastPicked || p.item_number === lastPicked);
        if (product && activeIds.includes(lastPicked) && availability[lastPicked] !== false) {
          setExtraId(product.id);
          return;
        }
      }

      // If no completed state or product not found, preview the next one
      const preview = previewNextExtra(activeIds, availability);
      if (preview?.next) {
        const product = products.find((p) => p.id === preview.next || p.item_number === preview.next);
        if (product) {
          setExtraId(product.id);
        }
      }
    } catch (e) {
      console.warn('Failed loading rotation state on init', e);
    }
  }, [activeIds, products, availability]);

  // ensure availability has entries for activeIds (default true)
  useEffect(() => {
    if (!activeIds || activeIds.length === 0) return;
    setAvailability((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const id of activeIds) {
        if (typeof next[id] === 'undefined') {
          next[id] = true;
          changed = true;
        }
      }
      // prune entries for removed ids
      for (const k of Object.keys(next)) {
        if (!activeIds.includes(k)) {
          delete next[k];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [activeIds]);

  // Ensure there is always a selected extra when possible
  useEffect(() => {
    if (!activeIds || activeIds.length === 0) return;
    if (!rotationInitializedRef.current) return; // Wait for rotation init to complete first

    const currentExtraKey = products.find((x) => x.id === extraId)?.item_number ?? extraId;
    const currentIsActive = currentExtraKey ? activeIds.includes(currentExtraKey) : false;
    const currentIsAvailable = currentExtraKey ? availability[currentExtraKey] !== false : false;

    if (currentIsActive && currentIsAvailable) return;

    const nextKey = activeIds.find((id) => availability[id] !== false) ?? null;
    if (!nextKey) {
      if (extraId) setExtraId(null);
      return;
    }

    const nextProduct = products.find((x) => x.id === nextKey || x.item_number === nextKey);
    if (nextProduct) setExtraId(nextProduct.id);
    else setExtraId(nextKey);
  }, [activeIds, availability, products, extraId]);

  // Auto-select newly-added active product as the extra (after initial server sync)
  useEffect(() => {
    const prev = prevActiveRef.current;
    const added = activeIds.filter((id) => !prev.includes(id));
    const removed = prev.filter((id) => !activeIds.includes(id));

    if (serverActiveLoaded.current && added.length > 0) {
      // prefer the most-recently added id
      const dbKey = added[added.length - 1];
      const p = products.find((x) => x.id === dbKey || x.item_number === dbKey);
      if (p && availability[dbKey] !== false) {
        setExtraId(p.id);
      }
    }

    if (removed.length > 0) {
      if (extraId) {
        const curDbKey = products.find((x) => x.id === extraId)?.item_number ?? extraId;
        if (removed.includes(curDbKey)) setExtraId(null);
      }
    }

    prevActiveRef.current = activeIds;
  }, [activeIds, products, availability, extraId]);

  const toggleAvailability = async (id: string) => {
    const before = availability[id] !== false;
    const willBe = !before;
    // optimistic
    setAvailability((prev) => ({ ...prev, [id]: willBe }));

    // optimistic extra selection when marking available, and clear when marking unavailable
    const prod = products.find((x) => x.id === id || x.item_number === id);
    const prevExtra = extraId;
    let setByToggle = false;
    const curExtraDbKey = products.find((x) => x.id === extraId)?.item_number ?? extraId;
    if (willBe) {
      if (activeIds.includes(id) && prod) {
        setExtraId(prod.id);
        setByToggle = true;
      }
    } else {
      // if the currently-selected extra is being marked unavailable, pick the next eligible extra (optimistic preview)
      if (prod && curExtraDbKey === id) {
        const tempAvail = { ...availability, [id]: willBe };
        const preview = previewNextExtra(activeIds, tempAvail);
        let nextKey = preview.next ?? null;
        if (!nextKey) {
          nextKey = activeIds.find((k) => k !== id && (tempAvail[k] !== false)) ?? null;
        }
        if (nextKey) {
          const nextProd = products.find((x) => x.id === nextKey || x.item_number === nextKey);
          if (nextProd) setExtraId(nextProd.id);
          else setExtraId(nextKey);
        } else {
          setExtraId(null);
        }
        setByToggle = true;
      }
    }

    try {
      await setAvailabilityServer(id, willBe);
    } catch (err) {
      console.error('Failed persisting availability', err);
      setSaveInfo('Server availability save failed');
      // revert availability
      setAvailability((prev) => ({ ...prev, [id]: before }));
      // revert optimistic extra selection if we changed it here
      if (setByToggle) setExtraId(prevExtra);
    }

    // on success, if we changed selection because of this toggle, persist rotation change
    if (!willBe && setByToggle) {
      // now advance rotation persistently so server/rotation are in sync
      try {
        const tempAvail = { ...availability, [id]: willBe };
        const pick = pickNextExtra(activeIds, tempAvail);
        const chosenKey = pick.next ?? null;
        if (chosenKey) {
          const nextProd = products.find((x) => x.id === chosenKey || x.item_number === chosenKey);
          if (nextProd) setExtraId(nextProd.id);
          else setExtraId(chosenKey);
        }
      } catch (e) {
        // non-fatal: rotation persistence failed
        console.warn('Failed to persist rotation after availability change', e);
      }
    }
  };

  useEffect(() => {
    try {
      if (extraId) localStorage.setItem('samples_extra_id_v1', extraId);
      else localStorage.removeItem('samples_extra_id_v1');
    } catch (e) {
      // ignore
    }
  }, [extraId]);

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (id: string) => {
    if (draggedId && draggedId !== id) {
      setDragOverId(id);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = async (targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const draggedIdx = activeIds.indexOf(draggedId);
    const targetIdx = activeIds.indexOf(targetId);

    if (draggedIdx === -1 || targetIdx === -1) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    // Create new order with dragged item moved to target position
    const newOrder = [...activeIds];
    newOrder.splice(draggedIdx, 1);
    newOrder.splice(targetIdx, 0, draggedId);

    // Optimistic UI update
    setActiveIds(newOrder);
    setDebugActionFlags((prev) => ({ ...prev, dragReorder: true }));
    setDraggedId(null);
    setDragOverId(null);

    // SYNC: Update rotation state to match new order
    syncRotationToActiveOrder(newOrder, availability);

    // Persist to server
    try {
      await setProductOrder(newOrder);
      localStorage.setItem('samples_active_ids_v1', JSON.stringify(newOrder));
    } catch (err) {
      console.error('Failed persisting product order', err);
      setSaveInfo('Failed to save product order');
      // Revert optimistic update
      setActiveIds(activeIds);
    }
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

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
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => {
                setInputFocused(true);
                setShowSuggestions(true);
              }}
              onBlur={() => setInputFocused(false)}
              onKeyDown={onInputKeyDown}
              autoComplete="off"
            />

            {fetchInfo && <div className="fetch-info muted">{fetchInfo}</div>}

            {visibleSuggestions.length > 0 && (
              <ul className="suggestions-dropdown" role="listbox">
                {visibleSuggestions.map((p, idx) => {
                  const key = p.item_number ?? p.id;
                  const isActive = activeIds.includes(key);
                  const isFocused = idx === focusedIndex;
                  const metalLabel = typeof p.metal_detector === 'boolean'
                    ? (p.metal_detector ? 'MD' : null)
                    : (p.metal_detector ? `MD ${p.metal_detector}` : null);
                  const mainLine = formatMainLine(p) || (p.product_name ?? p.name ?? '');
                  return (
                    <li key={p.id} className={`suggestion-item ${isFocused ? 'focused' : ''}`} role="option">
                      <button
                        type="button"
                        className={`suggestion-main ${extraId === p.id ? 'selected' : ''}`}
                        onMouseDown={(ev) => ev.preventDefault()}
                        onClick={() => {
                          setExtraId(p.id);
                          setQuery(p.product_name ?? p.item_number ?? '');
                          setShowSuggestions(false);
                          setFocusedIndex(-1);
                        }}
                      >
                        <div className="product-main">{highlightMatch(mainLine, query) as any}</div>
                        <div className="product-meta">
                          {p.line_number !== null && p.line_number !== undefined && p.line_number !== '' && (
                            <span className="meta-item">Line {p.line_number}</span>
                          )}
                          {metalLabel && <span className="meta-item">{metalLabel}</span>}
                          {renderCountryFlag(p.country_code)}
                          {p.special_sampling_flag && (
                            <span className="meta-item meta-icon jar-icon" title="Special sampling" aria-label="Special sampling">
                              <svg className="icon-jar" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                                <path d="M7 4h10v3H7z" fill="currentColor" />
                                <path d="M8 7h8a2 2 0 0 1 2 2v9a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V9a2 2 0 0 1 2-2z" fill="currentColor" />
                                <rect x="9" y="10" width="6" height="7" rx="1" fill="#7a4f1d" />
                              </svg>
                            </span>
                          )}
                          {p.special_recipe_flag && <span className="meta-item meta-recipe">Recipe</span>}
                          {p.usda_flag && <span className="meta-item meta-usda" title="USDA pricing">USDA</span>}
                        </div>
                      </button>
                      <button
                        type="button"
                        className={`suggestion-add ${isActive ? 'active' : ''}`}
                        onMouseDown={(ev) => ev.preventDefault()}
                        onClick={async () => {
                          const dbKey = p.item_number ?? p.id;
                          // optimistic UI update using dbKey
                          const willBeActive = !isActive;
                          setActiveIds((cur) => (cur.includes(dbKey) ? cur.filter((id) => id !== dbKey) : [...cur, dbKey]));
                          // optimistically select the newly added product as extra
                          if (willBeActive) setExtraId(p.id);
                          try {
                            await setActiveProduct(dbKey, willBeActive);
                          } catch (err) {
                            console.error('Failed persisting active toggle', err);
                            setSaveInfo('Server save failed');
                            // revert optimistic update
                            setActiveIds((cur) => (cur.includes(dbKey) ? cur.filter((id) => id !== dbKey) : [...cur, dbKey]));
                            // revert optimistic extra selection if it matches
                            setExtraId((cur) => (cur === p.id ? null : cur));
                          }
                        }}
                      >
                        {isActive ? 'Active' : 'Add'}
                      </button>
                    </li>
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

            const metalLabel = typeof p.metal_detector === 'boolean'
              ? (p.metal_detector ? 'MD' : null)
              : (p.metal_detector ? `MD ${p.metal_detector}` : null);
            return (
              <div
                key={id}
                draggable
                onDragStart={() => handleDragStart(id)}
                onDragOver={handleDragOver}
                onDragEnter={() => handleDragEnter(id)}
                onDragLeave={handleDragLeave}
                onDrop={() => handleDrop(id)}
                onDragEnd={handleDragEnd}
                className={`active-item ${isSelectedExtra ? 'selected' : ''} ${isDragged ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
              >
                <div>
                  <div className="product-main">{formatMainLine(p) || (p.product_name ?? p.name)}</div>
                  <div className="product-meta">
                    {p.line_number !== null && p.line_number !== undefined && p.line_number !== '' && (
                      <span className="meta-item">Line {p.line_number}</span>
                    )}
                    {metalLabel && <span className="meta-item">{metalLabel}</span>}
                    {renderCountryFlag(p.country_code)}
                    {p.special_sampling_flag && (
                      <span className="meta-item meta-icon jar-icon" title="Special sampling" aria-label="Special sampling">
                        <svg className="icon-jar" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                          <path d="M7 4h10v3H7z" fill="currentColor" />
                          <path d="M8 7h8a2 2 0 0 1 2 2v9a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V9a2 2 0 0 1 2-2z" fill="currentColor" />
                          <rect x="9" y="10" width="6" height="7" rx="1" fill="#7a4f1d" />
                        </svg>
                      </span>
                    )}
                    {p.special_recipe_flag && <span className="meta-item meta-recipe">Recipe</span>}
                    {p.usda_flag && <span className="meta-item meta-usda" title="USDA pricing">USDA</span>}
                  </div>
                </div>
                <div className="active-controls">
                  <button
                    type="button"
                    className={`set-extra ${isSelectedExtra ? 'selected' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isSelectedExtra) return;
                      if (!isAvailable) {
                        setSaveInfo('Cannot select unavailable product as extra');
                        setTimeout(() => setSaveInfo(null), 3000);
                        return;
                      }
                      setExtraId(p.id);
                      setDebugActionFlags((prev) => ({ ...prev, manualExtraSet: true }));
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
                    onClick={(e) => { e.stopPropagation(); toggleAvailability(id); }}
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

                  {/* select-extra removed: clicking the item selects the extra */}
                  <button
                    type="button"
                    className="remove"
                    onClick={async (e) => {
                      e.stopPropagation();
                      const dbKey = id;
                      // optimistic remove from UI
                      setActiveIds((cur) => cur.filter((x) => x !== id));
                      try {
                        await setActiveProduct(dbKey, false);
                      } catch (err) {
                        console.error('Failed persisting remove', err);
                        setSaveInfo('Server remove failed');
                        // revert optimistic remove
                        setActiveIds((cur) => (cur.includes(id) ? cur : [...cur, id]));
                      }
                    }}
                    aria-label="Remove active product"
                    title="Remove"
                  >
                    <IoRemoveCircleOutline className="icon-remove" aria-hidden />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {/* Predicted Next Extra removed — using picker and badges only */}
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
            <button type="button" className="take-sample" onClick={saveSampleRecord} disabled={saving}>
              {saving ? 'Saving…' : 'Take Sample Now'}
            </button>
          </div>
          {saveInfo && <div className="save-info muted">{saveInfo}</div>}
        </div>
      </div>
    </aside>
  );
};

export default ExtraSample;
