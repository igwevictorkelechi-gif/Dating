import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { listOwnFiles, supabase, uploadIfNeeded, BUCKET } from './lib/supabase.js';

// App state, backed by Supabase (auth, Postgres, storage and realtime).
// Screens use the same shapes as before: `state.me`, `person(id)`, `posts`, `state.chats`, …
// The signed-in user is always referred to as 'me' in post authors, comments and chat messages.

const PREFS_KEY = 'alignment:prefs'; // theme and dating filters stay on this device

const EMPTY_PROFILE = {
  firstName: '', lastName: '', username: '', gender: '', dob: { d: '', m: '', y: '' }, interestedIn: '',
  orientation: '', spiritual: '', political: '', causes: [], smoke: '', drink: '',
  hobbies: [], audio: null, photos: [], bio: '', avatar: null,
  location: '', job: '', lookingFor: '', age: null, hue: 110,
};

function loadPrefs() {
  try {
    return { filters: { seeking: 'Both', minAge: 18, maxAge: 45 }, theme: 'light', ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') };
  } catch {
    return { filters: { seeking: 'Both', minAge: 18, maxAge: 45 }, theme: 'light' };
  }
}

const INITIAL = {
  authReady: false,
  myId: null,
  account: null, // { email, username }
  pendingEmail: '', // email waiting for its sign-up code
  verified: false,
  onboarded: false,
  me: EMPTY_PROFILE,
  myCounts: { followers: 0, following: 0, posts: 0 },
  following: [],
  likedPosts: [],
  posts: {}, // id -> raw post
  people: {}, // id -> person
  swipes: { seen: [], liked: [], superliked: [], matches: [] },
  matchIds: {}, // other person's id -> match id
  chats: {}, // other person's id -> messages
  closedChats: [],
  notifications: [],
  ...loadPrefs(),
};

const PROFILE_COLUMNS = 'id, username, first_name, last_name, bio, gender, age, interested_in, orientation, spiritual, political, causes, smoke, drink, hobbies, location, job, looking_for, avatar_url, photos, audio_url, hue, is_creator, onboarded, created_at';

export function rowToPerson(r) {
  const name = [r.first_name, r.last_name].filter(Boolean).join(' ') || r.username || 'New member';
  return {
    id: r.id, name, username: r.username || 'new_member', age: r.age, gender: r.gender, location: r.location,
    job: r.job, lookingFor: r.looking_for, spiritual: r.spiritual, political: r.political, orientation: r.orientation,
    interestedIn: r.interested_in, causes: r.causes || [], hobbies: r.hobbies || [], smoke: r.smoke, drink: r.drink,
    bio: r.bio, avatar: r.avatar_url || r.photos?.[0] || null, photos: r.photos || [], audio: r.audio_url,
    hue: r.hue ?? 120, creator: r.is_creator, followers: 0, following: 0,
  };
}

function rowToMe(r, dob) {
  const [y, m, d] = (dob || '').split('-');
  return {
    ...EMPTY_PROFILE,
    firstName: r.first_name || '', lastName: r.last_name || '', username: r.username || '', gender: r.gender || '',
    dob: dob ? { d: String(Number(d)), m: String(Number(m)), y } : { d: '', m: '', y: '' },
    interestedIn: r.interested_in || '', orientation: r.orientation || '', spiritual: r.spiritual || '',
    political: r.political || '', causes: r.causes || [], smoke: r.smoke || '', drink: r.drink || '',
    hobbies: r.hobbies || [], audio: r.audio_url, photos: r.photos || [], bio: r.bio || '', avatar: r.avatar_url,
    location: r.location || '', job: r.job || '', lookingFor: r.looking_for || '', age: r.age, hue: r.hue ?? 110,
  };
}

// camelCase profile fields -> database columns
const COLUMN_FOR = {
  firstName: 'first_name', lastName: 'last_name', username: 'username', gender: 'gender', interestedIn: 'interested_in',
  orientation: 'orientation', spiritual: 'spiritual', political: 'political', causes: 'causes', smoke: 'smoke',
  drink: 'drink', hobbies: 'hobbies', audio: 'audio_url', photos: 'photos', bio: 'bio', avatar: 'avatar_url',
  location: 'location', job: 'job', lookingFor: 'looking_for',
};

function friendlyError(error) {
  const msg = error?.message || String(error || '');
  if (/duplicate key.*username/i.test(msg)) return 'That username is taken. Try another one.';
  if (/username_check/i.test(msg)) return 'Usernames use 3–30 letters, numbers, dots or underscores.';
  if (/18 or older/i.test(msg)) return 'You must be 18 or older to use alignment.';
  if (/Failed to fetch|NetworkError/i.test(msg)) return 'Can’t reach the server. Check your connection and try again.';
  return msg || 'Something went wrong. Please try again.';
}

const POST_SELECT = `id, author_id, kind, body, images, video_url, created_at,
  author:profiles!posts_author_id_fkey(${PROFILE_COLUMNS}),
  post_likes(user_id),
  comments(id, body, created_at, author_id, author:profiles!comments_author_id_fkey(${PROFILE_COLUMNS}))`;

const NOTE_TEXT = {
  follow: 'Started following you',
  like: 'Liked your post',
  comment: 'Commented on your post',
  match: 'It’s aligning! You matched',
  super: 'Super liked you ⭐',
};

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, setState] = useState(INITIAL);
  const [toastMsg, setToastMsg] = useState('');
  const toastTimer = useRef();
  const stateRef = useRef(state);
  stateRef.current = state;

  const update = useCallback((fn) => setState((s) => ({ ...s, ...fn(s) })), []);

  const toast = useCallback((msg) => {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 2800);
  }, []);

  const fail = useCallback((error) => {
    const message = friendlyError(error);
    toast(message);
    return message;
  }, [toast]);

  // ---------- local preferences ----------
  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
    try { localStorage.setItem(PREFS_KEY, JSON.stringify({ theme: state.theme, filters: state.filters })); } catch { /* ignore */ }
  }, [state.theme, state.filters]);

  // ---------- people cache ----------
  const remember = useCallback((rows) => {
    const list = (Array.isArray(rows) ? rows : [rows]).filter(Boolean);
    if (!list.length) return;
    update((s) => {
      const people = { ...s.people };
      list.forEach((r) => {
        if (r.id === s.myId) return;
        people[r.id] = { ...people[r.id], ...rowToPerson(r), ...(people[r.id] && { followers: people[r.id].followers, following: people[r.id].following }) };
      });
      return { people };
    });
  }, [update]);

  const loadPeople = useCallback(async (ids) => {
    const missing = [...new Set(ids)].filter((id) => id && id !== stateRef.current.myId && !stateRef.current.people[id]);
    if (!missing.length) return;
    const { data } = await supabase.from('profiles').select(PROFILE_COLUMNS).in('id', missing);
    remember(data);
  }, [remember]);

  // ---------- messages ----------
  const toMessage = useCallback((m) => ({
    id: m.id, from: m.sender_id === stateRef.current.myId ? 'me' : 'them', text: m.body, image: m.image_url,
    at: new Date(m.created_at).getTime(),
  }), []);

  const otherFor = useCallback((matchId) => Object.entries(stateRef.current.matchIds).find(([, mid]) => mid === matchId)?.[0], []);

  const addMessage = useCallback((otherId, msg) => update((s) => {
    const list = s.chats[otherId] || [];
    if (list.some((m) => m.id === msg.id)) return {};
    return { chats: { ...s.chats, [otherId]: [...list, msg].sort((a, b) => a.at - b.at) } };
  }), [update]);

  // ---------- loading the signed-in user's world ----------
  const loadMatches = useCallback(async (myId) => {
    const { data } = await supabase.from('matches').select('id, user_a, user_b, created_at').is('closed_at', null);
    const matchIds = {};
    (data || []).forEach((m) => { matchIds[m.user_a === myId ? m.user_b : m.user_a] = m.id; });
    update((s) => ({ matchIds, swipes: { ...s.swipes, matches: Object.keys(matchIds) } }));
    await loadPeople(Object.keys(matchIds));
    return matchIds;
  }, [update, loadPeople]);

  const bootstrap = useCallback(async (session) => {
    const myId = session.user.id;
    const [{ data: profile }, { data: priv }, { data: follows }, { data: swipes }, { data: notes }, { data: counts }] = await Promise.all([
      supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', myId).maybeSingle(),
      supabase.from('profile_private').select('dob').eq('id', myId).maybeSingle(),
      supabase.from('follows').select('followee_id').eq('follower_id', myId),
      supabase.from('swipes').select('target_id, kind').eq('swiper_id', myId),
      supabase.from('notifications').select('id, type, created_at, read_at, post_id, actor_id').order('created_at', { ascending: false }).limit(50),
      supabase.rpc('profile_counts', { uid: myId }),
    ]);
    const me = profile ? rowToMe(profile, priv?.dob) : EMPTY_PROFILE;
    update(() => ({
      authReady: true,
      myId,
      verified: true,
      account: { email: session.user.email, username: me.username },
      onboarded: !!profile?.onboarded,
      me,
      myCounts: counts?.[0] || { followers: 0, following: 0, posts: 0 },
      following: (follows || []).map((f) => f.followee_id),
      swipes: {
        seen: (swipes || []).map((s) => s.target_id),
        liked: (swipes || []).filter((s) => s.kind !== 'pass').map((s) => s.target_id),
        superliked: (swipes || []).filter((s) => s.kind === 'super').map((s) => s.target_id),
        matches: [],
      },
      notifications: (notes || []).map((n) => ({ id: n.id, personId: n.actor_id, type: n.type, text: NOTE_TEXT[n.type], at: new Date(n.created_at).getTime(), read: !!n.read_at, postId: n.post_id })),
    }));
    await Promise.all([loadMatches(myId), loadPeople((notes || []).map((n) => n.actor_id))]);
  }, [update, loadMatches, loadPeople]);

  // ---------- auth session ----------
  useEffect(() => {
    let current = null;
    const apply = (session) => {
      const id = session?.user?.id || null;
      if (id === current) {
        if (!session) update(() => ({ authReady: true }));
        return;
      }
      current = id;
      if (!session) {
        setState((s) => ({ ...INITIAL, authReady: true, theme: s.theme, filters: s.filters, pendingEmail: s.pendingEmail }));
        return;
      }
      // Run outside the auth callback so Supabase isn't called while it holds its lock.
      setTimeout(() => { bootstrap(session).catch((e) => { fail(e); update(() => ({ authReady: true })); }); }, 0);
    };
    supabase.auth.getSession().then(({ data }) => apply(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => apply(session));
    return () => sub.subscription.unsubscribe();
  }, [bootstrap, update, fail]);

  // ---------- realtime: chat, matches, notifications ----------
  useEffect(() => {
    if (!state.myId) return undefined;
    const myId = state.myId;
    const channel = supabase.channel(`user-${myId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async ({ new: m }) => {
        let other = otherFor(m.match_id);
        if (!other) other = Object.entries(await loadMatches(myId)).find(([, mid]) => mid === m.match_id)?.[0];
        if (other) addMessage(other, toMessage(m));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches' }, () => { loadMatches(myId); })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches' }, () => { loadMatches(myId); })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${myId}` }, async ({ new: n }) => {
        await loadPeople([n.actor_id]);
        update((s) => ({ notifications: [{ id: n.id, personId: n.actor_id, type: n.type, text: NOTE_TEXT[n.type], at: Date.now(), read: false, postId: n.post_id }, ...s.notifications] }));
        const actor = stateRef.current.people[n.actor_id];
        toast(`${actor?.name || 'Someone'}: ${NOTE_TEXT[n.type]}`);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [state.myId, otherFor, addMessage, toMessage, loadMatches, loadPeople, update, toast]);

  // ---------- posts ----------
  const storePosts = useCallback((rows) => {
    const myId = stateRef.current.myId;
    remember([...rows.map((r) => r.author), ...rows.flatMap((r) => (r.comments || []).map((c) => c.author))]);
    update((s) => {
      const posts = { ...s.posts };
      const liked = new Set(s.likedPosts);
      rows.forEach((r) => {
        posts[r.id] = r;
        if ((r.post_likes || []).some((l) => l.user_id === myId)) liked.add(r.id);
      });
      return { posts, likedPosts: [...liked] };
    });
  }, [remember, update]);

  const loadFeed = useCallback(async () => {
    const { data, error } = await supabase.from('posts').select(POST_SELECT).order('created_at', { ascending: false }).limit(50);
    if (error) return fail(error);
    storePosts(data || []);
    return null;
  }, [storePosts, fail]);

  const loadPostsBy = useCallback(async (authorId) => {
    const id = authorId === 'me' ? stateRef.current.myId : authorId;
    if (!id) return;
    const { data } = await supabase.from('posts').select(POST_SELECT).eq('author_id', id).order('created_at', { ascending: false }).limit(50);
    storePosts(data || []);
  }, [storePosts]);

  // ---------- actions (stable: they read live state through stateRef) ----------
  const actions = useMemo(() => {
    const meId = () => {
      if (!stateRef.current.myId) throw new Error('Please log in again.');
      return stateRef.current.myId;
    };

    return {
      update, toast, fail, loadFeed, loadPostsBy, loadPeople, remember,

      // ----- auth -----
      signUp: async (email, password) => {
        update(() => ({ pendingEmail: email }));
        const redirect = `${window.location.origin}${window.location.pathname}`;
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirect } });
        if (error) return { error: friendlyError(error) };
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          return { error: 'An account with this email already exists. Log in instead.' };
        }
        return { needsCode: !data.session };
      },
      logIn: async (email, password) => {
        update(() => ({ pendingEmail: email }));
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (!error) return {};
        if (/not confirmed/i.test(error.message)) {
          await supabase.auth.resend({ type: 'signup', email });
          return { needsCode: true };
        }
        if (/invalid login/i.test(error.message)) return { error: 'That email and password don’t match.' };
        return { error: friendlyError(error) };
      },
      verifyCode: async (token) => {
        const email = stateRef.current.pendingEmail;
        let { error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
        if (error) ({ error } = await supabase.auth.verifyOtp({ email, token, type: 'email' }));
        return error ? { error: /expired|invalid/i.test(error.message) ? 'That code is wrong or has expired. Check the email or send a new code.' : friendlyError(error) } : {};
      },
      resendCode: async () => {
        const { error } = await supabase.auth.resend({ type: 'signup', email: stateRef.current.pendingEmail });
        if (error) fail(error); else toast('We sent you a new code');
      },
      logOut: async () => { await supabase.auth.signOut(); },
      changePassword: async (oldPassword, newPassword) => {
        const email = stateRef.current.account?.email;
        const { error: wrong } = await supabase.auth.signInWithPassword({ email, password: oldPassword });
        if (wrong) return { error: 'Your old password isn’t right.' };
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        return error ? { error: friendlyError(error) } : {};
      },
      deleteAccount: async () => {
        const id = meId();
        // List files first (needs the account), delete the account, then clean up its files.
        const files = await listOwnFiles(id).catch(() => []);
        const { error } = await supabase.rpc('delete_account');
        if (error) {
          return { error: /could not find|does not exist/i.test(error.message)
            ? 'Account deletion isn’t switched on yet. Please contact support.'
            : friendlyError(error) };
        }
        if (files.length) await supabase.storage.from(BUCKET).remove(files).catch(() => {});
        await supabase.auth.signOut();
        return {};
      },

      // ----- profile -----
      // Accepts the same camelCase fields screens use. Pictures and audio given as data: URLs are uploaded first.
      saveProfile: async (patch) => {
        const id = meId();
        update((s) => ({ me: { ...s.me, ...patch } }));
        try {
          const final = { ...patch };
          if ('avatar' in patch) final.avatar = await uploadIfNeeded(patch.avatar, id, 'avatar');
          if ('photos' in patch) final.photos = await Promise.all(patch.photos.map((p) => uploadIfNeeded(p, id, 'photos')));
          if ('audio' in patch) final.audio = await uploadIfNeeded(patch.audio, id, 'audio');
          const row = {};
          Object.entries(final).forEach(([k, v]) => {
            if (COLUMN_FOR[k]) row[COLUMN_FOR[k]] = typeof v === 'string' && v === '' && !['bio', 'location', 'job', 'first_name', 'last_name'].includes(COLUMN_FOR[k]) ? null : v;
          });
          if (Object.keys(row).length) {
            const { data, error } = await supabase.from('profiles').update(row).eq('id', id).select('age').single();
            if (error) throw error;
            update((s) => ({ me: { ...s.me, ...final, age: data?.age ?? s.me.age }, account: { ...s.account, username: final.username ?? s.me.username } }));
          }
          if (patch.dob?.d && patch.dob?.m && patch.dob?.y) {
            const dob = `${patch.dob.y}-${String(patch.dob.m).padStart(2, '0')}-${String(patch.dob.d).padStart(2, '0')}`;
            const { error } = await supabase.from('profile_private').upsert({ id, dob });
            if (error) throw error;
            const { data } = await supabase.from('profiles').select('age').eq('id', id).single();
            update((s) => ({ me: { ...s.me, age: data?.age ?? s.me.age } }));
          }
          return {};
        } catch (e) {
          return { error: fail(e) };
        }
      },
      finishOnboarding: async () => {
        const { error } = await supabase.from('profiles').update({ onboarded: true }).eq('id', meId());
        if (error) return { error: fail(error) };
        update(() => ({ onboarded: true }));
        return {};
      },
      loadCounts: async (id) => {
        const uid = id === 'me' ? meId() : id;
        const { data } = await supabase.rpc('profile_counts', { uid });
        const c = data?.[0];
        if (!c) return;
        if (uid === stateRef.current.myId) update(() => ({ myCounts: c }));
        else update((s) => (s.people[uid] ? { people: { ...s.people, [uid]: { ...s.people[uid], followers: Number(c.followers), following: Number(c.following), postsCount: Number(c.posts) } } } : {}));
      },
      searchPeople: async (q) => {
        const { data } = await supabase.rpc('search_people', { q, lim: 8 });
        remember(data || []);
        return (data || []).map(rowToPerson);
      },
      suggestedPeople: async () => {
        const { data } = await supabase.rpc('suggested_people', { lim: 8 });
        remember(data || []);
        return (data || []).map(rowToPerson);
      },

      // ----- social -----
      toggleFollow: async (id) => {
        const myself = meId();
        const following = stateRef.current.following.includes(id);
        update((s) => ({ following: following ? s.following.filter((x) => x !== id) : [...s.following, id] }));
        const { error } = following
          ? await supabase.from('follows').delete().eq('follower_id', myself).eq('followee_id', id)
          : await supabase.from('follows').insert({ follower_id: myself, followee_id: id });
        if (error) {
          update((s) => ({ following: following ? [...s.following, id] : s.following.filter((x) => x !== id) }));
          fail(error);
        }
      },
      followMany: async (ids) => {
        const myself = meId();
        const fresh = ids.filter((id) => !stateRef.current.following.includes(id));
        if (!fresh.length) return;
        update((s) => ({ following: [...s.following, ...fresh] }));
        const { error } = await supabase.from('follows').insert(fresh.map((id) => ({ follower_id: myself, followee_id: id })));
        if (error) fail(error);
      },
      toggleLike: async (postId) => {
        const myself = meId();
        const liked = stateRef.current.likedPosts.includes(postId);
        update((s) => ({ likedPosts: liked ? s.likedPosts.filter((x) => x !== postId) : [...s.likedPosts, postId] }));
        const { error } = liked
          ? await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', myself)
          : await supabase.from('post_likes').insert({ post_id: postId, user_id: myself });
        if (error) {
          update((s) => ({ likedPosts: liked ? [...s.likedPosts, postId] : s.likedPosts.filter((x) => x !== postId) }));
          fail(error);
        }
      },
      addComment: async (postId, text) => {
        const myself = meId();
        const { data, error } = await supabase.from('comments').insert({ post_id: postId, author_id: myself, body: text })
          .select('id, body, created_at, author_id').single();
        if (error) return fail(error);
        update((s) => {
          const p = s.posts[postId];
          return p ? { posts: { ...s.posts, [postId]: { ...p, comments: [...(p.comments || []), data] } } } : {};
        });
        return null;
      },
      addPost: async ({ note, text, images = [], video = null }) => {
        const myself = meId();
        try {
          const urls = await Promise.all(images.map((img) => uploadIfNeeded(img, myself, 'posts')));
          const videoUrl = await uploadIfNeeded(video, myself, 'posts');
          const { data, error } = await supabase.from('posts').insert({
            author_id: myself, kind: note !== undefined ? 'note' : 'text', body: (note ?? text ?? '').trim(), images: urls, video_url: videoUrl,
          }).select(POST_SELECT).single();
          if (error) throw error;
          storePosts([data]);
          update((s) => ({ myCounts: { ...s.myCounts, posts: Number(s.myCounts.posts) + 1 } }));
          return {};
        } catch (e) {
          return { error: fail(e) };
        }
      },
      deletePost: async (id) => {
        const { error } = await supabase.from('posts').delete().eq('id', id);
        if (error) return fail(error);
        update((s) => {
          const posts = { ...s.posts };
          delete posts[id];
          return { posts, myCounts: { ...s.myCounts, posts: Math.max(0, Number(s.myCounts.posts) - 1) } };
        });
        return null;
      },
      markNotificationsRead: async () => {
        const unread = stateRef.current.notifications.filter((n) => !n.read).map((n) => n.id);
        if (!unread.length) return;
        update((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) }));
        await supabase.from('notifications').update({ read_at: new Date().toISOString() }).in('id', unread);
      },

      // ----- dating -----
      discover: async () => {
        const f = stateRef.current.filters;
        const { data, error } = await supabase.rpc('discover', { seeking: f.seeking, min_age: f.minAge, max_age: f.maxAge === 60 ? 99 : f.maxAge, lim: 30 });
        if (error) { fail(error); return []; }
        remember(data || []);
        return (data || []).map(rowToPerson);
      },
      // Returns true when the swipe creates a match.
      swipe: async (id, kind) => {
        update((s) => ({
          swipes: {
            ...s.swipes,
            seen: [...s.swipes.seen, id],
            liked: kind === 'pass' ? s.swipes.liked : [...new Set([...s.swipes.liked, id])],
            superliked: kind === 'super' ? [...new Set([...s.swipes.superliked, id])] : s.swipes.superliked,
          },
        }));
        const { data: matchId, error } = await supabase.rpc('swipe', { target: id, swipe_kind: kind === 'like' ? 'like' : kind });
        if (error) { fail(error); return false; }
        if (matchId) {
          update((s) => ({ matchIds: { ...s.matchIds, [id]: matchId }, swipes: { ...s.swipes, matches: [...new Set([...s.swipes.matches, id])] } }));
          return true;
        }
        return false;
      },
      resetDeck: async () => {
        await supabase.from('swipes').delete().eq('swiper_id', meId()).eq('kind', 'pass');
        update((s) => ({ swipes: { ...s.swipes, seen: s.swipes.liked } }));
      },
      setFilters: (filters) => update(() => ({ filters })),
      loadChat: async (otherId) => {
        const matchId = stateRef.current.matchIds[otherId];
        if (!matchId) return;
        const { data } = await supabase.from('messages').select('id, sender_id, body, image_url, created_at')
          .eq('match_id', matchId).order('created_at').limit(500);
        update((s) => ({ chats: { ...s.chats, [otherId]: (data || []).map(toMessage) } }));
      },
      loadAllChats: async () => {
        const ids = Object.values(stateRef.current.matchIds);
        if (!ids.length) return;
        const { data } = await supabase.from('messages').select('id, match_id, sender_id, body, image_url, created_at')
          .in('match_id', ids).order('created_at', { ascending: false }).limit(300);
        const grouped = {};
        (data || []).forEach((m) => {
          const other = otherFor(m.match_id);
          if (other) (grouped[other] = grouped[other] || []).unshift(toMessage(m));
        });
        update((s) => ({ chats: { ...s.chats, ...grouped } }));
      },
      sendMessage: async (otherId, text, _from = 'me', image = null) => {
        const myself = meId();
        const matchId = stateRef.current.matchIds[otherId];
        if (!matchId) return fail('This chat is closed.');
        try {
          const imageUrl = await uploadIfNeeded(image, myself, 'chat');
          const { data, error } = await supabase.from('messages').insert({ match_id: matchId, sender_id: myself, body: text || '', image_url: imageUrl })
            .select('id, sender_id, body, image_url, created_at').single();
          if (error) throw error;
          addMessage(otherId, toMessage(data));
          return null;
        } catch (e) {
          return fail(e);
        }
      },
      closeChat: async (otherId, { report = false, reason = '' } = {}) => {
        const matchId = stateRef.current.matchIds[otherId];
        if (!matchId) return;
        const { error } = await supabase.rpc('close_match', { m: matchId, report, reason });
        if (error) { fail(error); return; }
        update((s) => {
          const matchIds = { ...s.matchIds };
          delete matchIds[otherId];
          return { matchIds, swipes: { ...s.swipes, matches: s.swipes.matches.filter((x) => x !== otherId) } };
        });
      },

      setTheme: (theme) => update(() => ({ theme })),
    };
  }, [update, toast, fail, loadFeed, loadPostsBy, loadPeople, remember, storePosts, toMessage, otherFor, addMessage]);

  // ---------- derived values for screens ----------
  const value = useMemo(() => {
    const { me, myId } = state;
    const myName = [me.firstName, me.lastName].filter(Boolean).join(' ') || state.account?.email?.split('@')[0] || 'You';
    const self = {
      id: 'me', name: myName, username: me.username || 'you', avatar: me.avatar || me.photos[0] || null, photos: me.photos,
      bio: me.bio, hue: me.hue, followers: state.myCounts.followers, following: state.following.length,
    };
    const asLocal = (id) => (id === myId ? 'me' : id);
    const person = (id) => (id === 'me' || id === myId ? self : state.people[id]);

    const posts = Object.values(state.posts)
      .map((r) => {
        const authorId = asLocal(r.author_id);
        const author = person(authorId);
        if (!author) return null;
        const likers = (r.post_likes || []).map((l) => l.user_id);
        const liked = state.likedPosts.includes(r.id);
        const likeCount = likers.filter((u) => u !== myId).length + (liked ? 1 : 0);
        return {
          id: r.id, authorId, author, createdAt: new Date(r.created_at).getTime(),
          ...(r.kind === 'note' ? { note: r.body } : { text: r.body }),
          images: r.images, video: r.video_url, liked, likeCount,
          comments: (r.comments || []).slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
            .map((c) => ({ id: c.id, by: asLocal(c.author_id), text: c.body, at: new Date(c.created_at).getTime() }))
            .filter((c) => person(c.by)),
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.createdAt - a.createdAt);

    return { ...actions, state, toastMsg, self, person, posts };
  }, [actions, state, toastMsg]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);

export function ageFromDob(dob) {
  const { d, m, y } = dob || {};
  if (!d || !m || !y) return null;
  const birth = new Date(Number(y), Number(m) - 1, Number(d));
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const beforeBirthday = today.getMonth() < birth.getMonth()
    || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export function timeAgo(ts) {
  const mins = Math.max(1, Math.round((Date.now() - ts) / 60000));
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.round(hrs / 24)}d`;
}

// Shrink an uploaded image before it's sent to storage.
export function resizeImage(file, max = 1200) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

// "Ada Chisom" -> "Ada", but keep titles like "Mr Jack" whole.
export function firstName(person) {
  const [first] = (person?.name || '').split(' ');
  return /^(mr|mrs|ms|miss|dr)\.?$/i.test(first) ? person.name : first;
}
