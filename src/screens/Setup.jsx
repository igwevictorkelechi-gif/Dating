import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mic, Pause, Play, Plus, RotateCcw, Square, X, Check } from 'lucide-react';
import { ageFromDob, resizeImage, useApp } from '../store.jsx';
import {
  CAUSES, GENDERS, HABITS, HOBBIES, INTERESTED_IN, ORIENTATIONS, PEOPLE, POLITICAL, SPIRITUAL,
} from '../data/seed.js';
import { Avatar, CheckRow, ChipGroup, StepScreen } from '../components/ui.jsx';

const ORDER = ['profile', 'orientation', 'beliefs', 'hobbies', 'audio', 'photos', 'creators'];

// Moves to the next step, or back to the dating profile when editing a single step.
function useStepNav(step) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editing = params.get('edit') === '1';
  return () => {
    if (editing) return navigate('/dating/me');
    const next = ORDER[ORDER.indexOf(step) + 1];
    navigate(`/setup/${next}`);
  };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function SetupProfile() {
  const { state, saveProfile, setFilters } = useApp();
  const next = useStepNav('profile');
  const [f, setF] = useState(() => ({
    ...state.me,
    username: state.me.username || state.account?.username || '',
  }));
  const set = (patch) => setF((v) => ({ ...v, ...patch }));
  const age = ageFromDob(f.dob);
  const tooYoung = age !== null && age < 18;
  const valid = f.firstName.trim() && f.lastName.trim() && f.username.trim() && f.gender && age !== null && !tooYoung && f.interestedIn;
  const thisYear = new Date().getFullYear();

  const selectStyle = { width: 'auto', height: 40, marginBottom: 0, padding: '0 12px', borderColor: 'var(--green)', borderRadius: 8, fontSize: 14 };

  return (
    <StepScreen title="Create dating profile" canNext={valid} onNext={() => { saveProfile({ ...f, firstName: f.firstName.trim(), lastName: f.lastName.trim(), username: f.username.trim() }); setFilters({ ...state.filters, seeking: f.interestedIn }); next(); }}>
      <p className="subtitle">Tell us a bit about yourself</p>
      <p className="label" style={{ marginTop: 0, fontSize: 14 }}>Full name</p>
      <div className="field-row">
        <input className="field green" placeholder="First name" value={f.firstName} onChange={(e) => set({ firstName: e.target.value })} aria-label="First name" autoComplete="given-name" style={{ marginBottom: 16 }} />
        <input className="field green" placeholder="Last name" value={f.lastName} onChange={(e) => set({ lastName: e.target.value })} aria-label="Last name" autoComplete="family-name" style={{ marginBottom: 16 }} />
      </div>
      <input className="field green" placeholder="Username" value={f.username} onChange={(e) => set({ username: e.target.value.replace(/\s/g, '') })} aria-label="Username" style={{ marginBottom: 8 }} />

      <p className="label">Gender</p>
      <ChipGroup options={GENDERS} value={f.gender} onChange={(gender) => set({ gender })} />

      <p className="label">DOB</p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <select className="field" style={selectStyle} value={f.dob.d} onChange={(e) => set({ dob: { ...f.dob, d: e.target.value } })} aria-label="Day">
          <option value="">Date</option>
          {Array.from({ length: 31 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
        </select>
        <select className="field" style={selectStyle} value={f.dob.m} onChange={(e) => set({ dob: { ...f.dob, m: e.target.value } })} aria-label="Month">
          <option value="">Month</option>
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <select className="field" style={selectStyle} value={f.dob.y} onChange={(e) => set({ dob: { ...f.dob, y: e.target.value } })} aria-label="Year">
          <option value="">Year</option>
          {Array.from({ length: 83 }, (_, i) => thisYear - 18 - i).map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      {tooYoung && <p className="error">You must be 18 or older to use alignment.</p>}

      <p className="label">Who are you interested in?</p>
      <ChipGroup options={INTERESTED_IN} value={f.interestedIn} onChange={(interestedIn) => set({ interestedIn })} />
    </StepScreen>
  );
}

export function SetupOrientation() {
  const { state, saveProfile } = useApp();
  const next = useStepNav('orientation');
  const [value, setValue] = useState(state.me.orientation);
  return (
    <StepScreen canNext={!!value} onNext={() => { saveProfile({ orientation: value }); next(); }}>
      <h1 className="title-left">How do you identify yourself?</h1>
      <p className="subtitle">Feel free to share your sexual orientation</p>
      <div className="check-list">
        {ORIENTATIONS.map((o) => <CheckRow key={o} label={o} selected={value === o} onClick={() => setValue(o)} />)}
      </div>
    </StepScreen>
  );
}

export function SetupBeliefs() {
  const { state, saveProfile } = useApp();
  const next = useStepNav('beliefs');
  const [f, setF] = useState({
    spiritual: state.me.spiritual, political: state.me.political, causes: state.me.causes,
    smoke: state.me.smoke, drink: state.me.drink,
  });
  const set = (k) => (v) => setF({ ...f, [k]: v });
  const valid = f.spiritual && f.political && f.smoke && f.drink;
  return (
    <StepScreen title="What is your spiritual orientation?" canNext={valid} onNext={() => { saveProfile(f); next(); }}>
      <ChipGroup options={SPIRITUAL} value={f.spiritual} onChange={set('spiritual')} />
      <p className="label">What is your political view?</p>
      <ChipGroup options={POLITICAL} value={f.political} onChange={set('political')} />
      <p className="label">Causes</p>
      <ChipGroup options={CAUSES} value={f.causes} onChange={set('causes')} />
      <p className="label">Do you smoke?</p>
      <ChipGroup options={HABITS} value={f.smoke} onChange={set('smoke')} />
      <p className="label">Do you drink?</p>
      <ChipGroup options={HABITS} value={f.drink} onChange={set('drink')} />
    </StepScreen>
  );
}

export function SetupHobbies() {
  const { state, saveProfile } = useApp();
  const next = useStepNav('hobbies');
  const [hobbies, setHobbies] = useState(state.me.hobbies);
  return (
    <StepScreen canNext={hobbies.length > 0} onNext={() => { saveProfile({ hobbies }); next(); }}>
      <h1 className="title-left" style={{ marginBottom: 16 }}>Share your interest and hobbies</h1>
      <ChipGroup options={HOBBIES} value={hobbies} onChange={setHobbies} />
      <p className="hint" style={{ marginTop: 16 }}>Pick as many as you like.</p>
    </StepScreen>
  );
}

// Decorative waveform matching the Figma "Record audio" bars.
export function Waveform({ active, progress = 0 }) {
  const bars = [6, 12, 18, 10, 22, 14, 8, 20, 16, 24, 10, 6, 14, 22, 18, 8, 12, 20, 10, 16, 22, 12, 6, 18, 14, 24, 10, 20, 8, 16, 12, 18];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 28, flex: 1 }} aria-hidden="true">
      {bars.map((h, i) => (
        <span
          key={i}
          style={{
            width: 3, height: h, borderRadius: 2,
            background: i / bars.length < progress ? 'var(--green)' : 'var(--ink)',
            animation: active ? `wave 0.9s ${(i % 6) * 0.1}s ease-in-out infinite alternate` : 'none',
          }}
        />
      ))}
      <style>{'@keyframes wave { to { transform: scaleY(0.35); } }'}</style>
    </div>
  );
}

export function AudioPlayer({ src }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    if (a.paused) a.play(); else a.pause();
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <button type="button" className="icon-btn" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} style={{ background: 'var(--green)', color: '#fff', width: 40, height: 40 }}>
        {playing ? <Pause size={18} /> : <Play size={18} />}
      </button>
      <Waveform progress={progress} />
      <audio
        ref={ref}
        src={src}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setProgress(0); }}
        onTimeUpdate={(e) => {
          const { currentTime, duration } = e.currentTarget;
          if (Number.isFinite(duration) && duration > 0) setProgress(currentTime / duration);
        }}
      />
    </div>
  );
}

