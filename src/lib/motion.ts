// Shared GSAP setup for the v6 cinematic redesign.
// Registers ScrollTrigger once and exposes a reduced-motion guard so every
// section can opt out of animation cleanly.
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let registered = false;

export function initGsap() {
  if (!registered) {
    gsap.registerPlugin(ScrollTrigger);
    registered = true;
  }
  return { gsap, ScrollTrigger };
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// Reveal elements as they enter the viewport, with stagger. Editorial rise, not a uniform fade.
// Sets the hidden start state in JS so there is no flash, and only when motion is allowed; if JS
// never runs (or reduced motion is on) the content is simply visible.
export function revealOnScroll(
  els: ArrayLike<Element>,
  opts: { y?: number; stagger?: number; duration?: number; start?: string } = {},
) {
  const items = Array.from(els) as HTMLElement[];
  if (!items.length || prefersReducedMotion()) return;
  const { gsap, ScrollTrigger } = initGsap();
  const { y = 28, stagger = 0.08, duration = 0.9, start = "top 85%" } = opts;
  gsap.set(items, { y, opacity: 0 });
  ScrollTrigger.batch(items, {
    start,
    onEnter: (batch) =>
      gsap.to(batch, { y: 0, opacity: 1, duration, stagger, ease: "expo.out", overwrite: true }),
  });
}

// Magnetic hover: element drifts toward the cursor, springs back on leave.
// Disabled on touch / reduced-motion. Returns a cleanup function.
export function magnetize(el: HTMLElement, strength = 0.35) {
  if (prefersReducedMotion() || window.matchMedia("(pointer: coarse)").matches) {
    return () => {};
  }
  const onMove = (e: PointerEvent) => {
    const r = el.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    gsap.to(el, { x: x * strength, y: y * strength, duration: 0.5, ease: "power3.out" });
  };
  const onLeave = () => {
    gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.4)" });
  };
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerleave", onLeave);
  return () => {
    el.removeEventListener("pointermove", onMove);
    el.removeEventListener("pointerleave", onLeave);
  };
}

// Smooth inertia scrolling (Lenis), driven by GSAP's ticker so ScrollTrigger stays in sync.
// Dynamic import keeps Lenis out of bundles that never call this. No-ops on reduced motion.
// Also upgrades in-page anchor links to animated scrolls.
export function initSmoothScroll() {
  if (typeof window === "undefined" || prefersReducedMotion()) return;
  const { gsap, ScrollTrigger } = initGsap();
  import("lenis").then(({ default: Lenis }) => {
    const lenis = new Lenis({ lerp: 0.12 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);

    document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href");
        if (!id || id.length < 2) return;
        const target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          lenis.scrollTo(target as HTMLElement, { offset: -1 });
        }
      });
    });
  });
}
