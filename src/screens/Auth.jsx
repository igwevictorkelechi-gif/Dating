import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../store.jsx';
import { Logo, LogoMark } from '../components/Logo.jsx';
import { Portrait } from '../components/Art.jsx';
import { WELCOME_PHOTOS } from '../data/onboarding.js';
import { TopBar } from '../components/ui.jsx';
import { InstallButton } from '../components/Install.jsx';

export function Splash() {
  const navigate = useNavigate();
  const { state } = useApp();
  const [progress, setProgress] = useState(8);
  const [minTimeDone, setMinTimeDone] = useState(false);

  useEffect(() => {
    const tick = setInterval(() => setProgress((p) => Math.min(100, p + 12)), 120);
    const done = setTimeout(() => setMinTimeDone(true), 1300);
    return () => { clearInterval(tick); clearTimeout(done); };
  }, []);

  useEffect(() => {
    if (!minTimeDone || !state.authReady) return;
    if (state.verified) navigate(state.onboarded ? '/home' : '/setup/profile', { replace: true });
    else navigate('/welcome', { replace: true });
  }, [minTimeDone, state.authReady, state.verified, state.onboarded, navigate]);

  return (
    <main className="screen center" style={{ gap: 90 }}>
      <Logo size={110} />
      <div style={{ width: 190, height: 6, borderRadius: 6, background: 'var(--line)', overflow: 'hidden' }} role="progressbar" aria-valuenow={progress} aria-label="Loading">
        <div style={{ width: `${progress}%`, height: '100%', background: 'var(--green)', transition: 'width 0.12s linear' }} />
      </div>
    </main>
  );
}

// A collage tile: the photo, or a drawn placeholder if it can't load (offline, blocked, missing file).
function WelcomePhoto({ photo, index, className }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`welcome-tile ${className}`}>
      {failed
        ? <Portrait person={{ id: `welcome-${index}`, name: ' ', hue: photo.hue }} />
        : <img src={photo.src} alt={photo.alt} loading={index < 3 ? 'eager' : 'lazy'} onError={() => setFailed(true)} />}
    </div>
  );
}

// One welcome page: real people up top, then sign up or log in.
export function Welcome() {
  const navigate = useNavigate();
  const tiles = ['t1', 't2', 't3', 't4', 't5'];
  return (
    <main className="screen welcome">
      <div className="welcome-collage">
        {WELCOME_PHOTOS.slice(0, tiles.length).map((p, i) => <WelcomePhoto key={p.src} photo={p} index={i} className={tiles[i]} />)}
        <span className="welcome-badge" aria-hidden="true"><LogoMark size={44} /></span>
      </div>
      <div className="welcome-copy">
        <h1 className="title">Align with your soulmate</h1>
        <p className="subtitle">Share deep conversations with your soul tribe, and meet people who see the world the way you do.</p>
      </div>
      <div className="welcome-actions">
        <button type="button" className="btn btn-primary btn-block" onClick={() => navigate('/signup')}>Create Account</button>
        <button type="button" className="btn btn-outline btn-block" onClick={() => navigate('/login')}>Login</button>
        <InstallButton />
      </div>
    </main>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Where to go once someone is signed in.
function useAfterSignIn() {
  const navigate = useNavigate();
  const { state } = useApp();
  useEffect(() => {
    if (state.verified) navigate(state.onboarded ? '/home' : '/setup/profile', { replace: true });
  }, [state.verified, state.onboarded, navigate]);
}

export function Signup() {
  const navigate = useNavigate();
  const { signUp } = useApp();
  useAfterSignIn();
  const [form, setForm] = useState({ email: '', password: '', confirm: '' });
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const emailOk = EMAIL_RE.test(form.email.trim());
  const passOk = form.password.length >= 8;
  const matchOk = form.password === form.confirm;
  const valid = emailOk && passOk && matchOk && form.confirm;

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (!valid || busy) return;
    setBusy(true);
    setError('');
    const res = await signUp(form.email.trim().toLowerCase(), form.password);
    setBusy(false);
    if (res.error) setError(res.error);
    else if (res.needsCode) navigate('/otp');
  };

  return (
    <form className="screen" onSubmit={submit} noValidate>
      <TopBar title="Create an account" />
      <input className="field" type="email" placeholder="Email address" autoComplete="email" value={form.email} onChange={set('email')} aria-label="Email address" />
      <input className="field" type="password" placeholder="Password" autoComplete="new-password" value={form.password} onChange={set('password')} aria-label="Password" />
      <input className="field" type="password" placeholder="Confirm Password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} aria-label="Confirm password" />
      {touched && !emailOk && <p className="error">Enter a valid email address.</p>}
      {touched && emailOk && !passOk && <p className="error">Use at least 8 characters for your password.</p>}
      {touched && passOk && !matchOk && <p className="error">The passwords don’t match.</p>}
      {error && <p className="error">{error}</p>}
      {!touched && !error && <p className="hint">Passwords need at least 8 characters. We’ll email you a code to confirm it’s you.</p>}
      <div className="grow" />
      <button type="submit" className="btn btn-primary btn-block" disabled={!valid || busy}>{busy ? 'Creating account…' : 'Next'}</button>
      <button type="button" className="link-btn" onClick={() => navigate('/login')}>I already have an account</button>
    </form>
  );
}

export function Login() {
  const navigate = useNavigate();
  const { logIn } = useApp();
  useAfterSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const valid = EMAIL_RE.test(email.trim()) && password;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError('');
    const res = await logIn(email.trim().toLowerCase(), password);
    setBusy(false);
    if (res.error) setError(res.error);
    else if (res.needsCode) navigate('/otp', { state: { notice: res.notice || 'Your email isn’t confirmed yet. We sent you a new code.' } });
  };

  return (
    <form className="screen" onSubmit={submit} noValidate>
      <TopBar title="Login" />
      <input className="field" type="email" placeholder="Email address" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email address" />
      <input className="field" type="password" placeholder="Password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-label="Password" />
      {error && <p className="error">{error}</p>}
      <div className="grow" />
      <button type="submit" className="btn btn-primary btn-block" disabled={!valid || busy}>{busy ? 'Logging in…' : 'Next'}</button>
      <button type="button" className="link-btn" onClick={() => navigate('/signup')}>Create an account instead</button>
    </form>
  );
}

