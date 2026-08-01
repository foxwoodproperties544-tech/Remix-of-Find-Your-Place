import { useEffect, useRef, useCallback } from "react";

interface UseMenuKeyboardOptions {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  menuRef: React.RefObject<HTMLElement | null>;
  triggerRef: React.RefObject<HTMLElement | null>;
}

/**
 * WAI-ARIA keyboard support for a disclosure menu (button + menu).
 *
 * - Opens and focuses the first item on trigger ArrowDown (last item on ArrowUp).
 * - Cycles through items with ArrowDown/ArrowUp.
 * - Home/End jump to first/last item.
 * - Tab / Shift+Tab are trapped inside the menu: focus cycles through the menu
 *   items (plus the trigger) instead of escaping to the rest of the page.
 * - Escape closes the menu and returns focus to the trigger.
 */
export function useMenuKeyboard({
  isOpen,
  setIsOpen,
  menuRef,
  triggerRef,
}: UseMenuKeyboardOptions) {
  const itemsRef = useRef<HTMLElement[]>([]);

  const refreshItems = useCallback(() => {
    itemsRef.current = Array.from(
      menuRef.current?.querySelectorAll('[role="menuitem"]') ?? []
    ) as HTMLElement[];
  }, [menuRef]);

  const focusItem = useCallback(
    (index: number) => {
      refreshItems();
      const items = itemsRef.current;
      if (items.length === 0) return;
      const idx = Math.max(0, Math.min(index, items.length - 1));
      items[idx]?.focus();
    },
    [refreshItems]
  );

  // Trigger button keyboard handling.
  useEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const onTriggerKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const wantsLast = e.key === "ArrowUp";
        setIsOpen(true);
        // Wait for menu render then focus the first (or last) item.
        requestAnimationFrame(() => {
          refreshItems();
          const items = itemsRef.current;
          (wantsLast ? items[items.length - 1] : items[0])?.focus();
        });
      }
    };

    trigger.addEventListener("keydown", onTriggerKey);
    return () => trigger.removeEventListener("keydown", onTriggerKey);
  }, [triggerRef, setIsOpen, refreshItems]);

  // Menu keyboard handling when open.
  useEffect(() => {
    if (!isOpen) {
      // Return focus to trigger when menu closes (if focus is still inside menu).
      const menu = menuRef.current;
      if (menu && menu.contains(document.activeElement)) {
        triggerRef.current?.focus();
      }
      return;
    }

    const menu = menuRef.current;
    if (!menu) return;

    const onMenuKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const trigger = triggerRef.current;
      const insideMenu = menu.contains(target);
      const onTrigger = !!trigger && (trigger === target || trigger.contains(target));
      if (!insideMenu && !onTrigger) return;

      refreshItems();
      const items = itemsRef.current;
      const currentIndex = items.indexOf(document.activeElement as HTMLElement);

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          focusItem(currentIndex + 1 >= items.length ? 0 : currentIndex + 1);
          break;
        case "ArrowUp":
          e.preventDefault();
          focusItem(currentIndex - 1 < 0 ? items.length - 1 : currentIndex - 1);
          break;
        case "Home":
          e.preventDefault();
          focusItem(0);
          break;
        case "End":
          e.preventDefault();
          focusItem(items.length - 1);
          break;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          trigger?.focus();
          break;
        case "Tab": {
          // Focus trap: cycle through [trigger, ...items] without leaving the menu.
          if (items.length === 0) return;
          e.preventDefault();
          const ring: HTMLElement[] = trigger ? [trigger, ...items] : items;
          const idx = ring.indexOf(document.activeElement as HTMLElement);
          const next = e.shiftKey
            ? (idx <= 0 ? ring.length - 1 : idx - 1)
            : (idx === -1 || idx + 1 >= ring.length ? 0 : idx + 1);
          ring[next]?.focus();
          break;
        }
      }
    };

    document.addEventListener("keydown", onMenuKey);
    return () => document.removeEventListener("keydown", onMenuKey);
  }, [isOpen, menuRef, triggerRef, setIsOpen, focusItem, refreshItems]);
}
