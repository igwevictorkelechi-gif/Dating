import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Check, ChevronDown, ChevronLeft, EllipsisVertical, Heart, ImagePlus, MapPin, Pencil, SendHorizontal, SlidersHorizontal, Star, X,
} from 'lucide-react';
import { ageFromDob, firstName, resizeImage, timeAgo, useApp } from '../store.jsx';
import { AUTO_REPLIES, INTERESTED_IN, PEOPLE } from '../data/seed.js';
import { Avatar, CheckRow, ChipGroup, DatingNav, Sheet } from '../components/ui.jsx';
import { LogoMark } from '../components/Logo.jsx';
import { Portrait } from '../components/Art.jsx';
import PostCard from '../components/PostCard.jsx';
import { AudioPlayer, Waveform } from './Setup.jsx';

function DatingHeader({ filters = true }) {
  const navigate = useNavigate();
  return (
    <div className="topbar" style={{ padding: '0 20px' }}>
      <button type="button" className="icon-btn" aria-label="Back to home" onClick={() => navigate('/home')}><ChevronLeft size={30} /></button>
      <LogoMark size={56} />
      {filters ? (
        <Link to="/dating/filters" className="icon-btn" aria-label="Filters"><SlidersHorizontal size={28} /></Link>
      ) : <span />}
    </div>
  );
}

function PhotoCard({ person, photo, style, handlers, stamp }) {
  return (
    <div
      {...handlers}
      style={{
        position: 'absolute', inset: 0, borderRadius: 10, overflow: 'hidden',
        boxShadow: 'var(--shadow)', background: 'var(--surface-2)', touchAction: 'pan-y', userSelect: 'none', ...style,
      }}
    >
      {photo
        ? <img src={photo} alt={person.name} draggable="false" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <Portrait person={person} className="fill" />}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent 40%)' }} />
      <div style={{ position: 'absolute', left: 16, right: 16, bottom: 16, color: '#fff', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 18 }}>{person.name}{person.age ? `, ${person.age}` : ''}</div>
          <div style={{ fontSize: 14, marginTop: 4 }}>{person.spiritual}</div>
        </div>
        {person.location && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 13, border: '1px solid rgba(255,255,255,0.7)', borderRadius: 6, padding: '4px 6px', background: 'rgba(0,0,0,0.25)', whiteSpace: 'nowrap' }}>
            <MapPin size={14} />{person.location}
          </span>
        )}
      </div>
      {stamp && (
        <div style={{
          position: 'absolute', top: 28, [stamp === 'like' ? 'left' : 'right']: 20, padding: '4px 12px', borderRadius: 8,
          border: `3px solid ${stamp === 'like' ? 'var(--green)' : 'var(--red)'}`, color: stamp === 'like' ? 'var(--green)' : 'var(--red)',
          fontWeight: 700, fontSize: 24, background: 'rgba(255,255,255,0.85)', transform: `rotate(${stamp === 'like' ? -12 : 12}deg)`,
        }}>
          {stamp === 'like' ? 'ALIGN' : 'NOPE'}
        </div>
      )}
    </div>
  );
}

function StaticChip({ label }) {
  return <span className="chip static">{label}<Check size={20} strokeWidth={2.4} /></span>;
}

