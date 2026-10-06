import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Bell, ImagePlus, Plus, Search, Video, X } from 'lucide-react';
import { fileToDataUrl, resizeImage, timeAgo, useApp } from '../store.jsx';
import { NOTIFICATIONS, PEOPLE } from '../data/seed.js';
import { Avatar, BottomNav, TopBar } from '../components/ui.jsx';
import { LogoMark } from '../components/Logo.jsx';
import PostCard from '../components/PostCard.jsx';

export function Home() {
  const { posts, state } = useApp();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const results = q
    ? PEOPLE.filter((p) => p.name.toLowerCase().includes(q) || p.username.toLowerCase().includes(q)).slice(0, 6)
    : [];
  // People you follow first, then everyone else, newest first within each group.
  const feed = useMemo(() => {
    const followed = new Set([...state.following, 'me']);
    return [...posts].sort((a, b) => (followed.has(b.authorId) - followed.has(a.authorId)) || (b.createdAt - a.createdAt));
  }, [posts, state.following]);

  return (
    <>
      <main className="screen flush" style={{ paddingTop: 12 }}>
        <div style={{ padding: '0 20px', position: 'sticky', top: 0, zIndex: 5, background: 'var(--bg)', paddingBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <LogoMark size={40} />
            <div style={{ display: 'flex', gap: 4 }}>
              <Link to="/post/new" className="icon-btn" aria-label="Create post"><Plus size={26} /></Link>
              <Link to="/notifications" className="icon-btn" aria-label="Notifications" style={{ position: 'relative' }}>
                <Bell size={24} />
                <span style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: '50%', background: 'var(--orange)' }} />
              </Link>
            </div>
          </div>
          <div className="search">
            <Search size={22} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." aria-label="Search people" />
            {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search"><X size={22} /></button>}
          </div>
          {q && (
            <ul className="results">
              {results.length === 0 && <li style={{ padding: 14, color: 'var(--muted)', fontSize: 14 }}>No one matches “{query}”.</li>}
              {results.map((p) => (
                <li key={p.id}>
                  <Link to={`/u/${p.id}`}>
                    <Avatar person={p} size={40} />
                    <span><strong>{p.name}</strong><small>@{p.username}</small></span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        {feed.map((post) => <PostCard key={post.id} post={post} />)}
      </main>
      <BottomNav />
    </>
  );
}

export function Notifications() {
  const { person } = useApp();
  return (
    <>
      <main className="screen">
        <TopBar title="Notifications" />
        <ul className="people">
          {NOTIFICATIONS.map((n) => {
            const p = person(n.personId);
            return (
              <li key={n.id}>
                <Link to={`/u/${p.id}`}><Avatar person={p} size={45} /></Link>
                <div className="meta">
                  <strong>{p.name}</strong>
                  <span>{n.text}</span>
                </div>
                <time>{timeAgo(n.at)}</time>
              </li>
            );
          })}
        </ul>
      </main>
      <BottomNav />
    </>
  );
}

const MAX_VIDEO_BYTES = 4 * 1024 * 1024;

export function CreatePost() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { self, addPost, toast } = useApp();
  const [text, setText] = useState('');
  const [images, setImages] = useState([]);
  const [video, setVideo] = useState(null);
  const imageInput = useRef(null);
  const videoInput = useRef(null);
  const type = params.get('type');

  const pickImages = async (e) => {
    const files = [...e.target.files].slice(0, 4 - images.length);
    e.target.value = '';
    try {
      const urls = await Promise.all(files.map((f) => resizeImage(f, 1080)));
      setImages((v) => [...v, ...urls].slice(0, 4));
      setVideo(null);
    } catch {
      toast('That file couldn’t be opened as a picture');
    }
  };

  const pickVideo = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_VIDEO_BYTES) {
      toast('Videos can be up to 4 MB for now');
      return;
    }
    setVideo(await fileToDataUrl(file));
    setImages([]);
  };

  const canPost = text.trim() || images.length || video;
  const publish = () => {
    if (!canPost) return;
    const body = text.trim();
    if (images.length) addPost({ text: body, images });
    else if (video) addPost({ text: body, video });
    else addPost({ note: body });
    toast('Posted');
    navigate('/profile');
  };

  return (
    <main className="screen">
      <TopBar
        title="Create Post"
        right={<button type="button" className="btn btn-primary btn-sm" disabled={!canPost} onClick={publish}>Post</button>}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Avatar person={self} size={44} />
        <strong>{self.name}</strong>
      </div>
      <textarea
        className="field"
        style={{ border: 0, padding: 0, fontSize: 17, minHeight: 140, background: 'transparent' }}
        placeholder="What downloads are you having today?"
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus={type !== 'images' && type !== 'videos'}
        aria-label="Post text"
      />
      {images.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 16 }}>
          {images.map((src, i) => (
            <div key={i} style={{ position: 'relative' }}>
              <img src={src} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 10 }} />
              <button type="button" aria-label="Remove picture" onClick={() => setImages(images.filter((_, n) => n !== i))}
                style={{ position: 'absolute', top: 6, right: 6, border: 0, borderRadius: '50%', width: 26, height: 26, background: 'rgba(0,0,0,0.55)', color: '#fff', display: 'grid', placeItems: 'center', padding: 0 }}>
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
      {video && (
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <video src={video} controls style={{ width: '100%', borderRadius: 10 }} />
          <button type="button" className="link-btn" onClick={() => setVideo(null)}>Remove video</button>
        </div>
      )}
      <div className="grow" />
      <div style={{ display: 'grid', gap: 10 }}>
        <button type="button" className="btn btn-outline btn-block" onClick={() => imageInput.current?.click()} disabled={images.length >= 4}>
          <ImagePlus size={20} /> Add images
        </button>
        <button type="button" className="btn btn-outline btn-block" onClick={() => videoInput.current?.click()}>
          <Video size={20} /> Add Videos
        </button>
      </div>
      <input ref={imageInput} type="file" accept="image/*" multiple hidden onChange={pickImages} />
      <input ref={videoInput} type="file" accept="video/*" hidden onChange={pickVideo} />
      {/* Open the right picker straight away when coming from the Images / Videos menu */}
      {type === 'images' && <AutoClick target={imageInput} />}
      {type === 'videos' && <AutoClick target={videoInput} />}
    </main>
  );
}

function AutoClick({ target }) {
  const done = useRef(false);
  return (
    <span
      hidden
      ref={() => {
        if (done.current) return;
        done.current = true;
        setTimeout(() => target.current?.click(), 50);
      }}
    />
  );
}
