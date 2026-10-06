import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Briefcase, Cake, Camera, ChevronLeft, ChevronRight, Cigarette, Eye, HeartHandshake, ImagePlus, Images, Info,
  Landmark, MapPin, MessageCircle, NotebookPen, Pencil, Settings, Sparkles, StickyNote, UserCheck, UserPlus, Users,
  Video, Wine, X,
} from 'lucide-react';
import { ageFromDob, firstName, resizeImage, useApp } from '../store.jsx';
import { LOOKING_FOR } from '../data/seed.js';
import { Avatar, BottomNav, ChipGroup, Sheet, TopBar } from '../components/ui.jsx';
import { Portrait, Scene } from '../components/Art.jsx';
import PostCard from '../components/PostCard.jsx';
import { AudioPlayer, Waveform } from './Setup.jsx';

// ---------- building blocks ----------

function Section({ title, editTo, children }) {
  return (
    <section className="pf-section">
      <header>
        <h3>{title}</h3>
        {editTo && <Link to={editTo} className="pf-edit" aria-label={`Edit ${title.toLowerCase()}`}><Pencil size={16} /> Edit</Link>}
      </header>
      {children}
    </section>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="pf-row">
      <Icon size={18} aria-hidden="true" />
      <span className="pf-row-label">{label}</span>
      <span className="pf-row-value">{value || <em>Not added</em>}</span>
    </div>
  );
}

function Tags({ items, empty = 'Not added' }) {
  if (!items?.length) return <p className="pf-empty-line">{empty}</p>;
  return <div className="pf-tags">{items.map((t) => <span key={t}>{t}</span>)}</div>;
}

function PhotoViewer({ items, index, onClose }) {
  const [i, setI] = useState(index);
  const item = items[i];
  return (
    <div className="overlay middle" onClick={onClose} role="dialog" aria-label="Photo">
      <div className="pf-viewer" onClick={(e) => e.stopPropagation()}>
        {item.src ? <img src={item.src} alt="" /> : item.render}
        <button type="button" className="pf-viewer-close" onClick={onClose} aria-label="Close"><X size={22} /></button>
        {items.length > 1 && (
          <div className="pf-viewer-nav">
            <button type="button" onClick={() => setI((i - 1 + items.length) % items.length)} aria-label="Previous photo"><ChevronLeft size={24} /></button>
            <span>{i + 1} / {items.length}</span>
            <button type="button" onClick={() => setI((i + 1) % items.length)} aria-label="Next photo"><ChevronRight size={24} /></button>
          </div>
        )}
      </div>
    </div>
  );
}

// What counts towards "profile strength" on your own profile.
function strengthItems(me) {
  const back = '&back=/profile';
  return [
    { done: me.photos.length >= 2, label: 'Add at least two photos', to: `/setup/photos?edit=1${back}` },
    { done: !!me.bio, label: 'Write a short bio', to: '/profile/edit' },
    { done: !!me.location, label: 'Add your location', to: '/profile/edit' },
    { done: !!me.job, label: 'Add what you do', to: '/profile/edit' },
    { done: !!me.lookingFor, label: 'Say what you’re looking for', to: '/profile/edit' },
    { done: !!me.orientation, label: 'Add your orientation', to: `/setup/orientation?edit=1${back}` },
    { done: !!(me.spiritual && me.political), label: 'Share your beliefs', to: `/setup/beliefs?edit=1${back}` },
    { done: me.hobbies.length >= 3, label: 'Pick at least three hobbies', to: `/setup/hobbies?edit=1${back}` },
    { done: !!me.audio, label: 'Record your voice note', to: `/setup/audio?edit=1${back}` },
  ];
}

// ---------- the profile page, shared by "me" and other people ----------

