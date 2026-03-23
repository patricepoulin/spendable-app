/**
 * SpendableMark — v3 S-mark
 * Two interlocking filled bowls on a gradient indigo rounded square.
 * No external deps. Pure inline SVG.
 */
interface Props { size?: number; rx?: number; }

let _markCounter = 0;

export function SpendableMark({ size = 32, rx }: Props) {
  const r  = rx ?? Math.round(size * 0.265);
  // Unique gradient ID per instance to prevent SVG gradient ID collisions
  // when multiple SpendableMark components render on the same page.
  const id = `sm-g-${size}-${++_markCounter}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none"
      xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, display: 'block' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#5D6FE9"/>
          <stop offset="100%" stopColor="#3B4DC8"/>
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx={r} fill={`url(#${id})`}/>
      {/* Upper bowl — right-opening */}
      <path d="M27 13C38 11 48 15 48 24C48 33 38 35 27 33L27 13Z" fill="white"/>
      {/* Lower bowl — left-opening */}
      <path d="M37 31C26 29 16 31 16 40C16 49 26 53 37 51L37 31Z" fill="white"/>
      {/* Waist connector */}
      <rect x="27" y="29.5" width="10" height="5" fill="white"/>
    </svg>
  );
}
