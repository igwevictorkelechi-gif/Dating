import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { PEOPLE, POSTS, STARTER_CHATS } from './data/seed.js';

// All app state lives here and is saved to this browser's localStorage.
// This is a front-end prototype: swap these actions for API calls when the backend lands.

const KEY = 'alignment:v1';

const EMPTY_PROFILE = {
  firstName: '', lastName: '', username: '', gender: '', dob: { d: '', m: '', y: '' }, interestedIn: '',
  orientation: '', spiritual: '', political: '', causes: [], smoke: '', drink: '',
  hobbies: [], audio: null, photos: [], bio: '', avatar: null,
};

export const INITIAL = {
  account: null, // { email, username }
  verified: false,
  onboarded: false,
  me: EMPTY_PROFILE,
  following: [],
  myPosts: [],
  likedPosts: [],
  comments: {},
  swipes: { seen: [], liked: [], superliked: [], matches: ['george'] },
  chats: STARTER_CHATS,
  closedChats: [],
  filters: { seeking: 'Both', minAge: 18, maxAge: 45 },
  theme: 'light',
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return INITIAL;
    const saved = JSON.parse(raw);
    return { ...INITIAL, ...saved, me: { ...EMPTY_PROFILE, ...saved.me } };
  } catch {
    return INITIAL;
  }
}

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, setState] = useState(load);
  const [toastMsg, setToastMsg] = useState('');
  const toastTimer = useRef();

  const toast = useCallback((msg) => {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 2400);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      toast('Storage is full. Try removing some photos or videos.');
    }
  }, [state, toast]);

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
  }, [state.theme]);

  const update = useCallback((fn) => setState((s) => ({ ...s, ...fn(s) })), []);

  const value = useMemo(() => {
    const me = state.me;
    const myName = [me.firstName, me.lastName].filter(Boolean).join(' ') || state.account?.username || 'You';
    const self = {
      id: 'me', name: myName, username: me.username || state.account?.username || 'you',
      avatar: me.avatar || me.photos[0] || null, bio: me.bio, hue: 110,
      followers: 0, following: state.following.length,
    };
    const person = (id) => (id === 'me' ? self : PEOPLE.find((p) => p.id === id));

    const posts = [...state.myPosts, ...POSTS]
      .map((p) => ({
        ...p,
        author: person(p.authorId),
        liked: state.likedPosts.includes(p.id),
        likeCount: (p.likes || 0) + (state.likedPosts.includes(p.id) ? 1 : 0),
        comments: state.comments[p.id] || [],
      }))
      .sort((a, b) => b.createdAt - a.createdAt);

    return {
      state, update, toast, toastMsg, self, person, posts,

      signUp: (email) => update(() => ({ account: { email, username: email.split('@')[0] }, verified: false })),
      logIn: (username) => update((s) => ({
        account: s.account && (s.account.username === username || s.account.email === username)
          ? s.account
          : { email: username.includes('@') ? username : '', username },
        verified: false,
      })),
      verify: () => update(() => ({ verified: true })),
      logOut: () => update(() => ({ account: null, verified: false })),
      deleteAccount: () => {
        try { localStorage.removeItem(KEY); } catch { /* ignore */ }
        setState(INITIAL);
      },

      saveProfile: (patch) => update((s) => ({ me: { ...s.me, ...patch } })),
      finishOnboarding: () => update(() => ({ onboarded: true })),

      toggleFollow: (id) => update((s) => ({
        following: s.following.includes(id) ? s.following.filter((x) => x !== id) : [...s.following, id],
      })),
      toggleLike: (postId) => update((s) => ({
        likedPosts: s.likedPosts.includes(postId) ? s.likedPosts.filter((x) => x !== postId) : [...s.likedPosts, postId],
      })),
      addComment: (postId, text) => update((s) => ({
        comments: { ...s.comments, [postId]: [...(s.comments[postId] || []), { by: 'me', text, at: Date.now() }] },
      })),
      addPost: (post) => update((s) => ({
        myPosts: [{ id: `me-${Date.now()}`, authorId: 'me', likes: 0, createdAt: Date.now(), ...post }, ...s.myPosts],
      })),
      deletePost: (id) => update((s) => ({ myPosts: s.myPosts.filter((p) => p.id !== id) })),

      // Returns true when the swipe creates a match.
      swipe: (id, kind) => {
        const target = PEOPLE.find((p) => p.id === id);
        const isMatch = kind !== 'pass' && !!target?.likesYou;
        update((s) => ({
          swipes: {
            seen: [...s.swipes.seen, id],
            liked: kind === 'pass' ? s.swipes.liked : [...s.swipes.liked, id],
            superliked: kind === 'super' ? [...s.swipes.superliked, id] : s.swipes.superliked,
            matches: isMatch && !s.swipes.matches.includes(id) ? [...s.swipes.matches, id] : s.swipes.matches,
          },
        }));
        return isMatch;
      },
      resetDeck: () => update((s) => ({ swipes: { ...s.swipes, seen: [] } })),
      setFilters: (filters) => update(() => ({ filters })),

      sendMessage: (id, text, from = 'me', image = null) => update((s) => ({
        chats: { ...s.chats, [id]: [...(s.chats[id] || []), { from, text, at: Date.now(), ...(image && { image }) }] },
        closedChats: s.closedChats.filter((x) => x !== id),
      })),
      closeChat: (id) => update((s) => ({
        closedChats: [...s.closedChats, id],
        swipes: { ...s.swipes, matches: s.swipes.matches.filter((x) => x !== id) },
      })),

      setTheme: (theme) => update(() => ({ theme })),
    };
  }, [state, update, toast, toastMsg]);

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

// Shrink an uploaded image so it fits comfortably in localStorage.
export function resizeImage(file, max = 900) {
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
        resolve(canvas.toDataURL('image/jpeg', 0.82));
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
  const [first] = person.name.split(' ');
  return /^(mr|mrs|ms|miss|dr)\.?$/i.test(first) ? person.name : first;
}