export function DatingDetails({ person, audio }) {
  const section = { fontSize: 16, fontWeight: 600, margin: '22px 0 10px' };
  return (
    <div style={{ padding: '4px 30px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        {person.gender && <StaticChip label={person.gender} />}
        {person.orientation && <CheckRow label={person.orientation} selected onClick={() => {}} />}
      </div>
      {person.political && (<><p style={section}>Political view</p><div className="chips"><StaticChip label={person.political} /></div></>)}
      {person.hobbies?.length > 0 && (<><p style={section}>Hobbies</p><div className="chips">{person.hobbies.map((h) => <StaticChip key={h} label={h} />)}</div></>)}
      <p style={section}>Biggest conspiracy theory</p>
      {audio ? <AudioPlayer src={audio} /> : person.theory ? (
        <div style={{ display: 'grid', gap: 10 }}>
          <Waveform />
          <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-2)', fontStyle: 'italic', lineHeight: 1.5 }}>“{person.theory}”</p>
        </div>
      ) : <p className="hint" style={{ margin: 0 }}>No recording yet.</p>}
      {person.causes?.length > 0 && (<><p style={section}>Causes</p><div className="chips">{person.causes.map((c) => <StaticChip key={c} label={c} />)}</div></>)}
      {person.smoke && (<><p style={section}>Do you smoke?</p><div className="chips"><StaticChip label={person.smoke} /></div></>)}
      {person.drink && (<><p style={section}>Do you drink?</p><div className="chips"><StaticChip label={person.drink} /></div></>)}
    </div>
  );
}

const GENDER_FOR = { Men: ['Male'], Women: ['Female'], Both: ['Male', 'Female', 'Other'] };

export function Discover() {
  const navigate = useNavigate();
  const { state, swipe, resetDeck, posts, toast } = useApp();
  const { filters, swipes } = state;
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const [leaving, setLeaving] = useState(null);
  const start = useRef(null);
  const busy = useRef(false);

  const deck = useMemo(() => PEOPLE.filter((p) => (
    !swipes.seen.includes(p.id)
    && GENDER_FOR[filters.seeking].includes(p.gender)
    && p.age >= filters.minAge && p.age <= filters.maxAge
  )), [swipes.seen, filters]);
  const top = deck[0];
  const below = deck[1];

  const decide = (kind) => {
    if (!top || busy.current) return;
    busy.current = true;
    setLeaving(kind === 'pass' ? 'left' : 'right');
    setTimeout(() => {
      const matched = swipe(top.id, kind);
      setLeaving(null);
      setDrag({ x: 0, y: 0, active: false });
      busy.current = false;
      if (kind === 'super') toast(`You super liked ${firstName(top)} ⭐`);
      if (matched) navigate(`/dating/match/${top.id}`);
    }, 260);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest('input, textarea')) return;
      if (e.key === 'ArrowRight') decide('like');
      if (e.key === 'ArrowLeft') decide('pass');
      if (e.key === 'ArrowUp') decide('super');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const handlers = {
    onPointerDown: (e) => { start.current = { x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture(e.pointerId); setDrag({ x: 0, y: 0, active: true }); },
    onPointerMove: (e) => { if (start.current) setDrag({ x: e.clientX - start.current.x, y: (e.clientY - start.current.y) * 0.2, active: true }); },
    onPointerUp: () => {
      if (!start.current) return;
      start.current = null;
      if (drag.x > 100) decide('like');
      else if (drag.x < -100) decide('pass');
      else setDrag({ x: 0, y: 0, active: false });
    },
  };
  handlers.onPointerCancel = handlers.onPointerUp;

  const x = leaving === 'right' ? 500 : leaving === 'left' ? -500 : drag.x;
  const topStyle = {
    transform: `translate(${x}px, ${drag.y}px) rotate(${x / 18}deg)`,
    transition: drag.active && !leaving ? 'none' : 'transform 0.26s ease',
    cursor: 'grab',
  };
  const stamp = drag.x > 40 ? 'like' : drag.x < -40 ? 'pass' : null;
  const theirPosts = top ? posts.filter((p) => p.authorId === top.id) : [];

  const circle = (size, color) => ({
    width: size, height: size, borderRadius: '50%', border: `1px solid ${color}`, background: 'var(--surface)',
    display: 'grid', placeItems: 'center', color, padding: 0,
  });

  return (
    <>
      <main className="screen flush" style={{ paddingTop: 8 }}>
        <DatingHeader />
        <div style={{ position: 'relative', margin: '0 30px', aspectRatio: '332 / 496', maxHeight: '62vh' }}>
          {top ? (
            <>
              {below && <PhotoCard person={below} style={{ transform: 'scale(0.96)', opacity: 0.7 }} />}
              <PhotoCard key={top.id} person={top} style={topStyle} handlers={handlers} stamp={stamp} />
            </>
          ) : (
            <div style={{ position: 'absolute', inset: 0, border: '2px dashed var(--line)', borderRadius: 10, display: 'grid', placeItems: 'center', textAlign: 'center', padding: 24 }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: 18, margin: '0 0 8px' }}>You’ve seen everyone for now</p>
                <p className="hint" style={{ margin: '0 0 16px' }}>Widen your filters or start over to see people again.</p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Link to="/dating/filters" className="btn btn-outline btn-sm">Filters</Link>
                  <button type="button" className="btn btn-primary btn-sm" onClick={resetDeck}>Start over</button>
                </div>
              </div>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 30px 8px' }}>
          <button type="button" style={circle(70, 'var(--red)')} onClick={() => decide('pass')} disabled={!top} aria-label="Pass"><X size={46} strokeWidth={3.2} /></button>
          <button type="button" style={circle(50, '#f5c518')} onClick={() => decide('super')} disabled={!top} aria-label="Super like"><Star size={28} fill="#ffe55e" color="#f5c518" /></button>
          <button type="button" style={circle(70, 'var(--green)')} onClick={() => decide('like')} disabled={!top} aria-label="Like"><Heart size={40} fill="var(--green)" /></button>
        </div>
        {top && (
          <>
            <DatingDetails person={top} />
            {theirPosts.map((post) => <PostCard key={post.id} post={post} />)}
          </>
        )}
      </main>
      <DatingNav />
    </>
  );
}

export function Filters() {
  const navigate = useNavigate();
  const { state, setFilters, toast } = useApp();
  const [f, setF] = useState(state.filters);
  const MIN = 18;
  const MAX = 60;
  const pct = (v) => ((v - MIN) / (MAX - MIN)) * 100;

  const apply = () => { setFilters(f); toast('Filters updated'); navigate('/dating'); };
  const range = { position: 'absolute', inset: 0, width: '100%', margin: 0, background: 'none', pointerEvents: 'none', appearance: 'none', WebkitAppearance: 'none', height: 24 };

  return (
    <>
      <main className="screen">
        <div className="topbar">
          <button type="button" className="icon-btn" aria-label="Back" onClick={() => navigate('/dating')}><ChevronLeft size={30} /></button>
          <h1>Basic Filters</h1>
          <span />
        </div>
        <p className="label" style={{ marginTop: 0 }}>Who are you looking for ?</p>
        <ChipGroup options={INTERESTED_IN} value={f.seeking} onChange={(seeking) => setF({ ...f, seeking })} />
        <p className="label" style={{ marginTop: 30 }}>How old are they?</p>
        <div style={{ position: 'relative', height: 24, margin: '6px 0' }}>
          <div style={{ position: 'absolute', top: 6, left: 0, right: 0, height: 12, borderRadius: 6, background: 'var(--green-soft)' }} />
          <div style={{ position: 'absolute', top: 6, height: 12, borderRadius: 6, background: 'var(--green)', left: `${pct(f.minAge)}%`, right: `${100 - pct(f.maxAge)}%` }} />
          <input type="range" className="dual" min={MIN} max={MAX} value={f.minAge} aria-label="Minimum age" style={range}
            onChange={(e) => setF({ ...f, minAge: Math.min(Number(e.target.value), f.maxAge - 1) })} />
          <input type="range" className="dual" min={MIN} max={MAX} value={f.maxAge} aria-label="Maximum age" style={range}
            onChange={(e) => setF({ ...f, maxAge: Math.max(Number(e.target.value), f.minAge + 1) })} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>
          <span>{f.minAge}</span><span>{f.maxAge}{f.maxAge === MAX ? '+' : ''}</span>
        </div>
        <div className="grow" />
        <button type="button" className="btn btn-primary btn-block" onClick={apply}>Apply filters</button>
      </main>
      <DatingNav />
    </>
  );
}

export function Match() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { person, self, state } = useApp();
  const them = person(id);
  if (!them) return null;
  const myPhoto = state.me.photos[0];
  const card = { position: 'absolute', width: '60%', aspectRatio: '234 / 486', borderRadius: 10, overflow: 'hidden', boxShadow: 'var(--shadow)' };

  return (
    <>
      <main className="screen flush" style={{ paddingTop: 8 }}>
        <DatingHeader />
        <div style={{ position: 'relative', margin: '0 30px', height: 'min(56vh, 490px)' }}>
          <div style={{ ...card, left: '4%', top: 10, transform: 'rotate(-6deg)', height: '96%', width: 'auto' }}>
            {myPhoto ? <img src={myPhoto} alt="You" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Portrait person={self} className="fill" />}
          </div>
          <div style={{ ...card, right: '4%', top: 0, transform: 'rotate(6deg)', height: '96%', width: 'auto' }}>
            <Portrait person={them} className="fill" />
          </div>
          <div style={{ position: 'absolute', left: '50%', bottom: -20, transform: 'translateX(-50%)', background: 'var(--surface)', borderRadius: '50%', padding: 14, boxShadow: 'var(--shadow)' }}>
            <LogoMark size={90} />
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: 36, display: 'grid', gap: 6, justifyItems: 'center', padding: '0 30px' }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>It’s aligning!</h1>
          <p style={{ margin: 0 }}>You and {firstName(them)}. Soulmates?</p>
          <p style={{ margin: '0 0 10px', color: 'var(--ink-2)' }}>Start chatting to find out</p>
          <button type="button" className="btn btn-primary" onClick={() => navigate(`/dating/chats/${them.id}`)}>Message</button>
          <button type="button" className="link-btn" onClick={() => navigate('/dating')}>Keep swiping</button>
        </div>
      </main>
      <DatingNav />
    </>
  );
}

export function Chats() {
  const { state, person } = useApp();
  const [showOlder, setShowOlder] = useState(true);
  const DAY = 24 * 3600 * 1000;
  const matches = state.swipes.matches.filter((id) => !state.closedChats.includes(id));
  const withMessages = matches.filter((id) => state.chats[id]?.length)
    .map((id) => ({ p: person(id), last: state.chats[id][state.chats[id].length - 1] }))
    .sort((a, b) => b.last.at - a.last.at);
  const newMatches = matches.filter((id) => !state.chats[id]?.length).map(person);
  const active = withMessages.filter((c) => Date.now() - c.last.at < 3 * DAY);
  const older = withMessages.filter((c) => Date.now() - c.last.at >= 3 * DAY);

  const row = ({ p, last }) => (
    <li key={p.id} style={{ borderBottom: '1px solid var(--line)' }}>
      <Link to={`/dating/chats/${p.id}`} style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, textDecoration: 'none', minWidth: 0 }}>
        <Avatar person={p} size={60} />
        <div className="meta">
          <strong>{p.name}</strong>
          <span>{last.from === 'me' ? 'You: ' : ''}{last.text || 'Sent a picture'}</span>
        </div>
        <time>{timeAgo(last.at)}</time>
      </Link>
    </li>
  );

  return (
    <>
      <main className="screen flush" style={{ paddingTop: 8 }}>
        <DatingHeader filters={false} />
        <div style={{ padding: '0 30px' }}>
          {newMatches.length > 0 && (
            <>
              <p className="label" style={{ marginTop: 0 }}>New matches</p>
              <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6 }}>
                {newMatches.map((p) => (
                  <Link key={p.id} to={`/dating/chats/${p.id}`} style={{ display: 'grid', justifyItems: 'center', gap: 4, textDecoration: 'none', fontSize: 12 }}>
                    <span style={{ padding: 3, borderRadius: '50%', border: '2px solid var(--green)' }}><Avatar person={p} size={50} /></span>
                    {firstName(p)}
                  </Link>
                ))}
              </div>
            </>
          )}
          <p className="label">Chats (Active)</p>
          {active.length ? <ul className="people">{active.map(row)}</ul> : <p className="hint">No active chats. Say hi to a new match!</p>}
          {older.length > 0 && (
            <>
              <button type="button" className="label" onClick={() => setShowOlder(!showOlder)} aria-expanded={showOlder}
                style={{ background: 'none', border: 0, padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                Older <ChevronDown size={18} style={{ transform: showOlder ? 'none' : 'rotate(-90deg)', transition: 'transform 0.2s' }} />
              </button>
              {showOlder && <ul className="people">{older.map(row)}</ul>}
            </>
          )}
          {matches.length === 0 && <p className="empty">No matches yet. Keep swiping — when someone likes you back, they’ll show up here.</p>}
        </div>
      </main>
      <DatingNav />
    </>
  );
}