const MAX_SECONDS = 30;

export function SetupAudio() {
  const { state, saveProfile, toast } = useApp();
  const next = useStepNav('audio');
  const [audio, setAudio] = useState(state.me.audio);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');
  const recorder = useRef(null);
  const timer = useRef(null);

  useEffect(() => () => {
    clearInterval(timer.current);
    recorder.current?.stream?.getTracks().forEach((t) => t.stop());
  }, []);

  const stop = () => {
    clearInterval(timer.current);
    if (recorder.current?.state === 'recording') recorder.current.stop();
    setRecording(false);
  };

  const start = async () => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Your browser can’t record audio. You can skip this step for now.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream, { audioBitsPerSecond: 32000 });
      const chunks = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => setAudio(reader.result);
        reader.readAsDataURL(blob);
      };
      recorder.current = rec;
      rec.start();
      setRecording(true);
      setSeconds(0);
      timer.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) { stop(); toast(`Recordings are limited to ${MAX_SECONDS} seconds`); }
          return s + 1;
        });
      }, 1000);
    } catch {
      setError('Microphone access was blocked. Allow it in your browser settings, or skip this step for now.');
    }
  };

  return (
    <StepScreen
      canNext={!!audio && !recording}
      onNext={() => { saveProfile({ audio }); next(); }}
      footer={!audio && <button type="button" className="link-btn" onClick={next}>Skip for now</button>}
    >
      <h1 className="title-left" style={{ marginBottom: 20 }}>Tell us your biggest conspiracy theory</h1>
      <p className="subtitle">Record audio</p>
      {audio && !recording ? (
        <>
          <AudioPlayer src={audio} />
          <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: 20, justifySelf: 'start', width: 'fit-content' }} onClick={() => { setAudio(null); start(); }}>
            <RotateCcw size={16} /> Record again
          </button>
        </>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            className="icon-btn"
            onClick={recording ? stop : start}
            aria-label={recording ? 'Stop recording' : 'Start recording'}
            style={{ background: recording ? 'var(--red)' : 'var(--green)', color: '#fff', width: 44, height: 44, flexShrink: 0 }}
          >
            {recording ? <Square size={16} fill="#fff" /> : <Mic size={20} />}
          </button>
          <Waveform active={recording} />
          {recording && <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 14 }}>0:{String(seconds).padStart(2, '0')}</span>}
        </div>
      )}
      {!audio && !recording && <p className="hint">Tap the mic and talk for up to {MAX_SECONDS} seconds.</p>}
      {error && <p className="error">{error}</p>}
    </StepScreen>
  );
}

