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

**iPhone preview:** open `/iphone.html` (e.g. http://localhost:5173/iphone.html) to use the app inside an iPhone 15 Pro frame. Handy for demos on a computer; on a phone the frame drops away.

**Backend:** Supabase (accounts, database, file storage, live chat). See [SUPABASE-SETUP.md](SUPABASE-SETUP.md) for the dashboard steps to finish before launch.

**Hosting on WhoGoHost / Go54 (cPanel):** see [DEPLOY-WHOGOHOST.md](DEPLOY-WHOGOHOST.md). The build includes an `.htaccess` with compression, caching and security headers.

## What's built

| Area | Screens |
| --- | --- |
| Onboarding | Splash, 3 intro slides, create account, login, OTP |
| Dating profile setup | Name/gender/birthday/interested in, orientation, spiritual & political views, causes, smoking & drinking, hobbies, conspiracy-theory voice recording, photo upload (at least 2), follow 5 creators |
| Profile | Photo, name & age, location, work, bio and what you're looking for; posts / followers / following / matches; profile-strength meter with the next thing to add; Posts, Photos (grid + viewer) and About tabs (basics, beliefs, causes, lifestyle, hobbies, voice note); Edit profile & Preview on yours, Follow and Like/Message on other people's |
| Social | Home feed with search, notifications, create post (notes, images, video), likes & comments |
| Dating | Swipe deck (drag, buttons or ← → ↑ keys), profile details under the card, super like, filters (who & age range), "It's aligning!" match screen, chats list, chat with pictures, close/report chat, people you liked, your dating profile preview with edit links |
| Settings | Account, change password, light/dark appearance, help & support, log out, delete account |

## Project layout

```
src/
  main.jsx            app entry (router + state provider)
  App.jsx             all routes and sign-in guards
  store.jsx           app state and actions, backed by Supabase
  lib/supabase.js     Supabase client and file-upload helpers
  styles.css          design tokens (sampled from Figma) and shared styles
  data/seed.js        option lists (hobbies, causes, …)
  components/         Logo, generated artwork, nav bars, chips, dialogs, post card
  screens/            Auth, Setup, Social, Profile, Dating, Settings
supabase/migrations/  database schema, security rules, storage and realtime setup
```

## Before launch

- **Finish the Supabase steps** in [SUPABASE-SETUP.md](SUPABASE-SETUP.md): run the last SQL file (Delete account), set the Site URL, put the code in the sign-up email, and connect your own email sender so emails reach everyone.
- **Sign-up is by email.** Phone-number sign-up needs an SMS provider (paid) and can be added later.
- **Artwork.** The logo, onboarding illustrations and photo placeholders are redrawn in code because the Figma plan's API limit blocked exporting the originals. Drop the exported files into `public/` and swap them in `src/components/Logo.jsx` and `src/components/Art.jsx`.
- **Media limits.** Pictures are resized before upload; videos are capped at 10 MB and voice notes at 30 seconds.
- The support email in `src/data/seed.js` is a placeholder.
