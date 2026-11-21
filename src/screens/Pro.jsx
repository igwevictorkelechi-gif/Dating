import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Check, ChevronRight, Copy, Infinity as InfinityIcon, ShieldCheck, Star } from 'lucide-react';
import { swipesLeft, useApp } from '../store.jsx';
import { BottomNav, TopBar } from '../components/ui.jsx';

const naira = (n) => `₦${Number(n).toLocaleString('en-NG')}`;
const longDate = (d) => new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });

function useCountdown(until) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!until) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [until]);
  if (!until) return null;
  const left = Math.max(0, new Date(until).getTime() - now);
  const m = Math.floor(left / 60000);
  const s = Math.floor((left % 60000) / 1000);
  return { left, label: `${m}:${String(s).padStart(2, '0')}` };
}

function CopyRow({ label, value, big }) {
  const { toast } = useApp();
  const copy = async () => {
    try { await navigator.clipboard.writeText(String(value)); toast(`${label} copied`); } catch { toast('Couldn’t copy. Select it and copy instead.'); }
  };
  return (
    <div className="pay-row">
      <span>{label}</span>
      <strong className={big ? 'big' : ''}>{value}</strong>
      <button type="button" className="icon-btn" onClick={copy} aria-label={`Copy ${label.toLowerCase()}`}><Copy size={18} /></button>
    </div>
  );
}

// alignment Pro: what it unlocks, the price, and paying with CheqPay by bank transfer.
export function Pro() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { state, loadPlan, startCheckout, checkPayment, paymentStatus } = useApp();
  const plan = state.plan;
  const [payment, setPayment] = useState(null); // { id, account_number, bank_name, account_name, amount_kobo, expires_at }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [paid, setPaid] = useState(false);
  const countdown = useCountdown(payment?.expires_at);
  const expired = countdown && countdown.left === 0;
  const reason = params.get('reason');
  const polling = useRef(null);

  useEffect(() => { loadPlan(); }, [loadPlan]);

  // While an account number is showing, watch for the payment to land.
  useEffect(() => {
    if (!payment || paid || expired) return undefined;
    polling.current = setInterval(async () => {
      const row = await paymentStatus(payment.id);
      if (row?.status === 'paid') { setPaid(true); loadPlan(); }
    }, 5000);
    return () => clearInterval(polling.current);
  }, [payment, paid, expired, paymentStatus, loadPlan]);

  const pay = async () => {
    setBusy(true);
    setError('');
    const res = await startCheckout();
    setBusy(false);
    if (res.error) setError(res.error);
    else setPayment(res.payment);
  };

  const iPaid = async () => {
    setBusy(true);
    setError('');
    const res = await checkPayment(payment.id);
    setBusy(false);
    if (res.error) setError(res.error);
    else if (res.payment?.status === 'paid') { setPaid(true); loadPlan(); }
    else setError('We haven’t received it yet. Bank transfers usually arrive within a minute or two; this page updates by itself.');
  };

  const left = swipesLeft(plan);
  const price = plan?.price_naira;
  const days = plan?.pro_days;

  if (paid || plan?.is_pro) {
    return (
      <>
        <main className="screen pro">
          <TopBar title="alignment Pro" backTo="/dating" />
          <div className="pro-hero done">
            <span className="pro-mark"><Check size={34} strokeWidth={3} /></span>
            <h1 className="title">{paid ? 'You’re Pro!' : 'You’re on Pro'}</h1>
            {plan?.pro_until && <p className="subtitle">Pro is active until {longDate(plan.pro_until)}.</p>}
          </div>
          <Benefits />
          <div className="grow" />
          <button type="button" className="btn btn-primary btn-block" onClick={() => navigate('/dating', { replace: true })}>Start swiping</button>
          {plan?.is_pro && !paid && price && <button type="button" className="link-btn" onClick={() => { setPaid(false); pay(); }}>Add another {days} days for {naira(price)}</button>}
          {payment && !paid && <PaymentBox payment={payment} countdown={countdown} expired={expired} busy={busy} onPaid={iPaid} onRetry={pay} />}
        </main>
        <BottomNav />
      </>
    );
  }

  return (
    <>
      <main className="screen pro">
        <TopBar title="alignment Pro" backTo="/dating" />
        <div className="pro-hero">
          <span className="pro-mark"><Star size={30} fill="currentColor" /></span>
          <h1 className="title">
            {reason === 'limit' ? 'You’ve used your free swipes' : reason === 'pro_only' ? 'Super likes are a Pro feature' : 'Go Pro'}
          </h1>
          <p className="subtitle">
            {!reason && left !== null && left > 0 ? `You have ${left} free swipe${left === 1 ? '' : 's'} left. ` : ''}
            Upgrade to keep meeting people with no limits.
          </p>
        </div>
        <Benefits />

        {!payment ? (
          <>
            <div className="pro-price">
              <strong>{price ? naira(price) : '…'}</strong>
              <span>{days ? `for ${days} days` : ''}</span>
            </div>
            {error && <p className="error">{error}</p>}
            <div className="grow" />
            <button type="button" className="btn btn-primary btn-block cheqpay-btn" onClick={pay} disabled={busy || !price}>
              {busy ? 'Getting your account number…' : 'Pay with CheqPay'}
            </button>
            <p className="hint" style={{ textAlign: 'center', marginTop: 10 }}>
              <ShieldCheck size={14} style={{ verticalAlign: '-2px' }} /> You’ll get an account number to send the exact amount to by bank transfer.
            </p>
          </>
        ) : (
          <>
            <PaymentBox payment={payment} countdown={countdown} expired={expired} busy={busy} onPaid={iPaid} onRetry={pay} />
            {error && <p className="error">{error}</p>}
          </>
        )}
      </main>
      <BottomNav />
    </>
  );
}

