import { useEffect } from "react";

/**
 * Scroll reveal: adds class `.in` to all elements matching `selector`
 * when they enter the viewport, with a per-element stagger.
 */
export function useReveal(selector = ".reveal", stagger = 70) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const els = Array.from(document.querySelectorAll<HTMLElement>(selector));
    if (reduce) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e, i) => {
          if (e.isIntersecting) {
            const el = e.target as HTMLElement;
            window.setTimeout(() => el.classList.add("in"), i * stagger);
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.15 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [selector, stagger]);
}
