/**
 * The rotating capsule animation.
 *
 * NOT BUILT — deliberately, per PROMPT_WEBAPP.md §4. The rendered frames live
 * in `capsule/` (frame_0001.png …) but they have not been placed anywhere,
 * because their location has not been decided yet.
 *
 * This component is intentionally not rendered by any screen. When the target
 * screen is chosen, drop it in and fill the container below.
 */
export function CapsuleAnimation() {
  return (
    <div
      data-placeholder="capsule-animation"
      className="flex items-center justify-center"
      style={{ minHeight: 200 }}
    >
      {/* TODO: rotating capsule animation — frames are in /capsule (frame_0001…N.png).
          Awaiting a decision on which screen this belongs to. Do not place it
          anywhere until then. */}
    </div>
  );
}
