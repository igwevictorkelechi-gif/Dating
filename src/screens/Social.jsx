import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Bell, ImagePlus, Plus, Search, TrendingUp, Video, X } from 'lucide-react';
import { fileToDataUrl, resizeImage, timeAgo, useApp } from '../store.jsx';
import { Avatar, BottomNav, TopBar } from '../components/ui.jsx';
import { LogoMark } from '../components/Logo.jsx';
import PostCard from '../components/PostCard.jsx';
import Cropper from '../components/Cropper.jsx';
import { extractTags, localTopics, matchesTopic, trendScore } from '../lib/trending.js';

// Trending: everyone's posts, ranked. For you: only people you follow, newest first.
const FEED_TABS = [['trending', 'Trending'], ['foryou', 'For you']];
const QUICK_MAX = 500;

// Write a text post straight from the feed. #topics in it can trend.
function QuickPost({ onPosted }) {
  const { self, addPost, toast } = useApp();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const body = text.trim();
  const tags = extractTags(body);

  const submit = async (e) => {
    e.preventDefault();
    if (!body || busy) return;
    setBusy(true);
    const res = await addPost({ text: body });
    setBusy(false);
    if (res.error) return;
    setText('');
    toast('Posted');
    onPosted?.();
  };

  return (
    <form className="quick-post" onSubmit={submit}>
      <Avatar person={self} size={40} />
      <div className="quick-post-body">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, QUICK_MAX))}
          placeholder="What’s on your mind? Add #topics to trend"
          rows={text ? 3 : 1}
          aria-label="Write a post"
        />
        {body && (
          <div className="quick-post-foot">
            <span className="hint" style={{ margin: 0 }}>
              {tags.length ? `Topics: ${tags.map((t) => `#${t}`).join(' ')}` : 'Tip: add a #topic'} · {QUICK_MAX - text.length} left
            </span>
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>{busy ? 'Posting…' : 'Post'}</button>
          </div>
        )}
      </div>
    </form>
  );
}

export function Home() {
  const { posts, state, loadFeed, loadTrending, loadTopic, loadTopics, loadFollowing, searchPeople } = useApp();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'foryou' ? 'foryou' : 'trending';
  const [refresh, setRefresh] = useState(0);
  const topic = params.get('topic') || '';
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rankedIds, setRankedIds] = useState(null); // server's trending order, or null to rank on the device
  const [serverTopics, setServerTopics] = useState(null);
  const q = query.trim();
  const unread = state.notifications.some((n) => !n.read);

  const setView = (next) => {
    const merged = { tab, topic, ...next };
    const out = {};
    if (merged.tab === 'foryou') out.tab = 'foryou';
    if (merged.topic) out.topic = merged.topic;
    setParams(out, { replace: true });
  };

  useEffect(() => {
    let live = true;
    setLoading(true);
    const work = [loadFeed(), loadTopics().then((t) => { if (live) setServerTopics(t); })];
    if (topic) work.push(loadTopic(topic));
    if (tab === 'trending') work.push(loadTrending(topic).then((ids) => { if (live) setRankedIds(ids); }));
    else work.push(loadFollowing());
    Promise.all(work).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [tab, topic, refresh, loadFeed, loadTrending, loadTopic, loadTopics, loadFollowing]);

  // Search as you type, after a short pause.
  useEffect(() => {
    if (!q) { setResults([]); return undefined; }
    const t = setTimeout(() => { searchPeople(q).then(setResults); }, 250);
    return () => clearTimeout(t);
  }, [q, searchPeople]);

  const feed = useMemo(() => {
    const shown = posts.filter((p) => matchesTopic(p, topic));
    if (tab === 'foryou') {
      const followed = new Set(state.following);
      return shown.filter((p) => followed.has(p.authorId)); // newest first
    }
    if (rankedIds) {
      const byId = new Map(shown.map((p) => [p.id, p]));
      return rankedIds.map((id) => byId.get(id)).filter(Boolean);
    }
    const now = Date.now();
    return shown.filter((p) => !p.flagged).sort((a, b) => trendScore(b, now) - trendScore(a, now));
  }, [posts, tab, topic, rankedIds, state.following]);

  const topics = useMemo(() => {
    const list = (serverTopics && serverTopics.length ? serverTopics : localTopics(posts)).map((t) => t.topic);
    return topic && !list.includes(topic) ? [topic, ...list] : list;
  }, [serverTopics, posts, topic]);

  return (
    <>
      <main className="screen flush" style={{ paddingTop: 12 }}>
        <div style={{ padding: '0 20px', position: 'sticky', top: 0, zIndex: 5, background: 'var(--bg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <LogoMark size={40} />
            <div style={{ display: 'flex', gap: 4 }}>
              <Link to="/post/new" className="icon-btn" aria-label="Create post"><Plus size={26} /></Link>
              <Link to="/notifications" className="icon-btn" aria-label={unread ? 'Notifications (new)' : 'Notifications'} style={{ position: 'relative' }}>
                <Bell size={24} />
                {unread && <span style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: '50%', background: 'var(--orange)' }} />}
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
          <div className="feed-tabs" role="tablist" aria-label="Feed">
            {FEED_TABS.map(([key, label]) => (
              <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setView({ tab: key })}>
                {key === 'trending' && <TrendingUp size={16} />} {label}
              </button>
            ))}
          </div>
          {topics.length > 0 && (
            <div className="topics" aria-label="Trending topics">
              {topics.map((t) => (
                <button key={t} type="button" className="topic" aria-pressed={t === topic} onClick={() => setView({ topic: t === topic ? '' : t })}>
                  {t}{t === topic && <X size={14} />}
                </button>
              ))}
            </div>
          )}
        </div>
        <QuickPost onPosted={() => { setView({ tab: 'trending', topic: '' }); setRefresh((n) => n + 1); }} />
        {loading && feed.length === 0 && <p className="empty">Loading your feed…</p>}
        {!loading && feed.length === 0 && (
          <div className="empty">
            {tab === 'foryou' && state.following.length === 0
              ? <>Follow people to see their posts here. Search for someone above, or tap Follow on a post in Trending.</>
              : topic ? <>No posts about {topic} yet.</>
                : tab === 'foryou' ? <>The people you follow haven’t posted yet.</> : <>Nothing here yet. Share the first post, or search for people to follow.</>}
            <div style={{ marginTop: 12 }}><Link to="/post/new" className="btn btn-primary btn-sm">Create a post</Link></div>
          </div>
        )}
        {feed.map((post) => <PostCard key={post.id} post={post} onTopic={(t) => setView({ topic: t })} />)}
      </main>
      <BottomNav />
    </>
  );
}

