# Putting alignment on WhoGoHost (Go54)

alignment builds to plain files (HTML, CSS, JavaScript and images), so it runs on any WhoGoHost / Go54 cPanel hosting plan. No Node.js, PHP or database is needed on the server.

## 1. Get the upload file

Either use the ready-made `alignment-whogohost.zip`, or build it yourself:

```bash
npm install
npm run build
```

Then zip everything **inside** the `dist` folder (not the folder itself). Include the hidden `.htaccess` file. On Windows, turn on "Show hidden items" in File Explorer so you can see it.

## 2. Upload it with cPanel File Manager

1. Log in to your WhoGoHost / Go54 client area and open **cPanel** for your domain.
2. Under **Files**, click **File Manager**.
3. Open **public_html**. This is the folder your domain shows.
   - If it has an old site or a default `index.html` / `default.html` page in it, delete or move those files first.
4. Click **Upload** and pick `alignment-whogohost.zip`. Wait for the progress bar to reach 100%, then click **Go Back to "/home/…/public_html"**.
5. Right-click the zip, choose **Extract**, and extract into `/public_html`.
6. Check that `public_html` now holds `index.html`, `.htaccess`, `manifest.webmanifest`, the icon files and an `assets` folder. If `.htaccess` isn't listed, click **Settings** (top right) and tick **Show Hidden Files (dotfiles)**.
7. Delete the zip from `public_html`.

Open your domain in a browser. You should see the alignment loading screen, then the intro slides.

## 3. Turn on HTTPS

1. In cPanel, open **SSL/TLS Status** (or **SSL/TLS Manager**) and make sure your domain has a certificate. Most plans issue a free one automatically. It can take a few hours after the domain first points to the server.
2. Once `https://yourdomain` shows a padlock, edit `public_html/.htaccess` in File Manager and remove the `#` from these two lines so everyone is sent to the secure address:

   ```apache
   RewriteCond %{HTTPS} !=on
   RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
   ```

HTTPS matters here: browsers only allow the microphone (the voice-note step) on secure sites.

## Installing in a subfolder instead

To put the app at `yourdomain.com/app/`, create `public_html/app`, extract the zip there, and in that folder's `.htaccess` change `RewriteRule ^ / [R=302,L]` to `RewriteRule ^ /app/ [R=302,L]`.

## Updating the site later

Build again, then upload and extract the new zip over the old files. Delete the old `assets` folder first so outdated files don't pile up. Visitors get the new version straight away: `index.html` is never cached, and the other files get new names on every build.

## What the `.htaccess` file does

- Compresses files and caches the app's code for a year, so repeat visits load fast.
- Sends mistyped addresses back to the home page.
- Adds security headers, blocks folder listings and hides config files if they're uploaded by mistake.
- Allows the microphone for this site only, and blocks camera and location, which the app doesn't use.

It was tested on Apache 2.4, the web server cPanel hosting uses, at the domain root and in a subfolder.

## Things to know before going live

- **There's no backend yet.** Accounts, posts, matches and chats are saved only in each visitor's own browser, so people can't see each other. The OTP step accepts any 4 digits. Add a real backend before promoting the site.
- The support email address in `src/data/seed.js` is a placeholder.