export function Chat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, person, sendMessage, closeChat, toast } = useApp();
  const them = person(id);
  const messages = state.chats[id] || [];
  const [text, setText] = useState('');
  const [menu, setMenu] = useState(false);
  const [typing, setTyping] = useState(false);
  const end = useRef(null);
  const fileInput = useRef(null);
  const replyTimer = useRef(null);

  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length, typing]);
  useEffect(() => () => clearTimeout(replyTimer.current), []);

  if (!them) return null;

  // Demo only: the other person replies with a canned message.
  const queueReply = () => {
    clearTimeout(replyTimer.current);
    setTyping(true);
    replyTimer.current = setTimeout(() => {
      setTyping(false);
      sendMessage(id, AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)], 'them');
    }, 1600);
  };

  const send = (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    sendMessage(id, body);
    setText('');
    queueReply();
  };

  const sendPicture = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      sendMessage(id, '', 'me', await resizeImage(file, 700));
      queueReply();
    } catch {
      toast('That file couldn’t be opened as a picture');
    }
  };

  const last = messages[messages.length - 1];
  const bubble = (m) => ({
    maxWidth: '75%', padding: '10px 14px', borderRadius: 18, fontSize: 15, lineHeight: 1.45, overflowWrap: 'anywhere',
    alignSelf: m.from === 'me' ? 'flex-end' : 'flex-start',
    background: m.from === 'me' ? 'var(--bubble-out)' : 'var(--bubble-in)',
    color: m.from === 'me' ? '#fff' : 'var(--ink)',
    borderBottomRightRadius: m.from === 'me' ? 4 : 18,
    borderBottomLeftRadius: m.from === 'me' ? 18 : 4,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 'calc(env(safe-area-inset-top, 0px) + 16px) 20px 12px', borderBottom: '1px solid var(--line-soft)' }}>
        <button type="button" className="icon-btn" aria-label="Back to chats" onClick={() => navigate('/dating/chats')}><ChevronLeft size={30} /></button>
        <Avatar person={them} size={56} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600 }}>{them.name}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>{typing ? 'typing…' : `Last active ${last ? timeAgo(last.at) : '1h'} ago`}</div>
        </div>
        <button type="button" className="icon-btn" aria-label="Chat options" onClick={() => setMenu(true)} style={{ color: 'var(--ink)' }}><EllipsisVertical size={24} /></button>
      </header>

      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.length === 0 && <p className="empty">You matched with {firstName(them)}. Say hello 👋</p>}
        {messages.map((m, i) => (
          <div key={i} style={bubble(m)}>
            {m.image && <img src={m.image} alt="Shared" style={{ borderRadius: 12, marginBottom: m.text ? 6 : 0 }} />}
            {m.text}
          </div>
        ))}
        {typing && <div style={{ ...bubble({ from: 'them' }), color: 'var(--muted)' }}>•••</div>}
        <div ref={end} />
      </main>

      <form onSubmit={send} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 8px calc(10px + var(--safe-bottom, env(safe-area-inset-bottom, 0px)))', borderTop: '1px solid var(--line)' }}>
        <button type="button" className="icon-btn" aria-label="Send a picture" onClick={() => fileInput.current?.click()} style={{ color: 'var(--ink)' }}><ImagePlus size={24} /></button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message"
          aria-label="Message"
          style={{ flex: 1, minWidth: 0, height: 45, borderRadius: 10, border: '1px solid var(--line)', padding: '0 12px', background: 'var(--surface)' }}
        />
        <button type="submit" className="icon-btn" aria-label="Send" disabled={!text.trim()}><SendHorizontal size={26} /></button>
        <input ref={fileInput} type="file" accept="image/*" hidden onChange={sendPicture} />
      </form>

      {menu && (
        <Sheet onClose={() => setMenu(false)}>
          <div className="sheet-group">
            <button type="button" onClick={() => { closeChat(id); toast('Chat closed'); navigate('/dating/chats'); }}>Close the chat</button>
            <button type="button" className="danger" onClick={() => { closeChat(id); toast('Reported. Our team will review it.'); navigate('/dating/chats'); }}>Report and close the chat</button>
          </div>
          <div className="sheet-group"><button type="button" onClick={() => setMenu(false)}>Cancel</button></div>
        </Sheet>
      )}
    </div>
  );
}