export function Notifications() {
  const { state, person, markNotificationsRead } = useApp();
  useEffect(() => {
    const t = setTimeout(markNotificationsRead, 1500);
    return () => clearTimeout(t);
  }, [markNotificationsRead]);
  const items = state.notifications.filter((n) => person(n.personId));
  return (
    <>
      <main className="screen">
        <TopBar title="Notifications" />
        {items.length === 0 && <p className="empty">No notifications yet. When people follow you, like your posts or match with you, you’ll see it here.</p>}
        <ul className="people">
          {items.map((n) => {
            const p = person(n.personId);
            return (
              <li key={n.id} style={{ opacity: n.read ? 0.8 : 1 }}>
                <Link to={n.type === 'match' ? `/dating/chats/${p.id}` : `/u/${p.id}`}><Avatar person={p} size={45} /></Link>
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

const MAX_VIDEO_BYTES = 10 * 1024 * 1024;

export function CreatePost() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { self, addPost, toast } = useApp();
  const [text, setText] = useState('');
  const [images, setImages] = useState([]);
  const [video, setVideo] = useState(null);
  const [framing, setFraming] = useState(null); // pictures waiting to be framed
  const imageInput = useRef(null);
  const videoInput = useRef(null);
  const type = params.get('type');

  const pickImages = async (e) => {
    const files = [...e.target.files].slice(0, 4 - images.length);
    e.target.value = '';
    try {
      // Keep enough detail for zooming in; the framed result is saved at up to 1350px.
      const urls = await Promise.all(files.map((f) => resizeImage(f, 2400)));
      if (urls.length) setFraming(urls);
    } catch {
      toast('That file couldn’t be opened as a picture');
    }
  };

  const pickVideo = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_VIDEO_BYTES) {
      toast('Videos can be up to 10 MB');
      return;
    }
    setVideo(await fileToDataUrl(file));
    setImages([]);
  };

  const [busy, setBusy] = useState(false);
  const canPost = (text.trim() || images.length || video) && !busy;
  const publish = async () => {
    if (!canPost) return;
    setBusy(true);
    const body = text.trim();
    let res;
    if (images.length) res = await addPost({ text: body, images });
    else if (video) res = await addPost({ text: body, video });
    else res = await addPost({ note: body });
    setBusy(false);
    if (res.error) return;
    toast('Posted');
    navigate('/profile');
  };

  return (
    <main className="screen">
      <TopBar
        title="Create Post"
        right={<button type="button" className="btn btn-primary btn-sm" disabled={!canPost} onClick={publish}>{busy ? 'Posting…' : 'Post'}</button>}
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
      <p className="hint" style={{ marginTop: -4 }}>Add #topics, like #travel or #music, so people can find your post and it can trend.</p>
      {images.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 16 }}>
          {images.map((src, i) => (
            <div key={i} style={{ position: 'relative' }}>
              <img src={src} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'contain', background: 'var(--surface-2)', borderRadius: 10 }} />
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
      {framing && (
        <Cropper
          images={framing}
          onCancel={() => setFraming(null)}
          onDone={(framed) => { setImages((v) => [...v, ...framed].slice(0, 4)); setVideo(null); setFraming(null); }}
        />
      )}
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
