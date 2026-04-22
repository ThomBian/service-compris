/**
 * Shared presentation for boss mini-games inside `BossEncounterOverlay`:
 * dark warm base, brass accent `#e8c97a`, uppercase HUD microcopy (see `.impeccable.md`).
 * Keep fragments as complete Tailwind class strings so they purge reliably.
 */

/** Primary playfield panel behind game entities. */
export const bossArenaSurface = 'rounded-xl bg-black/60';

/** Top/bottom HUD lines (hints, progress) — matches boss intro eyebrow density. */
export const bossHudEyebrow =
  'pointer-events-none text-[10px] font-bold uppercase tracking-[0.28em] text-white/45 sm:text-xs';

/** Keyboard-focusable arena (White Glove). */
export const bossArenaFocusRing =
  'outline-none focus-visible:ring-2 focus-visible:ring-[#e8c97a]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0908]';

/** Grid / tap targets in boss rounds (Handshake, Paparazzi). */
export const bossInteractiveFocus =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e8c97a]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0908]';

export const bossGridTileBase =
  'flex h-16 w-16 items-center justify-center rounded-xl border-2 text-2xl transition-all duration-100 select-none';

export const bossGridTileIdle = 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10';

/** Sequence highlight + brass “attention” states. */
export const bossGoldAttention =
  'border-[#e8c97a] bg-[#e8c97a]/[0.14] scale-110 shadow-[0_0_20px_rgba(232,201,122,0.45)]';

export const bossEmeraldReveal =
  'border-emerald-400/90 bg-emerald-500/15 scale-110 shadow-[0_0_20px_rgba(52,211,153,0.4)]';

export const bossRoseReveal =
  'border-red-400/90 bg-red-500/15 scale-110 shadow-[0_0_20px_rgba(248,113,113,0.4)]';

/** White Glove movable utensil — selected for keyboard control. */
export const bossUtensilSelected =
  'border-[#e8c97a] bg-[#e8c97a]/18 shadow-[0_0_14px_rgba(232,201,122,0.35)] ring-1 ring-[#e8c97a]/35';

export const bossUtensilIdle = 'border-white/35 bg-white/10';

export const bossUtensilSnapped = 'border-[#e8c97a] bg-[#e8c97a]/[0.14]';

export const bossTargetGhost = 'border-2 border-dashed border-[#e8c97a]/33';