const MAX_PHOTOS = 6;

export function SetupPhotos() {
  const { state, saveProfile, toast } = useApp();
  const next = useStepNav('photos');
  const [photos, setPhotos] = useState(state.me.photos);
  const input = useRef(null);

  const add = async (e) => {
    const files = [...e.target.files].slice(0, MAX_PHOTOS - photos.length);
    e.target.value = '';
    try {
      const urls = await Promise.all(files.map((f) => resizeImage(f)));
      setPhotos((p) => [...p, ...urls].slice(0, MAX_PHOTOS));
    } catch {
      toast('That file couldn’t be opened as a picture');
    }
  };

  return (
    <StepScreen canNext={photos.length >= 2} onNext={() => { saveProfile({ photos, avatar: state.me.avatar || photos[0] }); next(); }}>
      <h1 className="title-left" style={{ marginBottom: 24 }}>
        {photos.length ? 'Upload at least two pictures' : 'Upload some of your favourite pictures'}
      </h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {photos.length < MAX_PHOTOS && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            aria-label="Add pictures"
            style={{ aspectRatio: '1', border: '1px solid var(--green)', borderRadius: 12, background: 'var(--surface)', color: 'var(--green)', display: 'grid', placeItems: 'center' }}
          >
            <Plus size={48} strokeWidth={2.2} />
          </button>
        )}
        {photos.map((src, i) => (
          <div key={i} style={{ position: 'relative', aspectRatio: '1' }}>
            <img src={src} alt={`Your picture ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} />
            <button
              type="button"
              aria-label={`Remove picture ${i + 1}`}
              onClick={() => setPhotos(photos.filter((_, n) => n !== i))}
              style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', border: 0, background: 'rgba(0,0,0,0.55)', color: '#fff', display: 'grid', placeItems: 'center', padding: 0 }}
            >
              <X size={14} />
            </button>
            <span style={{ position: 'absolute', bottom: -4, right: -4, width: 20, height: 20, borderRadius: '50%', background: 'var(--surface)', border: '1.5px solid var(--green)', color: 'var(--green)', display: 'grid', placeItems: 'center' }}>
              <Check size={12} strokeWidth={3} />
            </span>
          </div>
        ))}
      </div>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={add} />
      <p className="hint" style={{ marginTop: 16 }}>{photos.length}/{MAX_PHOTOS} pictures. Your first picture becomes your profile photo.</p>
    </StepScreen>
  );
}

export function SetupCreators() {
  const navigate = useNavigate();
  const { state, update, finishOnboarding } = useApp();
  const creators = PEOPLE.filter((p) => p.creator);
  const [picked, setPicked] = useState(state.following.filter((id) => creators.some((c) => c.id === id)));
  const toggle = (id) => setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);

  return (
    <StepScreen
      canNext={picked.length >= 5}
      onNext={() => {
        update((s) => ({ following: [...new Set([...s.following, ...picked])] }));
        finishOnboarding();
        navigate('/home', { replace: true });
      }}
    >
      <h1 className="title-left" style={{ marginBottom: 16 }}>Follow any five of these creators so your feed won’t be empty.</h1>
      <div className="check-list">
        {creators.map((c) => (
          <CheckRow key={c.id} selected={picked.includes(c.id)} onClick={() => toggle(c.id)}>
            <Avatar person={c} size={34} />
            <span style={{ display: 'grid' }}>
              <span>{c.name}</span>
              <small style={{ color: 'var(--muted)' }}>{c.followers.toLocaleString()} followers</small>
            </span>
          </CheckRow>
        ))}
      </div>
      <p className="hint" style={{ marginTop: 12 }}>{picked.length} of 5 selected</p>
    </StepScreen>
  );
}