const CODE_LENGTH = 6;

export function Otp() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, verifyCode, resendCode } = useApp();
  useAfterSignIn();
  const [digits, setDigits] = useState(Array(CODE_LENGTH).fill(''));
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(location.state?.notice || '');
  const refs = useRef([]);
  const complete = digits.every((d) => /^[0-9]$/.test(d));

  useEffect(() => {
    if (!state.pendingEmail && state.authReady && !state.verified) navigate('/signup', { replace: true });
  }, [state.pendingEmail, state.authReady, state.verified, navigate]);

  const setDigit = (i, v) => {
    const clean = v.replace(/\D/g, '');
    if (clean.length > 1) { // pasted a whole code
      const next = clean.slice(0, CODE_LENGTH).split('');
      setDigits(Array.from({ length: CODE_LENGTH }, (_, n) => next[n] || ''));
      refs.current[Math.min(CODE_LENGTH - 1, next.length)]?.focus();
      return;
    }
    const next = [...digits];
    next[i] = clean;
    setDigits(next);
    if (clean && i < CODE_LENGTH - 1) refs.current[i + 1]?.focus();
  };

  const onKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!complete || busy) return;
    setBusy(true);
    setError('');
    const res = await verifyCode(digits.join(''));
    setBusy(false);
    if (res.error) setError(res.error);
  };

  const resend = async () => {
    if (sending) return;
    setSending(true);
    setError('');
    const res = await resendCode();
    setSending(false);
    if (res.error) setError(res.error);
  };

  return (
    <form className="screen" onSubmit={submit} noValidate>
      <TopBar title="Enter OTP" />
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            value={d}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={CODE_LENGTH}
            aria-label={`Digit ${i + 1}`}
            className="field green"
            style={{ width: '100%', maxWidth: 52, height: 58, textAlign: 'center', fontSize: 22, padding: 0, marginBottom: 0 }}
          />
        ))}
      </div>
      <p className="hint" style={{ marginTop: 20 }}>
        We emailed a {CODE_LENGTH}-digit code to <strong>{state.pendingEmail || 'you'}</strong>. It can take a minute to arrive; check your spam folder too.
      </p>
      {error && <p className="error">{error}</p>}
      <button type="button" className="link-btn" style={{ alignSelf: 'flex-start', paddingLeft: 0 }} onClick={resend} disabled={sending}>{sending ? 'Sending…' : 'Send a new code'}</button>
      <div className="grow" style={{ maxHeight: 160 }} />
      <button type="submit" className="btn btn-primary btn-block" disabled={!complete || busy}>{busy ? 'Checking…' : 'Next'}</button>
    </form>
  );
}
