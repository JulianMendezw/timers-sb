export type RotationState = {
  pending: string[]; // queue of item_ids still to be taken as extra in this cycle
  completed: string[]; // items already taken in this cycle
  lastActiveSnapshot: string[]; // snapshot of active ids when cycle was created/last updated
};

const STORAGE_KEY = 'samples_rotation_v1';

export const defaultState = (): RotationState => ({ pending: [], completed: [], lastActiveSnapshot: [] });

export function loadRotationState(): RotationState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as RotationState;
    return {
      pending: Array.isArray(parsed.pending) ? parsed.pending : [],
      completed: Array.isArray(parsed.completed) ? parsed.completed : [],
      lastActiveSnapshot: Array.isArray(parsed.lastActiveSnapshot) ? parsed.lastActiveSnapshot : [],
    };
  } catch (e) {
    return defaultState();
  }
}

export function saveRotationState(s: RotationState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch (e) {
    // ignore storage errors
  }
}

/**
 * Decide the next extra product according to rules:
 * 1) If a new product appears in activeIds (not in lastActiveSnapshot) -> pick it immediately.
 * 2) Otherwise take the first item from pending that is still active.
 * 3) If pending is empty or none of pending is active, reinitialize pending from activeIds and continue.
 * 4) When all active products have been completed, reset the cycle (pending = activeIds, completed = []).
 */
export function pickNextExtra(activeIds: string[], availability?: Record<string, boolean> | null, stateIn?: RotationState) {
  let state = stateIn ? { ...stateIn, pending: [...stateIn.pending], completed: [...stateIn.completed], lastActiveSnapshot: [...(stateIn.lastActiveSnapshot ?? [])] } : loadRotationState();

  const active = Array.from(new Set(activeIds));
  const eligible = availability ? active.filter((id) => availability[id] !== false) : active;

  if (active.length === 0 || eligible.length === 0) {
    const cleared = defaultState();
    saveRotationState(cleared);
    return { next: null, state: cleared };
  }

  // SYNC: Check if order changed from last snapshot (drag reorder detection)
  const orderChanged = 
    state.lastActiveSnapshot.length !== active.length ||
    state.lastActiveSnapshot.some((id, i) => active[i] !== id);

  if (orderChanged) {
    // Reorder pending/completed to match new activeIds order
    state.pending = state.pending
      .filter((id) => active.includes(id) && (!availability || availability[id] !== false))
      .sort((a, b) => active.indexOf(a) - active.indexOf(b));

    state.completed = state.completed
      .filter((id) => active.includes(id) && (!availability || availability[id] !== false))
      .sort((a, b) => active.indexOf(a) - active.indexOf(b));
  }

  // Detect truly NEW products (not in lastActiveSnapshot at all)
  const lastSnap = state.lastActiveSnapshot ?? [];
  const newProducts = active.filter((id) => !lastSnap.includes(id));
  const viableNew = availability ? newProducts.filter((id) => availability[id] !== false) : newProducts;
  
  if (viableNew.length > 0) {
    const pick = viableNew[0];
    state.pending = state.pending.filter((i) => i !== pick);
    state.completed = state.completed.filter((i) => i !== pick);
    state.lastActiveSnapshot = active;
    saveRotationState(state);
    return { next: pick, state };
  }

  // Prune completed/pending to current active/eligible
  state.completed = state.completed.filter((id) => active.includes(id) && (!availability || availability[id] !== false));
  state.pending = state.pending.filter((id) => active.includes(id) && !state.completed.includes(id) && (!availability || availability[id] !== false));

  // Initialize pending if empty
  if (state.pending.length === 0) {
    const completedSet = new Set(state.completed);
    const allCompleted = eligible.every((id) => completedSet.has(id));
    if (allCompleted) {
      state.completed = [];
      state.pending = [...eligible]; // Preserve activeIds order
    } else {
      state.pending = eligible.filter((id) => !state.completed.includes(id));
    }
    state.lastActiveSnapshot = active;
    saveRotationState(state);
  }

  // Pick first pending that is eligible
  let pick: string | null = null;
  while (state.pending.length > 0) {
    const candidate = state.pending.shift() as string;
    if (eligible.includes(candidate)) {
      pick = candidate;
      state.completed.push(candidate);
      break;
    }
  }

  // Fallback: reinitialize if no pick found
  if (!pick) {
    state.pending = eligible.filter((id) => !state.completed.includes(id));
    if (state.pending.length > 0) {
      pick = state.pending.shift() as string;
      if (pick) state.completed.push(pick);
    }
  }

  // Check cycle completion
  const completedSet2 = new Set(state.completed);
  if (eligible.every((id) => completedSet2.has(id))) {
    state.pending = [];
  }

  saveRotationState(state);
  return { next: pick, state };
}

