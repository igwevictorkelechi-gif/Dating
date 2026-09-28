// Redrawn from the Figma logo: a green ring that opens into an orange heart.
export function LogoMark({ size = 60 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="alignment">
      <defs>
        <linearGradient id="ring" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8cc63f" />
          <stop offset="1" stopColor="#2e7d32" />
        </linearGradient>
      </defs>
      <path d="M60 30 A30 30 0 1 0 67 70" fill="none" stroke="url(#ring)" strokeWidth="13" strokeLinecap="round" />
      <path
        d="M72 72 C60 62 55 52 60 45 C64 40 71 41 72 47 C73 41 80 40 84 45 C89 52 84 62 72 72 Z"
        fill="none" stroke="#f39a1e" strokeWidth="6" strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ size = 60, word = true }) {
  return (
    <div style={{ display: 'grid', justifyItems: 'center', gap: 2 }}>
      <LogoMark size={size} />
      {word && (
        <span style={{ color: 'var(--green-dark)', fontWeight: 500, fontSize: size * 0.28, letterSpacing: '0.01em', lineHeight: 1 }}>
          alignment
        </span>
      )}
    </div>
  );
}
