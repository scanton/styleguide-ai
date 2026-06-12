/**
 * Returns true if the user prefers reduced motion.
 * Use this before any GSAP animation to decide whether to skip or instant-set.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Returns the appropriate GSAP duration: 0 if reduced motion is preferred,
 * otherwise the provided duration.
 */
export function motionDuration(duration: number): number {
  return prefersReducedMotion() ? 0 : duration;
}
