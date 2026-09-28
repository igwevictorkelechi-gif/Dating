import { NavLink, useNavigate } from 'react-router-dom';
import {
  Check, ChevronLeft, Heart, House, MessagesSquare, Settings, UserRound, Users,
} from 'lucide-react';
import { useApp } from '../store.jsx';

export function Avatar({ person, size = 45 }) {
  const src = person?.avatar || person?.photos?.[0];
  const hue = person?.hue ?? 120;
  const initials = (person?.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('');
  return (
    <div
      className="avatar"
      style={{
        width: size, height: size, fontSize: size * 0.36,
        background: src ? `center / cover no-repeat url(${src})` : `linear-gradient(135deg, hsl(${hue} 50% 62%), hsl(${(hue + 40) % 360} 45% 40%))`,
      }}
      aria-label={person?.name}
      role="img"
    >
      {!src && initials}
    </div>
  );
}

export function BackButton({ to, label = 'Back' }) {
  const navigate = useNavigate();
  return (
    <button type="button" className="icon-btn" aria-label={label} onClick={() => (to ? navigate(to) : navigate(-1))}>
      <ChevronLeft size={30} strokeWidth={2.2} />
    </button>
  );
}

export function TopBar({ back, title, right, backTo }) {
  return (
    <div className="topbar">
      <div>{back !== false && <BackButton to={backTo} />}</div>
      <div>{typeof title === 'string' ? <h1>{title}</h1> : title}</div>
      <div>{right}</div>
    </div>
  );
}

export function Chip({ label, selected, onClick }) {
  return (
    <button type="button" className="chip" aria-pressed={!!selected} onClick={onClick}>
      {label}
      <Check size={20} strokeWidth={2.4} />
    </button>
  );
}

// Single choice when `value` is a string, multiple choice when it's an array.
export function ChipGroup({ options, value, onChange }) {
  const multi = Array.isArray(value);
  return (
    <div className="chips">
      {options.map((opt) => {
        const selected = multi ? value.includes(opt) : value === opt;
        return (
          <Chip
            key={opt}
            label={opt}
            selected={selected}
            onClick={() => {
              if (multi) onChange(selected ? value.filter((v) => v !== opt) : [...value, opt]);
              else onChange(opt);
            }}
          />
        );
      })}
    </div>
  );
}

export function CheckRow({ label, selected, onClick, children }) {
  return (
    <button type="button" className="check-row" aria-pressed={!!selected} onClick={onClick}>
      <span className="check-circle"><Check size={13} strokeWidth={3} /></span>
      {children || label}
    </button>
  );
}

export function BottomNav() {
  const items = [
    { to: '/home', label: 'Home', Icon: House },
    { to: '/profile', label: 'Profile', Icon: UserRound },
    { to: '/dating', label: 'Dating', Icon: Heart },
    { to: '/settings', label: 'Settings', Icon: Settings },
  ];
  return (
    <nav className="bottom-nav" aria-label="Main">
      {items.map(({ to, label, Icon }) => (
        <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>
          <Icon size={28} strokeWidth={1.6} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export function DatingNav() {
  const items = [
    { to: '/dating', label: 'People', Icon: Users, end: true },
    { to: '/dating/me', label: 'My dating profile', Icon: UserRound },
    { to: '/dating/chats', label: 'Chats', Icon: MessagesSquare },
    { to: '/dating/liked', label: 'Liked', Icon: Heart },
  ];
  return (
    <nav className="bottom-nav icons-only" aria-label="Dating">
      {items.map(({ to, label, Icon, end }) => (
        <NavLink key={to} to={to} end={end} aria-label={label} title={label} className={({ isActive }) => (isActive ? 'active' : '')}>
          <Icon size={30} strokeWidth={1.6} />
        </NavLink>
      ))}
    </nav>
  );
}

export function Sheet({ onClose, children }) {
  return (
    <div className="overlay" onClick={onClose} role="presentation">
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {children}
      </div>
    </div>
  );
}

export function Confirm({ title, message, confirmLabel = 'Yes', danger, onConfirm, onCancel }) {
  return (
    <div className="overlay middle" onClick={onCancel} role="presentation">
      <div className="dialog" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
        <h2 id="confirm-title">{title}</h2>
        {message && <p>{message}</p>}
        <div className="actions">
          <button type="button" className="btn btn-ghost" style={{ border: '1px solid var(--line)' }} onClick={onCancel}>Cancel</button>
          <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export function Toast() {
  const { toastMsg } = useApp();
  if (!toastMsg) return null;
  return <div className="toast" role="status">{toastMsg}</div>;
}

// Shared layout for the numbered sign-up steps: content on top, Next pinned to the bottom.
export function StepScreen({ title, children, canNext = true, onNext, nextLabel = 'Next', footer }) {
  return (
    <main className="screen">
      <TopBar title={title} />
      {children}
      <div className="grow" />
      <div style={{ display: 'grid', gap: 8, marginTop: 24 }}>
        <button type="button" className="btn btn-primary btn-block" disabled={!canNext} onClick={onNext}>
          {nextLabel}
        </button>
        {footer}
      </div>
    </main>
  );
}
