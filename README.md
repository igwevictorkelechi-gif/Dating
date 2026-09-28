# Heartline

A dating website starter: a landing page with sign-up, and a **Discover** page where you like or pass on profiles and collect matches.

## Run it

Requires Node.js 18+. There's nothing to install.

```bash
npm start
```

Then open http://localhost:3000. Set `PORT` to use a different port.

Because the site is plain static files in `public/`, you can also host it on GitHub Pages, Netlify, or Vercel as-is.

## What's here

| File | Purpose |
| --- | --- |
| `public/index.html` | Landing page: hero, how it works, features, sign-up form |
| `public/discover.html` | Profile cards with like/pass (buttons or ← → keys) and a matches list |
| `public/styles.css` | All styling, responsive down to phone width |
| `public/app.js` | Sign-up handling and the discover/match logic |
| `server.js` | Tiny dependency-free static server |

## Current limitations

This is a front-end prototype. Profiles are sample data, and sign-ups, likes, and matches are saved only in the visitor's browser (`localStorage`). There's no backend, real accounts, or messaging yet. Those are the natural next steps (for example, Supabase for auth and a database).