function ProfileView({ profile, isMe }) {
  const navigate = useNavigate();
  const { state, posts, toggleFollow, swipe, toast } = useApp();
  const [tab, setTab] = useState('posts');
  const [menu, setMenu] = useState(false);
  const [viewer, setViewer] = useState(null);

  const theirPosts = posts.filter((p) => p.authorId === profile.id);
  const following = state.following.includes(profile.id);
  const matched = state.swipes.matches.includes(profile.id) && !state.closedChats.includes(profile.id);
  const liked = state.swipes.liked.includes(profile.id);
  const matchCount = state.swipes.matches.filter((id) => !state.closedChats.includes(id)).length;
  const editStep = (step) => (isMe ? `/setup/${step}?edit=1&back=/profile` : null);

  // Photos: your uploads, or for other people their portrait plus pictures from their posts.
  const photos = isMe
    ? profile.photos.map((src) => ({ src }))
    : [
      { render: <Portrait person={profile} className="fill" /> },
      ...theirPosts.filter((p) => p.scene !== undefined).map((p) => ({ render: <Scene index={p.scene} className="fill" /> })),
      ...theirPosts.flatMap((p) => (p.images || []).map((src) => ({ src }))),
    ];

  const items = isMe ? strengthItems(state.me) : [];
  const done = items.filter((i) => i.done).length;
  const nextItem = items.find((i) => !i.done);
  const strength = items.length ? Math.round((done / items.length) * 100) : 100;

  const like = () => {
    const isMatch = swipe(profile.id, 'like');
    if (isMatch) navigate(`/dating/match/${profile.id}`);
    else toast(`Like sent. If ${firstName(profile)} likes you back, it’s a match.`);
  };

  const followers = profile.followers + (!isMe && following ? 1 : 0);
  const cover = isMe && profile.photos[1]
    ? <img src={profile.photos[1]} alt="" />
    : <Scene index={(profile.hue ?? 0) % 6} />;

  return (
    <>
      <main className="screen flush pf" style={{ paddingTop: 8 }}>
        <div style={{ padding: '0 20px' }}>
          <TopBar
            back={!isMe}
            title={<span className="pf-handle">@{profile.username}</span>}
            right={isMe && <Link to="/settings" className="icon-btn" aria-label="Settings"><Settings size={24} /></Link>}
          />
        </div>

        <div className="pf-cover">{cover}</div>
        <button type="button" className="pf-avatar" onClick={() => photos.length && setViewer(0)} aria-label="View photos">
          <Avatar person={profile} size={104} />
        </button>

        <div className="pf-identity">
          <h1>{profile.name}{profile.age ? <span>, {profile.age}</span> : null}</h1>
          <p className="pf-meta">
            {profile.location && <span><MapPin size={15} />{profile.location}</span>}
            {profile.job && <span><Briefcase size={15} />{profile.job}</span>}
          </p>
          {profile.bio && <p className="pf-bio">{profile.bio}</p>}
          {profile.lookingFor && <p className="pf-intent"><HeartHandshake size={16} /> Looking for: {profile.lookingFor}</p>}
        </div>

        <dl className={`pf-stats ${isMe ? 'four' : ''}`}>
          <div><dt>Posts</dt><dd>{theirPosts.length}</dd></div>
          <div><dt>Followers</dt><dd>{followers.toLocaleString()}</dd></div>
          <div><dt>Following</dt><dd>{profile.following.toLocaleString()}</dd></div>
          {isMe && <div><dt>Matches</dt><dd>{matchCount}</dd></div>}
        </dl>

        <div className="pf-actions">
          {isMe ? (
            <>
              <Link to="/profile/edit" className="btn btn-primary"><Pencil size={18} /> Edit profile</Link>
              <Link to="/dating/me" className="btn btn-outline"><Eye size={18} /> Preview</Link>
              <button type="button" className="btn btn-outline pf-square" onClick={() => setMenu(true)} aria-label="Create post"><NotebookPen size={18} /></button>
            </>
          ) : (
            <>
              <button type="button" className={`btn ${following ? 'btn-outline' : 'btn-primary'}`} onClick={() => toggleFollow(profile.id)}>
                {following ? <><UserCheck size={18} /> Following</> : <><UserPlus size={18} /> Follow</>}
              </button>
              {matched ? (
                <Link to={`/dating/chats/${profile.id}`} className="btn btn-outline"><MessageCircle size={18} /> Message</Link>
              ) : (
                <button type="button" className="btn btn-outline" onClick={like} disabled={liked}>
                  <HeartHandshake size={18} /> {liked ? 'Liked' : 'Like'}
                </button>
              )}
            </>
          )}
        </div>

        {isMe && nextItem && (
          <div className="pf-strength">
            <div className="pf-strength-top">
              <strong>Profile strength</strong>
              <span>{strength}%</span>
            </div>
            <div className="pf-meter" role="progressbar" aria-valuenow={strength} aria-valuemin={0} aria-valuemax={100} aria-label="Profile strength">
              <div style={{ width: `${strength}%` }} />
            </div>
            <Link to={nextItem.to} className="pf-next">
              {nextItem.label} <ChevronRight size={18} />
            </Link>
            <p className="hint" style={{ margin: 0 }}>Complete profiles get more matches.</p>
          </div>
        )}

        <div className="pf-tabs" role="tablist" aria-label="Profile sections">
          {[['posts', 'Posts', StickyNote], ['photos', 'Photos', Images], ['about', 'About', Info]].map(([key, label, Icon]) => (
            <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}>
              <Icon size={18} /> {label}
            </button>
          ))}
        </div>

        {tab === 'posts' && (
          <div role="tabpanel">
            {theirPosts.length === 0 && (
              <div className="empty">
                {isMe ? 'You haven’t posted yet.' : `${firstName(profile)} hasn’t posted yet.`}
                {isMe && <div style={{ marginTop: 12 }}><button type="button" className="btn btn-primary btn-sm" onClick={() => setMenu(true)}>Create your first post</button></div>}
              </div>
            )}
            {theirPosts.map((post) => <PostCard key={post.id} post={post} />)}
          </div>
        )}

        {tab === 'photos' && (
          <div role="tabpanel" className="pf-panel">
            {photos.length === 0 ? (
              <p className="empty">No photos yet.</p>
            ) : (
              <div className="pf-grid">
                {photos.map((ph, i) => (
                  <button key={i} type="button" onClick={() => setViewer(i)} aria-label={`Open photo ${i + 1}`}>
                    {ph.src ? <img src={ph.src} alt="" /> : ph.render}
                  </button>
                ))}
              </div>
            )}
            {isMe && (
              <Link to="/setup/photos?edit=1&back=/profile" className="btn btn-outline btn-block" style={{ marginTop: 16 }}>
                <Camera size={18} /> Manage photos
              </Link>
            )}
          </div>
        )}

        {tab === 'about' && (
          <div role="tabpanel" className="pf-panel">
            <Section title="Basics" editTo={isMe ? '/profile/edit' : null}>
              <InfoRow icon={Cake} label="Age" value={profile.age} />
              <InfoRow icon={Users} label="Gender" value={profile.gender} />
              <InfoRow icon={HeartHandshake} label="Interested in" value={profile.interestedIn} />
              <InfoRow icon={Sparkles} label="Orientation" value={profile.orientation} />
              <InfoRow icon={MapPin} label="Location" value={profile.location} />
              <InfoRow icon={Briefcase} label="Work" value={profile.job} />
            </Section>
            <Section title="Beliefs" editTo={editStep('beliefs')}>
              <InfoRow icon={Sparkles} label="Spiritual" value={profile.spiritual} />
              <InfoRow icon={Landmark} label="Politics" value={profile.political} />
            </Section>
            <Section title="Causes" editTo={editStep('beliefs')}>
              <Tags items={profile.causes} empty="No causes added" />
            </Section>
            <Section title="Lifestyle" editTo={editStep('beliefs')}>
              <InfoRow icon={Cigarette} label="Smokes" value={profile.smoke} />
              <InfoRow icon={Wine} label="Drinks" value={profile.drink} />
            </Section>
            <Section title="Hobbies" editTo={editStep('hobbies')}>
              <Tags items={profile.hobbies} />
            </Section>
            <Section title="Biggest conspiracy theory" editTo={editStep('audio')}>
              {profile.audio ? <AudioPlayer src={profile.audio} /> : profile.theory ? (
                <div style={{ display: 'grid', gap: 10 }}>
                  <Waveform />
                  <p className="pf-quote">“{profile.theory}”</p>
                </div>
              ) : <p className="pf-empty-line">No voice note yet.</p>}
            </Section>
          </div>
        )}
      </main>
      <BottomNav />

      {menu && (
        <Sheet onClose={() => setMenu(false)}>
          <div className="sheet-group">
            <button type="button" onClick={() => navigate('/post/new?type=notes')}><NotebookPen size={18} style={{ verticalAlign: -3, marginRight: 8 }} />Notes</button>
            <button type="button" onClick={() => navigate('/post/new?type=images')}><ImagePlus size={18} style={{ verticalAlign: -3, marginRight: 8 }} />Images</button>
            <button type="button" onClick={() => navigate('/post/new?type=videos')}><Video size={18} style={{ verticalAlign: -3, marginRight: 8 }} />Videos</button>
          </div>
          <div className="sheet-group"><button type="button" onClick={() => setMenu(false)}>Cancel</button></div>
        </Sheet>
      )}
      {viewer !== null && photos.length > 0 && <PhotoViewer items={photos} index={viewer} onClose={() => setViewer(null)} />}
    </>
  );
}

