import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Copy, Moon, Sun } from 'lucide-react';
import { useApp } from '../store.jsx';
import { SUPPORT_EMAIL } from '../data/seed.js';
import { BottomNav, CheckRow, Confirm, TopBar } from '../components/ui.jsx';

export function Settings() {
  const navigate = useNavigate();
  const { logOut, deleteAccount } = useApp();
  const [confirm, setConfirm] = useState(null);

  return (
    <>
      <main className="screen">
        <TopBar title="Settings" backTo="/home" />
        <div className="rows">
          <Link to="/settings/account" className="row-link">Account <ChevronRight size={20} /></Link>
          <Link to="/settings/appearance" className="row-link">Appearance <ChevronRight size={20} /></Link>
          <Link to="/settings/help" className="row-link">Help and support <ChevronRight size={20} /></Link>
          <button type="button" className="row-link" onClick={() => setConfirm('logout')}>Log out <ChevronRight size={20} /></button>
          <button type="button" className="row-link danger" onClick={() => setConfirm('delete')}>Delete account</button>
        </div>
      </main>
      <BottomNav />
      {confirm === 'logout' && (
        <Confirm
          title="Log out?"
          message="You can log back in any time."
          confirmLabel="Log out"
          onCancel={() => setConfirm(null)}
          onConfirm={() => { logOut(); navigate('/welcome', { replace: true }); }}
        />
      )}
      {confirm === 'delete' && (
        <Confirm
          title="Are you sure?"
          message="This permanently deletes your account, profile, posts and chats."
          confirmLabel="Yes"
          danger
          onCancel={() => setConfirm(null)}
          onConfirm={() => { deleteAccount(); navigate('/welcome', { replace: true }); }}
        />
      )}
    </>
  );
}

export function Account() {
  const { state } = useApp();
  const row = { display: 'grid', gap: 6, padding: '14px 0', borderBottom: '1px solid var(--line)' };
  return (
    <>
      <main className="screen">
        <TopBar title="Account" />
        <div style={row}>
          <span style={{ fontWeight: 600 }}>Email</span>
          <span style={{ color: 'var(--ink-2)', overflowWrap: 'anywhere' }}>{state.account?.email || 'Not added yet'}</span>
        </div>
        <div style={row}>
          <span style={{ fontWeight: 600 }}>Password</span>
          <span style={{ color: 'var(--ink-2)', letterSpacing: 2 }}>*********</span>
        </div>
        <Link to="/settings/password" className="btn btn-outline" style={{ marginTop: 24, alignSelf: 'flex-start' }}>Change password</Link>
      </main>
      <BottomNav />
    </>
  );
}

export function ChangePassword() {
  const navigate = useNavigate();
  const { toast } = useApp();
  const [f, setF] = useState({ old: '', next: '', confirm: '' });
  const [tried, setTried] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const longEnough = f.next.length >= 8;
  const matches = f.next === f.confirm;
  const valid = f.old && longEnough && matches;

  const submit = (e) => {
    e.preventDefault();
    setTried(true);
    if (!valid) return;
    toast('Password changed');
    navigate('/settings/account');
  };

  return (
    <>
      <form className="screen" onSubmit={submit} noValidate>
        <TopBar title="Change password" />
        <input className="field" type="password" placeholder="Old password" autoComplete="current-password" value={f.old} onChange={set('old')} aria-label="Old password" />
        <input className="field" type="password" placeholder="New password" autoComplete="new-password" value={f.next} onChange={set('next')} aria-label="New password" />
        <input className="field" type="password" placeholder="Confirm password" autoComplete="new-password" value={f.confirm} onChange={set('confirm')} aria-label="Confirm new password" />
        {tried && !longEnough && <p className="error">Use at least 8 characters for your new password.</p>}
        {tried && longEnough && !matches && <p className="error">The new passwords don’t match.</p>}
        <div className="grow" />
        <button type="submit" className="btn btn-primary btn-block" disabled={!f.old || !f.next || !f.confirm}>Done</button>
      </form>
      <BottomNav />
    </>
  );
}

export function Appearance() {
  const { state, setTheme } = useApp();
  return (
    <>
      <main className="screen">
        <TopBar title="Appearance" />
        <div className="check-list" style={{ gap: 14 }}>
          <CheckRow selected={state.theme === 'dark'} onClick={() => setTheme('dark')}>
            <Moon size={20} /> Dark mode
          </CheckRow>
          <CheckRow selected={state.theme === 'light'} onClick={() => setTheme('light')}>
            <Sun size={20} /> Light mode
          </CheckRow>
        </div>
      </main>
      <BottomNav />
    </>
  );
}

export function Help() {
  const { toast } = useApp();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      toast('Email address copied');
    } catch {
      toast('Couldn’t copy. Select the address instead.');
    }
  };
  return (
    <>
      <main className="screen">
        <TopBar title="Help and support" />
        <p className="label" style={{ marginTop: 0 }}>Contact support</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: 'var(--green)', fontWeight: 600, userSelect: 'all' }}>{SUPPORT_EMAIL}</a>
          <button type="button" className="icon-btn" onClick={copy} aria-label="Copy email address"><Copy size={18} /></button>
        </div>
        <p className="hint">We usually reply within one working day.</p>
      </main>
      <BottomNav />
    </>
  );
}
