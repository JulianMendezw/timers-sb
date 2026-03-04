import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { supabase } from '../../../lib/supabaseClient';
import { insertSampleRecord, subscribeSampleRecords } from '../../../lib/sampleRecordsClient';
import type { SampleRecordRow } from '../../../lib/sampleRecordsClient';
import { resolveProductionDayId } from '../../../lib/productionDaysClient';
import {
  fetchActiveProductIds,
  fetchAvailabilityMap,
  setActiveProduct,
  setAvailability as setAvailabilityServer,
  setProductOrder,
  subscribeActiveProducts,
  subscribeAvailability,
} from '../../../lib/activeProducts';
import { useProductionDay } from '../../../hooks/useProductionDay';
import { stripItemNumberPrefix } from '../../../utils/itemNumber';
import { loadRotationState, pickNextExtra, previewNextExtra, saveRotationState, syncRotationToActiveOrder } from '../../../utils/sampleRotation';
import type { ProductSummaryData } from '../../molecules/productSummary/ProductSummary';

export type Product = ProductSummaryData & {
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
};

type ProductRow = Record<string, unknown>;

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

export const formatMainLine = (p: Product) => {
  const packSize = formatPackSize(p.pack_count, p.unit_size, p.unit_size_uom);
  const parts = [stripItemNumberPrefix(p.item_number), p.customer, p.formula, p.container_1, packSize].filter(Boolean);
  return parts.join(' | ');
};

