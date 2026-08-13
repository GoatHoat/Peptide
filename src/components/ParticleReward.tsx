/**
 * The 7-day streak particle reward.
 *
 * NOT BUILT — deliberately, per PROMPT_WEBAPP.md §4. `ParticleReward.swift` at
 * the repo root is the iOS reference; it is not being ported yet.
 *
 * This component is intentionally not rendered by any screen. It marks the slot
 * so the port has somewhere obvious to land.
 */
export function ParticleReward() {
  return (
    <div
      data-placeholder="particle-reward"
      className="pointer-events-none absolute inset-0"
      style={{ zIndex: 8 }}
    >
      {/* TODO: port ParticleReward.swift — fires once when the streak hits 7 days.
          Not part of this build. */}
    </div>
  );
}
