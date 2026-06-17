"use client";

import { useCallback, useEffect, useState } from "react";

// Persisted manual override. Absent = follow the OS (prefers-color-scheme).
const KEY = "trixig-theme";

// Inline script string injected pre-paint (see layout.tsx) so the correct
// theme is on <html data-theme> before first paint — no flash. Kept here next
// to the runtime logic so the two stay in sync.
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${KEY}');var d=t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.setAttribute('data-theme',d?'dark':'light');}catch(e){}})();`;

function systemDark() {
  return (
    typeof matchMedia !== "undefined" &&
    matchMedia("(prefers-color-scheme: dark)").matches
  );
}

// Dark-mode state. Defaults to following the OS; the toggle writes an explicit
// override to localStorage. While no override is set, OS changes are tracked
// live. `dark` mirrors the data-theme attribute the init script already set.
export function useTheme() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.getAttribute("data-theme") === "dark");

    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (localStorage.getItem(KEY)) return; // explicit override wins
      const d = mq.matches;
      document.documentElement.setAttribute("data-theme", d ? "dark" : "light");
      setDark(d);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const toggle = useCallback(() => {
    setDark((prev) => {
      const next = !prev;
      document.documentElement.setAttribute(
        "data-theme",
        next ? "dark" : "light",
      );
      // Only persist an override once it diverges from the OS, so the site can
      // keep following the system until the user expresses a preference.
      if (next === systemDark()) localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next ? "dark" : "light");
      return next;
    });
  }, []);

  return { dark, toggle };
}