function Benefits() {
  return (
    <ul className="pro-benefits">
      <li><InfinityIcon size={20} /> Unlimited swipes</li>
      <li><Star size={20} /> Super likes that get noticed first</li>
    </ul>
  );
}

function PaymentBox({ payment, countdown, expired, busy, onPaid, onRetry }) {
  const amount = payment.amount_kobo / 100;
  if (expired) {
    return (
      <div className="pay-box">
        <p className="pay-title">This account number has expired</p>
        <p className="hint">Don’t send money to it. Get a new one below.</p>
        <button type="button" className="btn btn-primary btn-block" onClick={onRetry} disabled={busy}>Get a new account number</button>
      </div>
    );
  }
  return (
    <div className="pay-box">
      <p className="pay-title">Transfer exactly {naira(amount)} to:</p>
      <CopyRow label="Account number" value={payment.account_number} big />
      <CopyRow label="Bank" value={payment.bank_name} />
      <CopyRow label="Account name" value={payment.account_name} />
      <CopyRow label="Amount" value={naira(amount)} />
      <p className="hint" style={{ margin: '10px 0 14px' }}>
        This account number is for this payment only and works for {countdown?.label ?? '…'} more. Pro turns on by itself once the money arrives.
      </p>
      <button type="button" className="btn btn-outline btn-block" onClick={onPaid} disabled={busy}>{busy ? 'Checking…' : 'I’ve sent the money'}</button>
      <p className="hint" style={{ textAlign: 'center', marginTop: 10 }}>Payments by <strong>CheqPay</strong></p>
    </div>
  );
}

// Admins: free swipes, free trial, Pro price and length; give someone Pro.
export function AdminSettings() {
  const { state, loadPlan, adminUpdateSettings, adminGrantPro, toast } = useApp();
  const plan = state.plan;
  const [f, setF] = useState(null);
  const [grant, setGrant] = useState({ username: '', days: 30 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { loadPlan(); }, [loadPlan]);
  useEffect(() => {
    if (plan && !f) setF({ freeSwipes: plan.free_swipes, trialDays: plan.free_trial_days ?? 0, price: plan.price_naira, days: plan.pro_days });
  }, [plan, f]);

  if (!plan) return <main className="screen"><TopBar title="Admin" backTo="/settings" /><p className="hint">Loading…</p></main>;
  if (!plan.is_admin) {
    return <main className="screen"><TopBar title="Admin" backTo="/settings" /><p className="empty">Only admins can open this page.</p></main>;
  }

  const num = (k) => (e) => setF({ ...f, [k]: e.target.value === '' ? '' : Math.max(0, Math.floor(Number(e.target.value))) });
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await adminUpdateSettings({ freeSwipes: Number(f.freeSwipes), trialDays: Number(f.trialDays || 0), price: Number(f.price), days: Number(f.days) });
    setBusy(false);
    if (res.error) setError(res.error); else toast('Settings saved');
  };
  const give = async (e) => {
    e.preventDefault();
    const res = await adminGrantPro(grant.username.trim(), Number(grant.days));
    if (res.error) toast(res.error);
    else toast(`@${grant.username.replace(/^@/, '')} has Pro until ${longDate(res.proUntil)}`);
  };

  return (
    <>
      <main className="screen">
        <TopBar title="Admin" backTo="/settings" />
        <form onSubmit={save} className="admin-form">
          <p className="label" style={{ marginTop: 0 }}>Free plan</p>
          <label className="pf-field">Free swipes per person<input className="field" type="number" min="0" max="1000" value={f?.freeSwipes ?? ''} onChange={num('freeSwipes')} /></label>
          <label className="pf-field">Free trial (days of unlimited swipes after joining, 0 = none)<input className="field" type="number" min="0" max="365" value={f?.trialDays ?? ''} onChange={num('trialDays')} /></label>
          <p className="label">Pro</p>
          <label className="pf-field">Price (₦)<input className="field" type="number" min="100" value={f?.price ?? ''} onChange={num('price')} /></label>
          <label className="pf-field">Pro lasts (days)<input className="field" type="number" min="1" max="366" value={f?.days ?? ''} onChange={num('days')} /></label>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
        </form>

        <form onSubmit={give} className="admin-form" style={{ marginTop: 28 }}>
          <p className="label" style={{ marginTop: 0 }}>Give someone Pro</p>
          <div className="field-row">
            <input className="field" placeholder="@username" value={grant.username} onChange={(e) => setGrant({ ...grant, username: e.target.value })} aria-label="Username" />
            <input className="field" type="number" value={grant.days} onChange={(e) => setGrant({ ...grant, days: e.target.value })} aria-label="Days" style={{ maxWidth: 100 }} />
          </div>
          <p className="hint" style={{ marginTop: -6 }}>Days to add. Use a negative number to take days away.</p>
          <button type="submit" className="btn btn-outline btn-block" disabled={!grant.username.trim()}>Give Pro</button>
        </form>
        <p className="hint" style={{ marginTop: 20 }}>Payments, flagged keywords and reports are also in the Supabase dashboard (Table Editor).</p>
        <Link to="/pro" className="row-link" style={{ marginTop: 8 }}>See the Pro page as users do <ChevronRight size={18} /></Link>
      </main>
      <BottomNav />
    </>
  );
}
