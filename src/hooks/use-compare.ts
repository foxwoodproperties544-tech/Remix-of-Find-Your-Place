import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";

const KEY = "fx-compare";
const MAX = 4;

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch { return []; }
}

const listeners = new Set<() => void>();
function emit() { listeners.forEach((l) => l()); }

export function useCompare() {
  const [ids, setIds] = useState<string[]>(() => read());

  useEffect(() => {
    const l = () => setIds(read());
    listeners.add(l);
    window.addEventListener("storage", l);
    return () => { listeners.delete(l); window.removeEventListener("storage", l); };
  }, []);

  const save = (next: string[]) => {
    localStorage.setItem(KEY, JSON.stringify(next));
    emit();
  };

  const toggle = useCallback((id: string) => {
    const cur = read();
    if (cur.includes(id)) {
      save(cur.filter((x) => x !== id));
      toast("Removed from compare");
    } else {
      if (cur.length >= MAX) { toast.error(`You can compare up to ${MAX} properties`); return; }
      save([...cur, id]);
      toast.success("Added to compare", { action: { label: "View", onClick: () => (window.location.href = "/compare") } });
    }
  }, []);

  const remove = useCallback((id: string) => save(read().filter((x) => x !== id)), []);
  const clear = useCallback(() => save([]), []);

  return { ids, has: (id: string) => ids.includes(id), toggle, remove, clear, max: MAX };
}
