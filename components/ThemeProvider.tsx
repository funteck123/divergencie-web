"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Theme = "light" | "dark";

const ThemeContext = createContext<{
  theme: Theme;
  toggle: () => void;
}>({ theme: "light", toggle: () => {} });

// TKT-0263: the dark-mode class this provider toggles on <html> is global
// (one shared root layout.js for the whole app), but only the marketing
// shell's CSS (app/globals.css) defines any .dark: overrides -- the
// dashboard portal's own components have no dark styling at all. Toggling
// dark mode on a marketing page, then navigating into /dashboard/*, left
// the black .dark background applied with none of the portal's text
// colors adapting -- black text-on-dark-background areas stayed readable
// by luck, but anything relying on a light background under dark text
// (most of the portal) became unreadable black-on-black. Fixed by scoping
// the toggle to marketing routes only: the dashboard always renders light,
// regardless of what's stored, until the portal gets its own dark styles.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith("/dashboard") ?? false;
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = localStorage.getItem("dc-theme") as Theme | null;
    const effective: Theme = stored === "dark" && !isDashboard ? "dark" : "light";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is unavailable during SSR/first render; this mirrors it into state once the client mounts (and again on route change, to re-check isDashboard).
    setTheme(effective);
    document.documentElement.classList.toggle("dark", effective === "dark");
  }, [isDashboard]);

  const toggle = () => {
    if (isDashboard) return; // no dark styling here yet -- nothing to toggle
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("dc-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
