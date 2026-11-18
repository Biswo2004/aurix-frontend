import { useEffect, useState } from "react";
export type Theme = "light" | "dark" | "system";
export function useTheme() {
  const [theme, setTheme] = useState<Theme>("system");
  useEffect(() => { setTheme((localStorage.getItem("aurix.theme") as Theme) || "system"); }, []);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => document.documentElement.classList.toggle("dark", theme === "dark" || (theme === "system" && mq.matches));
    apply(); localStorage.setItem("aurix.theme", theme);
    mq.addEventListener("change", apply); return () => mq.removeEventListener("change", apply);
  }, [theme]);
  return { theme, setTheme };
}
