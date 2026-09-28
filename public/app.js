// Heartline front-end. Data is sample/demo only and is kept in the browser's localStorage.

const storage = {
  get(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable (private mode etc.) — app still works for this visit */
    }
  },
};

// ---------- Landing page ----------

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

const signupForm = document.getElementById('signup-form');
if (signupForm) {
  const success = document.getElementById('signup-success');

  signupForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(signupForm));

    if (!signupForm.checkValidity()) {
      signupForm.reportValidity();
      return;
    }
    if (Number(data.age) < 18) {
      success.style.display = 'block';
      success.style.background = '#fdecef';
      success.style.color = '#b3243f';
      success.textContent = 'Sorry, you must be 18 or older to join Heartline.';
      return;
    }

    storage.set('heartline:profile', { ...data, createdAt: new Date().toISOString() });
    success.style.display = 'block';
    success.style.background = '';
    success.style.color = '';
    success.textContent = `Welcome, ${data.name}! Your profile is ready. Taking you to Discover…`;
    signupForm.querySelector('button').disabled = true;
    setTimeout(() => { window.location.href = 'discover.html'; }, 1500);
  });
}

// ---------- Discover page ----------

// Sample profiles for the demo. `likesYou` decides whether a like becomes a match.
const PROFILES = [
  { id: 1, name: 'Maya', age: 27, city: 'Lagos', bio: 'Weekend hiker, weekday product designer. Looking for someone to try new restaurants with.', tags: ['Hiking', 'Design', 'Food'], colors: ['#a18cd1', '#fbc2eb'], likesYou: true },
  { id: 2, name: 'Daniel', age: 29, city: 'Abuja', bio: 'Software engineer who cooks a mean jollof. Ask me about my vinyl collection.', tags: ['Music', 'Cooking', 'Tech'], colors: ['#ff9a76', '#e8436b'], likesYou: true },
  { id: 3, name: 'Amara', age: 25, city: 'Port Harcourt', bio: 'Nurse, bookworm, and a terrible (but enthusiastic) dancer.', tags: ['Books', 'Dancing', 'Travel'], colors: ['#43cea2', '#185a9d'], likesYou: false },
  { id: 4, name: 'Tobi', age: 31, city: 'Ibadan', bio: 'Photographer chasing golden hour. Big on family, bigger on good coffee.', tags: ['Photography', 'Coffee', 'Family'], colors: ['#f6d365', '#fda085'], likesYou: true },
  { id: 5, name: 'Zainab', age: 28, city: 'Kano', bio: 'Lawyer by day, amateur astronomer by night. Let’s stargaze.', tags: ['Astronomy', 'Law', 'Tea'], colors: ['#4facfe', '#00f2fe'], likesYou: false },
  { id: 6, name: 'Chidi', age: 30, city: 'Enugu', bio: 'Football on Sundays, entrepreneur the rest of the week. Always up for a road trip.', tags: ['Football', 'Business', 'Road trips'], colors: ['#667eea', '#764ba2'], likesYou: true },
  { id: 7, name: 'Ngozi', age: 26, city: 'Lagos', bio: 'Teacher who loves board games and bad puns. Plant parent of 14.', tags: ['Board games', 'Plants', 'Teaching'], colors: ['#fa709a', '#fee140'], likesYou: false },
  { id: 8, name: 'Emeka', age: 32, city: 'Abuja', bio: 'Architect. I sketch buildings and people-watch in cafés. Swipe right for good conversation.', tags: ['Architecture', 'Art', 'Cafés'], colors: ['#30cfd0', '#330867'], likesYou: true },
];

const deck = document.getElementById('deck');
if (deck) {
  const matchList = document.getElementById('match-list');
  const noMatches = document.getElementById('no-matches');
  const likeCount = document.getElementById('like-count');
  const toast = document.getElementById('toast');

  let state = storage.get('heartline:swipes', { seen: [], liked: [], matches: [] });
  let busy = false;

  const gradient = (p) => `linear-gradient(160deg, ${p.colors[0]}, ${p.colors[1]})`;
  const remaining = () => PROFILES.filter((p) => !state.seen.includes(p.id));

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function renderDeck() {
    deck.innerHTML = '';
    const left = remaining();

    if (left.length === 0) {
      deck.innerHTML = `
        <div class="deck-empty">
          <div>
            <h2 style="margin:0 0 6px;color:var(--ink)">You're all caught up</h2>
            <p style="margin:0">Check back soon for new people, or press "Start over".</p>
          </div>
        </div>`;
      return;
    }

    // Render the next two so the one underneath is visible as the top one leaves.
    left.slice(0, 2).reverse().forEach((p) => {
      const card = document.createElement('article');
      card.className = 'profile-card';
      card.dataset.id = p.id;
      card.innerHTML = `
        <div class="profile-photo" style="background:${gradient(p)}">${escapeHtml(p.name[0])}</div>
        <div class="profile-info">
          <h2>${escapeHtml(p.name)}, ${p.age}</h2>
          <div class="meta">📍 ${escapeHtml(p.city)}</div>
          <p>${escapeHtml(p.bio)}</p>
          <div class="tags">${p.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>
        </div>`;
      deck.appendChild(card);
    });
  }

  function renderSidebar() {
    const matches = PROFILES.filter((p) => state.matches.includes(p.id));
    matchList.innerHTML = matches
      .map((p) => `
        <li>
          <div class="avatar" style="background:${gradient(p)}">${escapeHtml(p.name[0])}</div>
          <div><strong>${escapeHtml(p.name)}</strong><small>Say hi to ${escapeHtml(p.name)} 👋</small></div>
        </li>`)
      .join('');
    noMatches.style.display = matches.length ? 'none' : 'block';
    likeCount.textContent = `${state.liked.length} profile${state.liked.length === 1 ? '' : 's'} liked`;
  }

  function decide(liked) {
    if (busy) return;
    const top = remaining()[0];
    if (!top) return;
    busy = true;

    const card = deck.querySelector(`[data-id="${top.id}"]`);
    card.classList.add(liked ? 'gone-right' : 'gone-left');

    state.seen.push(top.id);
    if (liked) {
      state.liked.push(top.id);
      if (top.likesYou) {
        state.matches.push(top.id);
        showToast(`It's a match with ${top.name}! 💘`);
      }
    }
    storage.set('heartline:swipes', state);

    setTimeout(() => {
      renderDeck();
      renderSidebar();
      busy = false;
    }, 320);
  }

  document.getElementById('like-btn').addEventListener('click', () => decide(true));
  document.getElementById('pass-btn').addEventListener('click', () => decide(false));
  document.getElementById('reset-btn').addEventListener('click', () => {
    state = { seen: [], liked: [], matches: [] };
    storage.set('heartline:swipes', state);
    renderDeck();
    renderSidebar();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') decide(true);
    if (event.key === 'ArrowLeft') decide(false);
  });

  const profile = storage.get('heartline:profile', null);
  if (profile && profile.name) showToast(`Welcome, ${profile.name}!`);

  renderDeck();
  renderSidebar();
}
