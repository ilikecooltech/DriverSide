import { useCallback, useEffect, useState } from "react";

/* The phone's approximate location, for local prices. Rounded to two
   decimals (about 1 km) before it leaves this file, and never stored.
   We only ask when the buyer taps "Use my location"; once they've said
   yes, later visits use it without asking again. */

const round = (n) => Math.round(n * 100) / 100;

export function useApproxLocation() {
  const supported = typeof navigator !== "undefined" && "geolocation" in navigator;
  const [coords, setCoords] = useState(null);
  const [status, setStatus] = useState(supported ? "idle" : "unsupported"); // idle | asking | on | denied | unavailable | unsupported

  const locate = useCallback(() => {
    if (!supported) return;
    setStatus("asking");
    navigator.geolocation.getCurrentPosition(
      (p) => { setCoords({ lat: round(p.coords.latitude), lon: round(p.coords.longitude) }); setStatus("on"); },
      (e) => setStatus(e && e.code === 1 ? "denied" : "unavailable"),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 30 * 60 * 1000 }
    );
  }, [supported]);

  // Already allowed on this site? Use it without a prompt.
  useEffect(() => {
    if (!supported || !navigator.permissions?.query) return;
    navigator.permissions.query({ name: "geolocation" }).then((p) => { if (p.state === "granted") locate(); if (p.state === "denied") setStatus("denied"); }).catch(() => {});
  }, [supported, locate]);

  return { coords, status, locate };
}
