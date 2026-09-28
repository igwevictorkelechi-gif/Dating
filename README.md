# alignment

A social and dating app, built from the **LEINAD'S** Figma design. It's a mobile-first web app: it looks like the iPhone designs on a phone and shows as a phone-width column on a computer.

## Run it

Requires Node.js 18+.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/ (static files, host anywhere)
```

Routing uses URL hashes (`/#/home`), so the `dist/` folder works on GitHub Pages, Netlify, Vercel or any static host with no server setup.

## What's built

| Area | Screens |
| --- | --- |
| Onboarding | Splash, 3 intro slides, create account, login, OTP |
| Dating profile setup | Name/gender/birthday/interested in, orientation, spiritual & political views, causes, smoking & drinking, hobbies, conspiracy-theory voice recording, photo upload (at least 2), follow 5 creators |
| Social | Home feed with search, notifications, create post (notes, images, video), likes & comments, your profile, other people's profiles with follow, edit profile & photo |
| Dating | Swipe deck (drag, buttons or ← → ↑ keys), profile details under the card, super like, filters (who & age range), "It's aligning!" match screen, chats list, chat with pictures, close/report chat, people you liked, your dating profile preview with edit links |
| Settings | Account, change password, light/dark appearance, help & support, log out, delete account |

## Project layout

```
src/
  main.jsx            app entry (router + state provider)
  App.jsx             all routes and sign-in guards
  store.jsx           app state, actions, helpers (saved to localStorage)
  styles.css          design tokens (sampled from Figma) and shared styles
  data/seed.js        sample people, posts, notifications and option lists
  components/         Logo, generated artwork, nav bars, chips, dialogs, post card
  screens/            Auth, Setup, Social, Dating, Settings
```

## Current limitations (prototype)

- **No backend yet.** Accounts, profiles, posts, likes, matches and chats are saved only in the visitor's own browser. Passwords are not stored or checked, and the OTP step accepts any 4 digits. The next step is a real backend (for example Supabase for auth, database and storage, with realtime chat).
- **Sample people.** Profiles, posts and notifications come from `src/data/seed.js`. Chat replies are canned.
- **Artwork.** The logo, onboarding illustrations and photo placeholders are redrawn in code because the Figma plan's API limit blocked exporting the originals. Drop the exported files into `public/` and swap them in `src/components/Logo.jsx` and `src/components/Art.jsx`.
- **Media limits.** Uploaded pictures are resized. Videos are capped at 4 MB and voice notes at 30 seconds so they fit in browser storage.
- The support email in `src/data/seed.js` is a placeholder.
