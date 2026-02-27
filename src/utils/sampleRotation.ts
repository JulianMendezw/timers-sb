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

function arraysEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * Decide the next extra product according to rules:
 * 1) If a new product appears in activeIds (not in lastActiveSnapshot) -> pick it immediately.
 * 2) Otherwise take the first item from pending that is still active.
 * 3) If pending is empty or none of pending is active, reinitialize pending from activeIds and continue.
 * 4) When all active products have been completed, reset the cycle (pending = activeIds, completed = []).
 */
export function pickNextExtra(activeIds: string[], availability?: Record<string, boolean> | null, stateIn?: RotationState) {
  const state = stateIn ? { ...stateIn, pending: [...stateIn.pending], completed: [...stateIn.completed] } : loadRotationState();

  // canonicalize activeIds to unique list preserving order
  const active = Array.from(new Set(activeIds));
  // determine eligible items (respect availability if provided)
  const eligible = availability ? active.filter((id) => availability[id] !== false) : active;

  // if no active products or no eligible products, clear state and return null
  if (active.length === 0 || eligible.length === 0) {
    const cleared = defaultState();
    saveRotationState(cleared);
    return { next: null, state: cleared };
  }

  // detect new product(s) (respect availability if provided)
  const lastSnap = state.lastActiveSnapshot ?? [];
  const newProducts = active.filter((id) => !lastSnap.includes(id));
  const viableNew = availability ? newProducts.filter((id) => availability[id] !== false) : newProducts;
  if (viableNew.length > 0) {
    // pick the first new product (priority)
    const pick = viableNew[0];
    // ensure it's not in completed/pending
    state.pending = state.pending.filter((i) => i !== pick);
    state.completed = state.completed.filter((i) => i !== pick);
    // update snapshot
    state.lastActiveSnapshot = active;
    saveRotationState(state);
    return { next: pick, state };
  }

  // prune completed to current active/eligible items so old ids don't block cycles
  state.completed = state.completed.filter((id) => active.includes(id) && (!availability || availability[id] !== false));

  // ensure pending contains only currently active items and excludes completed
  state.pending = state.pending.filter((id) => active.includes(id) && !state.completed.includes(id));
  if (availability) {
    state.pending = state.pending.filter((id) => availability[id] !== false);
  }

  // If pending is empty, initialize from active minus completed
  if (state.pending.length === 0) {
    // If completed already contains all eligible -> reset cycle
    const completedSet = new Set(state.completed);
    const allCompleted = eligible.every((id) => completedSet.has(id));
    if (allCompleted) {
      state.completed = [];
      state.pending = [...eligible];
    } else {
      // Build pending from eligible excluding completed
      state.pending = eligible.filter((id) => !state.completed.includes(id));
    }
    state.lastActiveSnapshot = active;
    saveRotationState(state);
  }

  // pick first pending that is active
  let pick: string | null = null;
  while (state.pending.length > 0) {
    const candidate = state.pending.shift() as string;
    if (eligible.includes(candidate)) {
      pick = candidate;
      state.completed.push(candidate);
      break;
    }
    // otherwise skip it (it might have gone inactive or unavailable)
  }

  // If we didn't find any pick, try reinitializing once more
  if (!pick) {
    state.pending = eligible.filter((id) => !state.completed.includes(id));
    if (state.pending.length > 0) {
      pick = state.pending.shift() as string;
      if (pick) state.completed.push(pick);
    }
  }

  // If after picking we've completed all active, reset for next cycle
  const completedSet2 = new Set(state.completed);
  if (eligible.every((id) => completedSet2.has(id))) {
    // next cycle will start fresh on next invocation; keep lastActiveSnapshot equal
    state.pending = [];
    // state.completed remains full until next pick resets it
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

export default { loadRotationState, saveRotationState, pickNextExtra, resetRotation };
