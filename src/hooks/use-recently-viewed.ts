import { useCallback, useEffect, useState } from "react";

const KEY = "foxwood:recently-viewed";
const MAX = 12;

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids.slice(0, MAX)));
    window.dispatchEvent(new CustomEvent("foxwood:recently-viewed-changed"));
  } catch {
    /* ignore */
  }
}

export function useRecentlyViewed() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    setIds(read());
    const onChange = () => setIds(read());
    window.addEventListener("foxwood:recently-viewed-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("foxwood:recently-viewed-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const track = useCallback((id: string) => {
    if (!id) return;
    const current = read().filter((v) => v !== id);
    write([id, ...current]);
  }, []);

  const clear = useCallback(() => write([]), []);

  return { ids, track, clear };
}

export function trackRecentlyViewed(id: string) {
  if (!id || typeof window === "undefined") return;
  const current = read().filter((v) => v !== id);
  write([id, ...current]);
}
