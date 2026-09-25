import { useEffect, useRef, useState } from "react";

/* Browser history for an app that has no URLs.

   Every meaningful move (tab, dealer view, profile, vehicle page) becomes
   a history entry, so the phone's back button and the browser's back
   arrow retrace the buyer's path instead of leaving the site. Each entry
   carries the one before it, so an in-app Back button can name where it
   goes ("‹ Shop") even after a refresh.

   `snapshot` must be plain JSON. `restore(snapshot)` puts the app back in
   that state; it is called on popstate and must not push. */

export function useNavHistory({ active, snapshot, restore }) {
  const key = JSON.stringify(snapshot);
  const [entry, setEntry] = useState(null);
  const fromPop = useRef(false);
  const restoreRef = useRef(restore);
  restoreRef.current = restore;

  useEffect(() => {
    if (!active || typeof window === "undefined") return;
    const st = window.history.state;
    const same = st?.ds && JSON.stringify(st.ds) === key;
    if (same) { fromPop.current = false; setEntry(st); return; }
    /* The first entry, or a restore that couldn't land exactly where the
       entry said (a vehicle page after a refresh): replace, don't stack. */
    if (!st?.ds || fromPop.current) {
      fromPop.current = false;
      const next = { ds: snapshot, prev: st?.prev || null, depth: st?.depth || 0 };
      window.history.replaceState(next, "");
      setEntry(next);
      return;
    }
    const next = { ds: snapshot, prev: st.ds, depth: (st.depth || 0) + 1 };
    window.history.pushState(next, "");
    setEntry(next);
  }, [key, active]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onPop = (e) => {
      const st = e.state;
      if (!st?.ds) return;
      fromPop.current = true;
      setEntry(st);
      restoreRef.current(st.ds);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return {
    back: () => (entry && entry.depth > 0 ? entry.prev : null),
    goBack: () => window.history.back(),
  };
}
