/**
 * Window-level pointer drag. The mockup installs a single global
 * pointermove/pointerup pair; this is the same idea scoped per gesture, so a
 * drag keeps tracking after the pointer leaves the element.
 */
export function startDrag(onMove: (e: PointerEvent) => void, onEnd?: () => void): void {
  const move = (e: PointerEvent) => onMove(e);
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
    onEnd?.();
  };
  window.addEventListener('pointermove', move, { passive: true });
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
}
