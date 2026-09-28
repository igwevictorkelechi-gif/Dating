import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store.jsx';
import { Logo } from '../components/Logo.jsx';
import { Illustration } from '../components/Art.jsx';
import { TopBar } from '../components/ui.jsx';

export function Splash() {
  const navigate = useNavigate();
  const { state } = useApp();
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    const tick = setInterval(() => setProgress((p) => Math.min(100, p + 12)), 120);
    const done = setTimeout(() => {
      if (state.account && state.verified) navigate(state.onboarded ? '/home' : '/setup/profile', { replace: true });
      else navigate('/welcome', { replace: true });
    }, 1300);
    return () => { clearInterval(tick); clearTimeout(done); };
  }, [navigate, state.account, state.verified, state.onboarded]);

  return (
    <main className="screen center" style={{ gap: 90 }}>
      <Logo size={110} />
      <div style={{ width: 190, height: 6, borderRadius: 6, background: 'var(--line)', overflow: 'hidden' }} role="progressbar" aria-valuenow={progress} aria-label="Loading">
        <div style={{ width: `${progress}%`, height: '100%', background: 'var(--green)', transition: 'width 0.12s linear' }} />
      </div>
    </main>
  );
}

const SLIDES = [
  { title: 'Align with your soulmate', art: 'soulmate' },
  { title: 'Share deep conversations with your soul tribe.', art: 'tribe' },
  { title: '', art: 'together' },
];

export function Welcome() {
  const navigate = useNavigate();
  const [i, setI] = useState(0);
  const last = i === SLIDES.length - 1;
  const startX = useRef(null);

  const onTouchStart = (e) => { startX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (startX.current === null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    if (dx < -40) setI((v) => Math.min(SLIDES.length - 1, v + 1));
    if (dx > 40) setI((v) => Math.max(0, v - 1));
    startX.current = null;
  };

  return (
    <main className="screen" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{ alignItems: 'center', textAlign: 'center' }}>
      <h1 className="title" style={{ minHeight: 52, marginTop: 28 }}>{SLIDES[i].title}</h1>
      <div style={{ width: '100%', display: 'grid', placeItems: 'center', flex: 1 }}>
        <Illustration kind={SLIDES[i].art} />
      </div>
      <div style={{ display: 'grid', gap: 18, justifyItems: 'center', margin: '24px 0 12px' }}>
        {last ? (
          <>
            <button type="button" className="btn btn-primary" style={{ minWidth: 150 }} onClick={() => navigate('/signup')}>Create Account</button>
            <button type="button" className="btn btn-primary" style={{ minWidth: 150 }} onClick={() => navigate('/login')}>Login</button>
          </>
        ) : (
          <button type="button" className="btn btn-primary" style={{ minWidth: 120 }} onClick={() => setI(i + 1)}>Next</button>
        )}
        <div style={{ display: 'flex', gap: 24 }} role="tablist" aria-label="Intro slides">
          {SLIDES.map((_, n) => (
            <button
              key={n}
              type="button"
              role="tab"
              aria-selected={n === i}
              aria-label={`Slide ${n + 1}`}
              onClick={() => setI(n)}
              style={{ width: 12, height: 12, borderRadius: '50%', border: 0, padding: 0, background: n === i || last ? 'var(--green)' : 'var(--line)' }}
            />
          ))}
        </div>
      </div>
    </main>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9\s-]{7,15}$/;

export function Signup() {
  const navigate = useNavigate();
  const { signUp } = useApp();
  const [form, setForm] = useState({ contact: '', password: '', confirm: '' });
  const [touched, setTouched] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const contactOk = EMAIL_RE.test(form.contact.trim()) || PHONE_RE.test(form.contact.trim());
  const passOk = form.password.length >= 8;
  const matchOk = form.password === form.confirm;
  const valid = contactOk && passOk && matchOk && form.confirm;

  const submit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    signUp(form.contact.trim());
    navigate('/otp');
  };

  return (
    <form className="screen" onSubmit={submit} noValidate>
      <TopBar title="Create an account" />
      <input className="field" placeholder="Email or phone number" autoComplete="username" value={form.contact} onChange={set('contact')} aria-label="Email or phone number" />
      <input className="field" type="password" placeholder="Password" autoComplete="new-password" value={form.password} onChange={set('password')} aria-label="Password" />
      <input className="field" type="password" placeholder="Confirm Password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} aria-label="Confirm password" />
      {touched && !contactOk && <p className="error">Enter a valid email address or phone number.</p>}
      {touched && contactOk && !passOk && <p className="error">Use at least 8 characters for your password.</p>}
      {touched && passOk && !matchOk && <p className="error">The passwords don’t match.</p>}
      {!touched && <p className="hint">Passwords need at least 8 characters.</p>}
      <div className="grow" />
      <button type="submit" className="btn btn-primary btn-block" disabled={!valid}>Next</button>
    </form>
  );
}

export function Login() {
  const navigate = useNavigate();
  const { logIn } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const valid = username.trim() && password;

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    logIn(username.trim());
    navigate('/otp');
  };

  return (
    <form className="screen" onSubmit={submit} noValidate>
      <TopBar title="Login" />
      <input className="field" placeholder="Username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} aria-label="Username" />
      <input className="field" type="password" placeholder="Password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-label="Password" />
      <div className="grow" />
      <button type="submit" className="btn btn-primary btn-block" disabled={!valid}>Next</button>
    </form>
  );
}

export function Otp() {
  const navigate = useNavigate();
  const { state, verify } = useApp();
  const [digits, setDigits] = useState(['', '', '', '']);
  const refs = useRef([]);
  const complete = digits.every((d) => /^[0-9]$/.test(d));

  const setDigit = (i, v) => {
    const clean = v.replace(/\D/g, '');
    if (clean.length > 1) { // pasted a whole code
      const next = clean.slice(0, 4).split('');
      setDigits([0, 1, 2, 3].map((n) => next[n] || ''));
      refs.current[Math.min(3, next.length)]?.focus();
      return;
    }
    const next = [...digits];
    next[i] = clean;
    setDigits(next);
    if (clean && i < 3) refs.current[i + 1]?.focus();
  };

  const onKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const submit = (e) => {
    e.preventDefault();
    if (!complete) return;
    verify();
    navigate(state.onboarded ? '/home' : '/setup/profile', { replace: true });
  };

  return (
    <form className="screen" onSubmit={submit} noValidate>
      <TopBar title="Enter OTP" />
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            value={d}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={4}
            aria-label={`Digit ${i + 1}`}
            className="field green"
            style={{ width: 60, height: 60, textAlign: 'center', fontSize: 24, padding: 0, marginBottom: 0 }}
          />
        ))}
      </div>
      <p className="hint" style={{ marginTop: 20 }}>
        We sent a 4-digit code to {state.account?.email || state.account?.username || 'you'}.
        While the app is in preview, any 4 digits will work.
      </p>
      <div className="grow" style={{ maxHeight: 180 }} />
      <button type="submit" className="btn btn-primary btn-block" disabled={!complete}>Next</button>
    </form>
  );
}
