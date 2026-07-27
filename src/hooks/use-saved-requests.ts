import { useCallback, useEffect, useState } from "react";

const KEY = "foxwood:saved-requests";
const EVT = "foxwood:saved-requests-changed";

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids.slice(0, 200)));
    window.dispatchEvent(new CustomEvent(EVT));
  } catch {
    /* ignore */
  }
}

export function useSavedRequests() {
  const [ids, setIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setIds(read());
    setHydrated(true);
    const onChange = () => setIds(read());
    window.addEventListener(EVT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const isSaved = useCallback((id: string) => ids.includes(id), [ids]);

  /** Toggles and returns the previous list so callers can offer an undo. */
  const toggle = useCallback((id: string): { previous: string[]; saved: boolean } => {
    const current = read();
    if (!id) return { previous: current, saved: current.includes(id) };
    const willSave = !current.includes(id);
    write(willSave ? [id, ...current] : current.filter((v) => v !== id));
    return { previous: current, saved: willSave };
  }, []);

  const restore = useCallback((snapshot: string[]) => write(snapshot), []);

  const clear = useCallback((): string[] => {
    const previous = read();
    write([]);
    return previous;
  }, []);

  return { ids, hydrated, isSaved, toggle, restore, clear };
}