/**
 * Preview the next extra without mutating or persisting rotation state.
 * Returns the predicted `next` id and the hypothetical new state (not saved).
 */
export function previewNextExtra(activeIds: string[], availability?: Record<string, boolean> | null, stateIn?: RotationState) {
  const state = stateIn ? { ...stateIn, pending: [...stateIn.pending], completed: [...stateIn.completed] } : loadRotationState();

  // Work on copies and do NOT call saveRotationState
  const st = { pending: [...state.pending], completed: [...state.completed], lastActiveSnapshot: [...(state.lastActiveSnapshot ?? [])] } as RotationState;

  const active = Array.from(new Set(activeIds));
  const eligible = availability ? active.filter((id) => availability[id] !== false) : active;
  if (active.length === 0 || eligible.length === 0) return { next: null, state: st };

  const lastSnap = st.lastActiveSnapshot ?? [];
  const newProducts = active.filter((id) => !lastSnap.includes(id));
  const viableNew = availability ? newProducts.filter((id) => availability[id] !== false) : newProducts;
  if (viableNew.length > 0) return { next: viableNew[0], state: st };

  // prune completed to active/eligible
  st.completed = st.completed.filter((id) => active.includes(id) && (!availability || availability[id] !== false));

  st.pending = st.pending.filter((id) => active.includes(id) && !st.completed.includes(id));
  if (availability) st.pending = st.pending.filter((id) => availability[id] !== false);

  if (st.pending.length === 0) {
    const completedSet = new Set(st.completed);
    const allCompleted = eligible.every((id) => completedSet.has(id));
    if (allCompleted) {
      st.completed = [];
      st.pending = [...eligible];
    } else {
      st.pending = eligible.filter((id) => !st.completed.includes(id));
    }
    st.lastActiveSnapshot = active;
  }

  let pick: string | null = null;
  for (let i = 0; i < st.pending.length; i++) {
    const candidate = st.pending[i];
    if (eligible.includes(candidate)) {
      pick = candidate;
      break;
    }
  }

  if (!pick) {
    const candidates = eligible.filter((id) => !st.completed.includes(id));
    pick = candidates.length > 0 ? candidates[0] : null;
  }

  return { next: pick, state: st };
}

export function resetRotation() {
  const s = defaultState();
  saveRotationState(s);
  return s;
}

/**
 * Call this when activeIds order changes (e.g., user drag-reorder)
 * to sync the rotation queue to the new order without losing progress.
 */
export function syncRotationToActiveOrder(activeIds: string[], availability?: Record<string, boolean> | null) {
  const state = loadRotationState();
  const active = Array.from(new Set(activeIds));

  // Check if order changed (not just set membership)
  const orderChanged = 
    state.lastActiveSnapshot.length !== active.length ||
    state.lastActiveSnapshot.some((id, i) => active[i] !== id);

  if (!orderChanged) return state; // No changes needed

  // Reorder pending and completed to match new activeIds order
  state.pending = state.pending
    .filter((id) => active.includes(id) && (!availability || availability[id] !== false))
    .sort((a, b) => active.indexOf(a) - active.indexOf(b));

  state.completed = state.completed
    .filter((id) => active.includes(id) && (!availability || availability[id] !== false))
    .sort((a, b) => active.indexOf(a) - active.indexOf(b));

  // Update snapshot to reflect new order
  state.lastActiveSnapshot = active;
  saveRotationState(state);
  
  return state;
}

export default { loadRotationState, saveRotationState, pickNextExtra, resetRotation };
