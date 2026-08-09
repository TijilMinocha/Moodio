/**
 * Inline nav icons.
 *
 * Replaces the emoji/glyph placeholders (◐, ♥) that never matched the weight
 * of the SVG icons next to them. All drawn on a 24x24 grid with a 1.8 stroke
 * so they sit consistently at any size.
 */
type IconProps = { className?: string; size?: number };

function base(size: number, className?: string) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };
}

export function HomeIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20h14V9.5" />
      <path d="M9.5 20v-5.5h5V20" />
    </svg>
  );
}

export function SearchIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

/** Two overlapping waves -- reads as "tone" rather than a half-filled circle. */
export function MoodIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M3 12c1.5-4 3-4 4.5 0S10.5 16 12 12s3-4 4.5 0 3 4 4.5 0" />
    </svg>
  );
}

export function HeartIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size, className)} fill="currentColor" stroke="none">
      <path d="M12 20.5s-7.5-4.6-7.5-9.8A4.2 4.2 0 0 1 12 8.2a4.2 4.2 0 0 1 7.5 2.5c0 5.2-7.5 9.8-7.5 9.8Z" />
    </svg>
  );
}

export function PlaylistIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M4 7h11M4 12h11M4 17h7" />
      <circle cx="17.5" cy="16.5" r="2.5" />
      <path d="M20 16.5V9l-2 .6" />
    </svg>
  );
}

export function ShuffleIcon({ className, size = 22 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M16 4h4v4" />
      <path d="M4 20 20 4" />
      <path d="M16 20h4v-4" />
      <path d="M4 4l5 5" />
      <path d="M15 15l5 5" />
    </svg>
  );
}

export function RepeatIcon({ className, size = 22 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

export function RepeatOneIcon({ className, size = 22 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
      <path d="M11.5 10.5 13 9.8V15" />
    </svg>
  );
}

export function EyeIcon({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function EyeOffIcon({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M10.6 6.1A9.9 9.9 0 0 1 12 5.5c6.5 0 10 6.5 10 6.5a17 17 0 0 1-3.2 4" />
      <path d="M6.6 7.6A16.6 16.6 0 0 0 2 12s3.5 6.5 10 6.5a9.9 9.9 0 0 0 3.9-.8" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m3 3 18 18" />
    </svg>
  );
}
