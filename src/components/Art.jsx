// Generated artwork used where the Figma file has stock photos and illustrations.
// Replace with real exported assets whenever they're available.

const SCENES = [
  { sky: ['#a8d8f0', '#e9f6fb'], sun: '#ffd27a', hills: ['#6fb36a', '#44953b'] },
  { sky: ['#ffb88c', '#ffe3c6'], sun: '#ff8a4c', hills: ['#3b7a57', '#1f4f38'] },
  { sky: ['#cfd9ff', '#f2f4ff'], sun: '#ffffff', hills: ['#8aa0c8', '#5a6f99'] },
  { sky: ['#7ed3c1', '#e3fbf4'], sun: '#fff4b8', hills: ['#2e9e8f', '#11695d'] },
  { sky: ['#f6c1d0', '#fff0f4'], sun: '#ffe08a', hills: ['#c06c8f', '#8a3f62'] },
  { sky: ['#2b3a67', '#6d7fb3'], sun: '#f5f1c9', hills: ['#1c2541', '#0b132b'] },
];

export function Scene({ index = 0, className }) {
  const s = SCENES[index % SCENES.length];
  const id = `sky${index}`;
  return (
    <svg className={className} viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Photo">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={s.sky[0]} />
          <stop offset="1" stopColor={s.sky[1]} />
        </linearGradient>
      </defs>
      <rect width="400" height="500" fill={`url(#${id})`} />
      <circle cx={120 + index * 37 % 180} cy="150" r="46" fill={s.sun} opacity="0.9" />
      <path d="M0 330 Q100 250 200 310 T400 290 V500 H0Z" fill={s.hills[0]} />
      <path d="M0 400 Q120 340 240 390 T400 370 V500 H0Z" fill={s.hills[1]} />
    </svg>
  );
}

