/**
 * A list that has not arrived yet, drawn at the size it will be.
 *
 * Every list in the app said "Loading…" on one centred line and then replaced
 * it with rows several times taller. Everything below jumped — on Today that
 * meant the schedule pushed the upsell and the Add button down the moment the
 * network answered, which is the seam this exists to remove.
 *
 * No shimmer. A sweep is a gradient and this app does not have gradients; the
 * block is the card colour at the card's radius, and the only motion is a small
 * opacity pulse so "loading" does not read as "loaded and blank". Reduced
 * motion turns even that off.
 */
interface Props {
  /** how many placeholder rows — pick the count a typical screen shows */
  rows?: number;
  /** the loaded row's height, so nothing moves when the real one lands */
  height: number;
  /** the list's own gap */
  gap?: number;
  radius?: number;
  /** read out instead of the rows, which are decoration */
  label?: string;
}

export function Skeleton({ rows = 3, height, gap = 8, radius = 16, label = 'Loading' }: Props) {
  return (
    <div className="skel" role="status" aria-label={label} aria-live="polite" style={{ gap }}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skel-row" style={{ height, borderRadius: radius }} aria-hidden />
      ))}
    </div>
  );
}