export function MyProfile() {
  const { state, self } = useApp();
  const me = state.me;
  const profile = {
    ...me, id: 'me', name: self.name, username: self.username, avatar: self.avatar, hue: self.hue,
    age: ageFromDob(me.dob), followers: self.followers, following: state.following.length,
  };
  return <ProfileView profile={profile} isMe />;
}

export function UserProfile() {
  const { id } = useParams();
  const { person } = useApp();
  const p = person(id);
  if (!p) return <main className="screen"><TopBar /><p className="empty">This profile doesn’t exist.</p></main>;
  if (id === 'me') return <MyProfile />;
  // Sample people don't store who they're interested in, so derive it for the About tab.
  const interestedIn = p.orientation === 'Straight' ? (p.gender === 'Female' ? 'Men' : 'Women') : 'Both';
  return <ProfileView key={p.id} profile={{ interestedIn, ...p, photos: [] }} />;
}

export function EditProfile() {
  const navigate = useNavigate();
  const { state, self, saveProfile, toast } = useApp();
  const me = state.me;
  const [f, setF] = useState({
    name: self.name === 'You' ? '' : self.name, username: self.username, bio: me.bio,
    location: me.location, job: me.job, lookingFor: me.lookingFor,
  });
  const [menu, setMenu] = useState(false);
  const [viewing, setViewing] = useState(false);
  const input = useRef(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.name.trim() && f.username.trim();

  const save = () => {
    if (!valid) return;
    const [first, ...rest] = f.name.trim().split(/\s+/);
    saveProfile({
      firstName: first, lastName: rest.join(' '), username: f.username.trim().replace(/\s/g, ''),
      bio: f.bio.trim(), location: f.location.trim(), job: f.job.trim(), lookingFor: f.lookingFor,
    });
    toast('Profile saved');
    navigate('/profile');
  };

  const changePhoto = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      saveProfile({ avatar: await resizeImage(file, 600) });
      toast('Profile photo updated');
    } catch {
      toast('That file couldn’t be opened as a picture');
    }
  };

  const back = '&back=/profile/edit';
  const datingLinks = [
    ['profile', 'Name, gender & birthday'], ['orientation', 'Orientation'], ['beliefs', 'Beliefs, causes & lifestyle'],
    ['hobbies', 'Hobbies'], ['audio', 'Voice note'], ['photos', 'Photos'],
  ];

  return (
    <>
      <main className="screen">
        <TopBar
          title="Edit profile"
          backTo="/profile"
          right={<button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={!valid}>Save</button>}
        />
        <button type="button" className="pf-edit-avatar" onClick={() => setMenu(true)} aria-label="Profile photo options">
          <Avatar person={self} size={100} />
          <span><Camera size={16} /></span>
        </button>

        <label className="pf-field">Name<input className="field" value={f.name} onChange={set('name')} autoComplete="name" /></label>
        <label className="pf-field">Username<input className="field" value={f.username} onChange={set('username')} autoComplete="username" /></label>
        <label className="pf-field">
          Bio
          <textarea className="field" value={f.bio} onChange={set('bio')} maxLength={150} rows={3} placeholder="A line or two about you" />
          <small>{f.bio.length}/150</small>
        </label>
        <label className="pf-field">Location<input className="field" value={f.location} onChange={set('location')} placeholder="e.g. Ikeja, Lagos" autoComplete="address-level2" /></label>
        <label className="pf-field">Work<input className="field" value={f.job} onChange={set('job')} placeholder="e.g. Product designer" autoComplete="organization-title" /></label>

        <p className="label" style={{ marginTop: 4 }}>Looking for</p>
        <ChipGroup options={LOOKING_FOR} value={f.lookingFor} onChange={(lookingFor) => setF({ ...f, lookingFor })} />

        <p className="label" style={{ marginTop: 28 }}>Dating details</p>
        <div className="rows">
          {datingLinks.map(([step, label]) => (
            <Link key={step} to={`/setup/${step}?edit=1${back}`} className="row-link" style={{ fontSize: 15 }}>
              {label} <ChevronRight size={18} />
            </Link>
          ))}
        </div>
        <input ref={input} type="file" accept="image/*" hidden onChange={changePhoto} />
      </main>
      <BottomNav />

      {menu && (
        <Sheet onClose={() => setMenu(false)}>
          <div className="sheet-group">
            <button type="button" disabled={!self.avatar} onClick={() => { setMenu(false); setViewing(true); }}>View photo</button>
            <button type="button" onClick={() => { setMenu(false); input.current?.click(); }}>Change photo</button>
          </div>
          <div className="sheet-group"><button type="button" onClick={() => setMenu(false)}>Cancel</button></div>
        </Sheet>
      )}
      {viewing && self.avatar && (
        <div className="overlay middle" onClick={() => setViewing(false)} role="dialog" aria-label="Profile photo">
          <img src={self.avatar} alt="Your profile" style={{ maxWidth: '90%', maxHeight: '80%', borderRadius: 12 }} />
        </div>
      )}
    </>
  );
}