// Portrait placeholder for dating cards: warm gradient with the person's initials.
export function Portrait({ person, className }) {
  const hue = person.hue ?? 120;
  const initials = person.name.split(' ').map((w) => w[0]).slice(0, 2).join('');
  return (
    <svg className={className} viewBox="0 0 332 496" preserveAspectRatio="xMidYMid slice" role="img" aria-label={person.name}>
      <defs>
        <linearGradient id={`pg-${person.id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={`hsl(${hue} 55% 72%)`} />
          <stop offset="1" stopColor={`hsl(${(hue + 40) % 360} 50% 42%)`} />
        </linearGradient>
      </defs>
      <rect width="332" height="496" fill={`url(#pg-${person.id})`} />
      <circle cx="166" cy="190" r="70" fill="rgba(255,255,255,0.22)" />
      <path d="M46 496 C60 360 272 360 286 496Z" fill="rgba(255,255,255,0.22)" />
      <text x="166" y="210" textAnchor="middle" fontFamily="Montserrat, sans-serif" fontWeight="700" fontSize="56" fill="rgba(255,255,255,0.92)">
        {initials}
      </text>
    </svg>
  );
}

// A simple flat figure used by the onboarding illustrations.
function Person({ x, skin, hair, top, bottom, dress, flip, long }) {
  const t = flip ? `translate(${x} 0) scale(-1 1)` : `translate(${x} 0)`;
  return (
    <g transform={t}>
      {long && <path d="M-22 60 Q-26 100 -18 128 L18 128 Q26 100 22 60Z" fill={hair} />}
      <rect x="-9" y="84" width="18" height="16" rx="6" fill={skin} />
      <circle cy="66" r="22" fill={skin} />
      <path d="M-23 64 Q-22 38 0 40 Q22 38 23 64 Q14 50 0 52 Q-14 50 -23 64Z" fill={hair} />
      {dress ? (
        <path d="M-22 100 Q0 94 22 100 L36 200 Q0 212 -36 200Z" fill={top} />
      ) : (
        <>
          <path d="M-24 100 Q0 92 24 100 L26 176 L-26 176Z" fill={top} />
          <rect x="-24" y="172" width="20" height="78" rx="8" fill={bottom} />
          <rect x="4" y="172" width="20" height="78" rx="8" fill={bottom} />
        </>
      )}
      {dress && (
        <>
          <rect x="-16" y="200" width="10" height="50" rx="5" fill={skin} />
          <rect x="6" y="200" width="10" height="50" rx="5" fill={skin} />
        </>
      )}
      <path d="M24 106 Q46 130 54 150" stroke={flip ? skin : top} strokeWidth="12" strokeLinecap="round" fill="none" />
      <path d="M-24 106 Q-34 140 -30 170" stroke={top} strokeWidth="12" strokeLinecap="round" fill="none" />
    </g>
  );
}

function Heart({ x, y, s = 1, fill }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0 8 C-8 0 -18 4 -14 14 C-12 20 0 28 0 28 C0 28 12 20 14 14 C18 4 8 0 0 8Z"
      fill={fill}
    />
  );
}

export function Illustration({ kind }) {
  return (
    <svg viewBox="0 0 340 320" width="100%" role="img" aria-hidden="true" style={{ maxWidth: 340 }}>
      <ellipse cx="170" cy="280" rx="160" ry="36" fill="var(--green-tint)" />
      {kind === 'soulmate' && (
        <>
          <line x1="96" y1="40" x2="110" y2="150" stroke="var(--muted)" strokeWidth="1.5" />
          <Heart x={92} y={24} s={1.6} fill="#44953b" />
          <Heart x={70} y={48} s={1.2} fill="#8cc63f" />
          <Heart x={112} y={52} s={1.1} fill="#b4d5b1" />
          <circle cx="280" cy="50" r="14" fill="#ffc9a8" />
          <g transform="translate(0 20)">
            <Person x={120} skin="#b9784e" hair="#3a2418" top="#44953b" dress long />
            <Person x={226} skin="#5b3a29" hair="#1b1b1b" top="#6fb36a" bottom="#1f3d2c" flip />
          </g>
          <Heart x={172} y={96} s={0.7} fill="#44953b" />
        </>
      )}
      {kind === 'tribe' && (
        <>
          <rect x="30" y="20" width="120" height="50" rx="16" fill="var(--green-tint)" stroke="#44953b" strokeWidth="2" />
          <circle cx="66" cy="45" r="5" fill="#44953b" /><circle cx="90" cy="45" r="5" fill="#44953b" /><circle cx="114" cy="45" r="5" fill="#44953b" />
          <rect x="196" y="6" width="120" height="50" rx="16" fill="#44953b" />
          <Heart x={256} y={16} s={0.9} fill="#fff" />
          <g transform="translate(0 30) scale(1 0.92)">
            <Person x={80} skin="#8d5a3b" hair="#2b1a12" top="#f39a1e" bottom="#34495e" />
            <Person x={170} skin="#c68642" hair="#1b1b1b" top="#44953b" dress long />
            <Person x={260} skin="#5b3a29" hair="#111" top="#8cc63f" bottom="#1f3d2c" flip />
          </g>
        </>
      )}
      {kind === 'together' && (
        <>
          <Heart x={170} y={10} s={5.6} fill="var(--green-tint)" />
          <Heart x={70} y={60} s={0.9} fill="#44953b" />
          <Heart x={280} y={80} s={0.8} fill="#44953b" />
          <Heart x={60} y={150} s={0.6} fill="#b4d5b1" />
          <g transform="translate(0 30)">
            <Person x={120} skin="#b9784e" hair="#1b1b1b" top="#44953b" dress long />
            <Person x={220} skin="#8d5a3b" hair="#1b1b1b" top="#dcefd9" bottom="#44953b" flip />
          </g>
          <line x1="40" y1="282" x2="300" y2="282" stroke="var(--ink)" strokeWidth="1.5" />
        </>
      )}
    </svg>
  );
}