export function Liked() {
  const { state, person } = useApp();
  const liked = [...state.swipes.liked].reverse().map(person).filter(Boolean);
  return (
    <>
      <main className="screen flush" style={{ paddingTop: 8 }}>
        <DatingHeader filters={false} />
        <div style={{ padding: '0 30px' }}>
          <p className="label" style={{ marginTop: 0 }}>People you liked</p>
          {liked.length === 0 && <p className="empty">You haven’t liked anyone yet.</p>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            {liked.map((p) => {
              const matched = state.swipes.matches.includes(p.id);
              const superLiked = state.swipes.superliked.includes(p.id);
              return (
                <Link key={p.id} to={matched ? `/dating/chats/${p.id}` : `/u/${p.id}`} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', aspectRatio: '3 / 4', textDecoration: 'none' }}>
                  <Portrait person={p} className="fill" />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent 50%)' }} />
                  {superLiked && <Star size={20} fill="#ffe55e" color="#f5c518" style={{ position: 'absolute', top: 8, right: 8 }} />}
                  <div style={{ position: 'absolute', left: 10, right: 10, bottom: 10, color: '#fff' }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{firstName(p)}, {p.age}</div>
                    <div style={{ fontSize: 12, marginTop: 2 }}>{matched ? 'It’s aligning! Tap to chat' : 'Waiting for them'}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </main>
      <DatingNav />
    </>
  );
}

export function MyDatingProfile() {
  const { state, self } = useApp();
  const me = state.me;
  const card = {
    ...self, age: ageFromDob(me.dob), location: me.location, spiritual: me.spiritual, gender: me.gender, orientation: me.orientation,
    political: me.political, hobbies: me.hobbies, causes: me.causes, smoke: me.smoke, drink: me.drink,
  };
  const edits = [
    ['profile', 'Name, gender & birthday'], ['orientation', 'Orientation'], ['beliefs', 'Beliefs & habits'],
    ['hobbies', 'Hobbies'], ['audio', 'Conspiracy theory'], ['photos', 'Pictures'],
  ];
  return (
    <>
      <main className="screen flush" style={{ paddingTop: 8 }}>
        <DatingHeader filters={false} />
        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, margin: '0 0 12px' }}>This is how others see you</p>
        <div style={{ position: 'relative', margin: '0 30px', aspectRatio: '332 / 496', maxHeight: '62vh' }}>
          <PhotoCard person={card} photo={me.photos[0]} />
        </div>
        {me.photos.length > 1 && (
          <div style={{ display: 'flex', gap: 8, padding: '12px 30px 0', overflowX: 'auto' }}>
            {me.photos.slice(1).map((src, i) => <img key={i} src={src} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }} />)}
          </div>
        )}
        <DatingDetails person={card} audio={me.audio} />
        <div style={{ padding: '0 30px 24px' }}>
          <p className="label">Edit your dating profile</p>
          <div className="rows">
            {edits.map(([step, label]) => (
              <Link key={step} to={`/setup/${step}?edit=1`} className="row-link" style={{ fontSize: 15 }}>
                {label} <Pencil size={18} />
              </Link>
            ))}
          </div>
        </div>
      </main>
      <DatingNav />
    </>
  );
}