export function useExtraSample() {
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
  const [lastSampleAt, setLastSampleAt] = useState<string | null>(null);
  const [lastSampleExtraKey, setLastSampleExtraKey] = useState<string | null>(null);
  const [debugActionFlags, setDebugActionFlags] = useState({ dragReorder: false, manualExtraSet: false });
  const { getSampledAt } = useProductionDay();
  const serverActiveLoaded = useRef(false);
  const prevActiveRef = useRef<string[]>([]);
  const rotationInitializedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    const STORAGE_KEY = 'finished_products_cache_v1';

    const load = async () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { ts: number; rows: ProductRow[] };
          if (Date.now() - parsed.ts < 24 * 60 * 60 * 1000) {
            const mappedCached: Product[] = parsed.rows.map((r: ProductRow) => ({
              id: String(r.item_id ?? r.id ?? r.product_id ?? Math.random()),
              customer: (r.customer as string | null) ?? null,
              formula: (r.formula as string | null) ?? (r.formula_name as string | null) ?? null,
              pack_count: (r.pack_count as number | string | null) ?? (r.packCount as number | string | null) ?? null,
              unit_size: (r.unit_size as number | string | null) ?? (r.unitSize as number | string | null) ?? null,
              unit_size_uom: (r.unit_size_uom as string | null) ?? (r.unitSizeUom as string | null) ?? null,
              container_1: (r.container_1 as string | null) ?? (r.container as string | null) ?? null,
              product_name: (r.description as string | undefined) ?? (r.product_name as string | undefined) ?? (r.name as string | undefined) ?? (r.product as string | undefined) ?? (r.itemNumber as string | undefined) ?? (r.item_number as string | undefined),
              name: (r.description as string | undefined) ?? (r.name as string | undefined) ?? (r.product_name as string | undefined) ?? (r.product as string | undefined),
              item_number: String(r.item_id ?? r.item_number ?? r.itemNumber ?? r.id ?? ''),
              is_active: true,
              special_sampling_flag: !!r.special_sampling_flag,
              special_recipe_flag: !!r.special_recipe_flag,
              line_number: (r.line_number as string | number | undefined) ?? (r.line as string | number | undefined) ?? (r.line_no as string | number | undefined) ?? undefined,
              metal_detector: (r.metal_detector as string | boolean | undefined) ?? (r.md as string | boolean | undefined) ?? undefined,
              country_code: (r.country_code as string | undefined) ?? (r.country as string | undefined) ?? undefined,
              usda_flag: !!r.usda_flag,
            }));
            if (mounted) {
              setProducts(mappedCached);
              return;
            }
          }
        }
      } catch {
        void 0;
      }

      const tryFetch = async (table: string) => {
        try {
          const { data, error } = await supabase.from(table).select('*');
          if (error) {
            const message = (error as { message?: string })?.message ?? String(error);
            setFetchInfo(`Error fetching ${table}: ${message}`);
            return null;
          }
          if (data && Array.isArray(data) && data.length > 0) return data as Record<string, unknown>[];
          return null;
        } catch (error) {
          setFetchInfo(`Unexpected error fetching ${table}: ${String(error)}`);
        }
        return null;
      };

      const tables = ['finished_products', 'products', 'active_products', 'bulk_production_labels'];
      let rows: Record<string, unknown>[] | null = null;
      for (const table of tables) {
        rows = await tryFetch(table);
        if (rows) break;
      }

      if (mounted) {
        const mapped: Product[] = (rows ?? []).map((r) => ({
          id: String(r.item_id ?? r.id ?? r.product_id ?? Math.random()),
          customer: (r.customer as string | null) ?? null,
          formula: (r.formula as string | null) ?? (r.formula_name as string | null) ?? null,
          pack_count: (r.pack_count as number | string | null) ?? (r.packCount as number | string | null) ?? null,
          unit_size: (r.unit_size as number | string | null) ?? (r.unitSize as number | string | null) ?? null,
          unit_size_uom: (r.unit_size_uom as string | null) ?? (r.unitSizeUom as string | null) ?? null,
          container_1: (r.container_1 as string | null) ?? (r.container as string | null) ?? null,
          product_name: (r.description as string | undefined) ?? (r.product_name as string | undefined) ?? (r.name as string | undefined) ?? (r.product as string | undefined) ?? (r.itemNumber as string | undefined) ?? (r.item_number as string | undefined),
          name: (r.description as string | undefined) ?? (r.name as string | undefined) ?? (r.product_name as string | undefined) ?? (r.product as string | undefined),
          item_number: String(r.item_id ?? r.item_number ?? r.itemNumber ?? r.id ?? ''),
          is_active: true,
          special_sampling_flag: !!r.special_sampling_flag,
          special_recipe_flag: !!r.special_recipe_flag,
          line_number: (r.line_number as string | number | undefined) ?? (r.line as string | number | undefined) ?? (r.line_no as string | number | undefined) ?? undefined,
          metal_detector: (r.metal_detector as string | boolean | undefined) ?? (r.md as string | boolean | undefined) ?? undefined,
          country_code: (r.country_code as string | undefined) ?? (r.country as string | undefined) ?? undefined,
          usda_flag: !!r.usda_flag,
        }));
        setProducts(mapped);

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ ts: Date.now(), rows: rows ?? [] }));
        } catch {
          void 0;
        }

        if (!rows || rows.length === 0) {
          setFetchInfo('No product rows found in configured tables. Check Supabase table or anon key permissions.');
        } else {
          setFetchInfo(null);
        }
      }
    };

    try {
      const aRaw = localStorage.getItem('samples_active_ids_v1');
      if (aRaw) setActiveIds(JSON.parse(aRaw) as string[]);
      const eRaw = localStorage.getItem('samples_extra_id_v1');
      if (eRaw) setExtraId(eRaw);
      const availRaw = localStorage.getItem('samples_availability_v1');
      if (availRaw) setAvailability(JSON.parse(availRaw) as Record<string, boolean>);
    } catch {
      void 0;
    }

    void (async () => {
      try {
        const serverActive = await fetchActiveProductIds();
        if (serverActive && serverActive.length > 0) {
          setActiveIds(serverActive);
          try {
            localStorage.setItem('samples_active_ids_v1', JSON.stringify(serverActive));
          } catch {
            void 0;
          }
        }
      } catch (err) {
        console.warn('Could not fetch active products from server', err);
      }
    })().finally(() => {
      serverActiveLoaded.current = true;
    });

    void (async () => {
      try {
        const map = await fetchAvailabilityMap();
        if (map && Object.keys(map).length > 0) {
          setAvailability((prev) => ({ ...prev, ...map }));
        }
      } catch {
        void 0;
      }
    })();

    const unsubscribe = subscribeActiveProducts((ids) => {
      setActiveIds(ids);
      try {
        localStorage.setItem('samples_active_ids_v1', JSON.stringify(ids));
      } catch {
        void 0;
      }
    });

    const unsubAvail = subscribeAvailability((patch) => {
      setAvailability((prev) => {
        const merged = { ...prev, ...patch };
        try {
          localStorage.setItem('samples_availability_v1', JSON.stringify(merged));
        } catch {
          void 0;
        }
        return merged;
      });
    });

    let reloadTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleProductReload = () => {
      if (reloadTimer) return;
      reloadTimer = setTimeout(() => {
        reloadTimer = null;
        void load();
      }, 250);
    };

    const productSourceTables = ['finished_products', 'products', 'bulk_production_labels'];
    const productChannels = productSourceTables.map((table) =>
      supabase
        .channel(`public:${table}:products_live`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
          scheduleProductReload();
        })
        .subscribe(),
    );

    void load();

    return () => {
      mounted = false;
      if (reloadTimer) clearTimeout(reloadTimer);
      try {
        if (typeof unsubscribe === 'function') void unsubscribe();
        if (typeof unsubAvail === 'function') void unsubAvail();
        productChannels.forEach((channel) => {
          if (typeof supabase.removeChannel === 'function') {
            void supabase.removeChannel(channel);
          } else if (channel && typeof channel.unsubscribe === 'function') {
            void channel.unsubscribe();
          }
        });
      } catch {
        void 0;
      }
    };
  }, []);

  const filtered = useMemo(() => {
    const raw = query.trim().toLowerCase();
    const q = raw.replace(/\s+/g, '');
    if (!q) return [];

    const itemMatches: Product[] = [];
    const nameMatches: Product[] = [];
    for (const p of products) {
      const itemNorm = (p.item_number ?? '').toLowerCase().replace(/\s+/g, '');
      const nameNorm = (p.product_name ?? p.name ?? '').toLowerCase();
      if (itemNorm.includes(q)) itemMatches.push(p);
      else if (nameNorm.includes(raw)) nameMatches.push(p);
    }

    return [...itemMatches, ...nameMatches].slice(0, 10);
  }, [query, products]);

  const visibleSuggestions = showSuggestions && inputFocused && query.trim().length > 0 ? filtered : [];

  const handleInputKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
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
      if (!sel) return;
      const dbKey = sel.item_number ?? sel.id;
      const nextActive = activeIds.includes(dbKey) ? activeIds : [...activeIds, dbKey];
      setExtraId((cur) => (cur === sel.id ? null : sel.id));
      setActiveIds(nextActive);
      try {
        setShowSuggestions(false);
        setInputFocused(false);
        await setActiveProduct(dbKey, true);
        await setProductOrder(nextActive);
      } catch (err) {
        console.error('Failed persisting Enter selection', err);
        setSaveInfo('Server save failed');
        setActiveIds((cur) => cur.filter((id) => id !== dbKey));
      }
      setQuery(sel.product_name ?? sel.item_number ?? '');
      return;
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false);
      setInputFocused(false);
      setFocusedIndex(-1);
    }
  };

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

      const pick = pickNextExtra(activeIds, availability);
      let selectedExtraKey: string | null = pick.next ?? null;
      if (!selectedExtraKey) {
        const fallback = activeIds.find((id) => availability[id] !== false) ?? null;
        if (!fallback) {
          toast.error('No eligible extra to pick');
          setSaving(false);
          return;
        }
        selectedExtraKey = fallback;
        try {
          const st = loadRotationState();
          if (!st.completed.includes(fallback)) st.completed.push(fallback);
          st.pending = st.pending.filter((i) => i !== fallback);
          st.lastActiveSnapshot = activeIds;
          saveRotationState(st);
        } catch (error) {
          console.warn('Failed updating rotation state for fallback pick', error);
        }
      }

      const pickedProduct = products.find((p) => p.id === selectedExtraKey || p.item_number === selectedExtraKey);
      if (pickedProduct) setExtraId(pickedProduct.id);
      else setExtraId(selectedExtraKey);

      const extra = products.find((p) => p.id === selectedExtraKey || p.item_number === selectedExtraKey);
      const sampledAt = getSampledAt(selectedHour);
      const productionDayResolution = await resolveProductionDayId(sampledAt);
      if (!productionDayResolution.ok) {
        toast.error(`Production day resolve failed: ${productionDayResolution.error}`);
        return;
      }

      const payload = {
        production_day_id: productionDayResolution.id,
        hour_code: selectedHour,
        sampled_at: sampledAt,
        active_products: activeProductsList,
        extra_product: extra ? (extra.item_number ? stripItemNumberPrefix(extra.item_number) : (extra.product_name ?? extra.id)) : null,
        cycle_number: 0,
        notes: JSON.stringify({
          debug_mode: 'rotation-test',
          predicted_extra: selectedExtraKey ? stripItemNumberPrefix(selectedExtraKey) : null,
          selected_extra: extra ? (extra.item_number ? stripItemNumberPrefix(extra.item_number) : (extra.product_name ?? extra.id)) : null,
          drag_reorder_since_last_sample: debugActionFlags.dragReorder,
          manual_set_extra_since_last_sample: debugActionFlags.manualExtraSet,
        }),
      };

      const result = await insertSampleRecord(payload);
      if (!result.ok) {
        toast.error(`Save failed: ${result.error}`);
        return;
      }

      toast.success('Saved to server');
      setLastSampleAt(sampledAt);
      setLastSampleExtraKey(selectedExtraKey);
      setDebugActionFlags({ dragReorder: false, manualExtraSet: false });
    } catch (err) {
      toast.error(`Save exception: ${String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem('samples_active_ids_v1', JSON.stringify(activeIds));
    } catch {
      void 0;
    }
  }, [activeIds]);

  useEffect(() => {
    try {
      localStorage.setItem('samples_availability_v1', JSON.stringify(availability));
    } catch {
      void 0;
    }
  }, [availability]);

  useEffect(() => {
    if (rotationInitializedRef.current) return;
    if (activeIds.length === 0 || products.length === 0) return;
    const allAvailabilityLoaded = activeIds.every((id) => typeof availability[id] !== 'undefined');
    if (!allAvailabilityLoaded) return;
    rotationInitializedRef.current = true;

    try {
      const rotationState = loadRotationState();
      if (rotationState.completed && rotationState.completed.length > 0) {
        const lastPicked = rotationState.completed[rotationState.completed.length - 1];
        const product = products.find((p) => p.id === lastPicked || p.item_number === lastPicked);
        if (product && activeIds.includes(lastPicked) && availability[lastPicked] !== false) {
          setExtraId(product.id);
          return;
        }
      }

      const preview = previewNextExtra(activeIds, availability);
      if (preview?.next) {
        const product = products.find((p) => p.id === preview.next || p.item_number === preview.next);
        if (product) setExtraId(product.id);
      }
    } catch (error) {
      console.warn('Failed loading rotation state on init', error);
    }
  }, [activeIds, products, availability]);

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
      for (const key of Object.keys(next)) {
        if (!activeIds.includes(key)) {
          delete next[key];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [activeIds]);

  useEffect(() => {
    if (!activeIds || activeIds.length === 0) return;
    if (!rotationInitializedRef.current) return;

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

  useEffect(() => {
    const prev = prevActiveRef.current;
    const added = activeIds.filter((id) => !prev.includes(id));
    const removed = prev.filter((id) => !activeIds.includes(id));

    if (serverActiveLoaded.current && added.length > 0) {
      const dbKey = added[added.length - 1];
      const p = products.find((x) => x.id === dbKey || x.item_number === dbKey);
      if (p && availability[dbKey] !== false) setExtraId(p.id);
    }

    if (removed.length > 0 && extraId) {
      const curDbKey = products.find((x) => x.id === extraId)?.item_number ?? extraId;
      if (removed.includes(curDbKey)) setExtraId(null);
    }

    prevActiveRef.current = activeIds;
  }, [activeIds, products, availability, extraId]);

  useEffect(() => {
    const unsubscribe = subscribeSampleRecords((row: SampleRecordRow | null) => {
      const latest = row?.sampled_at ?? row?.created_at ?? null;
      setLastSampleAt(latest);
      let notesObj: Record<string, unknown> | null = null;
      if (typeof row?.notes === 'string') {
        try {
          notesObj = JSON.parse(row.notes) as Record<string, unknown>;
        } catch {
          notesObj = null;
        }
      } else if (row?.notes && typeof row.notes === 'object') {
        notesObj = row.notes as Record<string, unknown>;
      }

      const selectedFromNotes = typeof notesObj?.selected_extra === 'string' ? notesObj.selected_extra : null;
      const predictedFromNotes = typeof notesObj?.predicted_extra === 'string' ? notesObj.predicted_extra : null;
      const selectedFromRow = row?.extra_product ?? null;
      setLastSampleExtraKey(selectedFromNotes ?? selectedFromRow ?? predictedFromNotes ?? null);
    });

    return () => {
      try {
        if (typeof unsubscribe === 'function') void unsubscribe();
      } catch {
        void 0;
      }
    };
  }, []);

  useEffect(() => {
    if (!lastSampleExtraKey || products.length === 0) return;

    const normalizeKey = (value?: string | null) => {
      if (!value) return '';
      return stripItemNumberPrefix(String(value)).trim().toLowerCase();
    };

    const target = normalizeKey(lastSampleExtraKey);
    if (!target) return;

    const matched = products.find((p) => {
      const itemNumberMatch = normalizeKey(p.item_number ?? null) === target;
      const idMatch = normalizeKey(p.id) === target;
      return itemNumberMatch || idMatch;
    });

    if (matched) setExtraId(matched.id);
  }, [lastSampleExtraKey, products]);

  const toggleAvailability = async (id: string) => {
    const before = availability[id] !== false;
    const willBe = !before;
    setAvailability((prev) => ({ ...prev, [id]: willBe }));

    const prod = products.find((x) => x.id === id || x.item_number === id);
    const prevExtra = extraId;
    let setByToggle = false;
    const curExtraDbKey = products.find((x) => x.id === extraId)?.item_number ?? extraId;

    if (willBe) {
      if (activeIds.includes(id) && prod) {
        setExtraId(prod.id);
        setByToggle = true;
      }
    } else if (prod && curExtraDbKey === id) {
      const tempAvail = { ...availability, [id]: willBe };
      const preview = previewNextExtra(activeIds, tempAvail);
      let nextKey = preview.next ?? null;
      if (!nextKey) nextKey = activeIds.find((k) => k !== id && tempAvail[k] !== false) ?? null;
      if (nextKey) {
        const nextProd = products.find((x) => x.id === nextKey || x.item_number === nextKey);
        if (nextProd) setExtraId(nextProd.id);
        else setExtraId(nextKey);
      } else {
        setExtraId(null);
      }
      setByToggle = true;
    }

    try {
      await setAvailabilityServer(id, willBe);
    } catch (err) {
      console.error('Failed persisting availability', err);
      setSaveInfo('Server availability save failed');
      setAvailability((prev) => ({ ...prev, [id]: before }));
      if (setByToggle) setExtraId(prevExtra);
    }

    if (!willBe && setByToggle) {
      try {
        const tempAvail = { ...availability, [id]: willBe };
        const pick = pickNextExtra(activeIds, tempAvail);
        const chosenKey = pick.next ?? null;
        if (chosenKey) {
          const nextProd = products.find((x) => x.id === chosenKey || x.item_number === chosenKey);
          if (nextProd) setExtraId(nextProd.id);
          else setExtraId(chosenKey);
        }
      } catch (error) {
        console.warn('Failed to persist rotation after availability change', error);
      }
    }
  };

  useEffect(() => {
    try {
      if (extraId) localStorage.setItem('samples_extra_id_v1', extraId);
      else localStorage.removeItem('samples_extra_id_v1');
    } catch {
      void 0;
    }
  }, [extraId]);

  const handleDragStart = (id: string) => setDraggedId(id);
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const handleDragEnter = (id: string) => {
    if (draggedId && draggedId !== id) setDragOverId(id);
  };
  const handleDragLeave = () => setDragOverId(null);

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

    const newOrder = [...activeIds];
    newOrder.splice(draggedIdx, 1);
    newOrder.splice(targetIdx, 0, draggedId);

    setActiveIds(newOrder);
    setDebugActionFlags((prev) => ({ ...prev, dragReorder: true }));
    setDraggedId(null);
    setDragOverId(null);
    syncRotationToActiveOrder(newOrder, availability);

    try {
      await setProductOrder(newOrder);
      localStorage.setItem('samples_active_ids_v1', JSON.stringify(newOrder));
    } catch (err) {
      console.error('Failed persisting product order', err);
      setSaveInfo('Failed to save product order');
      setActiveIds(activeIds);
    }
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const formattedLastSample = useMemo(() => {
    if (!lastSampleAt) return 'No sample recorded yet';
    const dt = new Date(lastSampleAt);
    if (Number.isNaN(dt.getTime())) return `Last sample: ${lastSampleAt}`;
    return `Last sample: ${dt.toLocaleString()}`;
  }, [lastSampleAt]);

  const handleSearchChange = (value: string) => {
    setQuery(value);
    setShowSuggestions(true);
  };

  const handleSearchFocus = () => {
    setInputFocused(true);
    setShowSuggestions(true);
  };

  const handleSearchBlur = () => {
    setInputFocused(false);
  };

  const handleSuggestionSelect = (p: Product) => {
    setExtraId(p.id);
    setQuery(p.product_name ?? p.item_number ?? '');
    setShowSuggestions(false);
    setFocusedIndex(-1);
  };

  const handleSuggestionToggleActive = (p: Product, isActive: boolean) => {
    const dbKey = p.item_number ?? p.id;
    const willBeActive = !isActive;
    const nextActive = willBeActive
      ? (activeIds.includes(dbKey) ? activeIds : [...activeIds, dbKey])
      : activeIds.filter((id) => id !== dbKey);
    setActiveIds(nextActive);
    if (willBeActive) setExtraId(p.id);

    void (async () => {
      try {
        await setActiveProduct(dbKey, willBeActive);
        await setProductOrder(nextActive);
      } catch (err) {
        console.error('Failed persisting active toggle', err);
        setSaveInfo('Server save failed');
        setActiveIds((cur) => (cur.includes(dbKey) ? cur.filter((id) => id !== dbKey) : [...cur, dbKey]));
        setExtraId((cur) => (cur === p.id ? null : cur));
      }
    })();
  };

  const handleSetExtraFromActive = (p: Product, isSelectedExtra: boolean, isAvailable: boolean) => {
    if (isSelectedExtra) return;
    if (!isAvailable) {
      setSaveInfo('Cannot select unavailable product as extra');
      setTimeout(() => setSaveInfo(null), 3000);
      return;
    }
    setExtraId(p.id);
    setDebugActionFlags((prev) => ({ ...prev, manualExtraSet: true }));
  };

  const handleRemoveActive = (id: string) => {
    const dbKey = id;
    const nextActive = activeIds.filter((x) => x !== id);
    setActiveIds(nextActive);
    void (async () => {
      try {
        await setActiveProduct(dbKey, false);
        await setProductOrder(nextActive);
      } catch (err) {
        console.error('Failed persisting remove', err);
        setSaveInfo('Server remove failed');
        setActiveIds((cur) => (cur.includes(id) ? cur : [...cur, id]));
      }
    })();
  };

  return {
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
  };
}
