// Mirrors the visual viewport into CSS so the mobile layout can shrink to the
// space above the on-screen keyboard instead of being covered by it.

/** Below this share of the full height at the current width, the on-screen keyboard is taken to be open. */
const KEYBOARD_THRESHOLD = 0.75;

/** Viewports shorter than this are compact even without a keyboard, e.g. a phone held sideways. */
const COMPACT_HEIGHT = 520;

export function trackViewport(): void {
  const viewport = window.visualViewport;
  if (!viewport) return;

  const root = document.documentElement;

  // The keyboard changes the height but never the width, so the tallest height seen at a
  // width is the full height for that orientation. Orientation media queries flip when the
  // keyboard makes the viewport wider than tall, and iOS never swaps screen.width/height.
  const fullHeights = new Map<number, number>();

  const update = () => {
    // Pinch-zoom also shrinks the visual viewport; resizing the app then would fight the zoom.
    if (viewport.scale > 1.01) return;

    const width = Math.round(viewport.width);
    const fullHeight = Math.max(fullHeights.get(width) ?? 0, viewport.height);
    fullHeights.set(width, fullHeight);

    const keyboardOpen = viewport.height < fullHeight * KEYBOARD_THRESHOLD;

    root.style.setProperty('--app-height', `${viewport.height}px`);
    root.style.setProperty('--app-top', `${viewport.offsetTop}px`);
    root.toggleAttribute('data-compact', keyboardOpen || viewport.height < COMPACT_HEIGHT);
  };

  update();
  viewport.addEventListener('resize', update);
  viewport.addEventListener('scroll', update);
}
