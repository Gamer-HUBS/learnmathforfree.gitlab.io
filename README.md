# Learn Math For Free

This project runs as a Node.js app with an Express server and two web app surfaces:

- `public/`: main site pages (`games`, `admin`, `adtable`, `chats`, `settings`, etc.)
- `active/`: browser/proxy UI (Scramjet + Ultraviolet engine toggle)

## Requirements

- Node.js `18+` (Node `20+` recommended)

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:3000`.

## Important routes

- `/` -> home page
- `/games` -> games page
- `/admin` -> admin page
- `/adtable` -> admin table
- `/active/` -> proxy browser UI
- `/active/loader.html?q=<base64-url>` -> proxy launcher entry

## Proxy flow

1. `games.html` launches a game id via `game/#<id>`.
2. `game/iframe.js` resolves the game target from `public/games.json`.
3. Proxy game ids can point to `../active/loader.html?q=<base64-url>`.
4. Loader normalizes and forwards to `/active/index.html?inject=<url>`.
5. `active/index.html` opens the target with selected engine:
   - Scramjet
   - Ultraviolet

## Settings loader injection

The server injects `settings-loader.js` into served HTML responses if missing, so shared settings behaviors load consistently across pages.

## Added proxy game ids

`public/games.json` includes:

- `kirka-proxy`
- `crazygames-proxy`
- `poki-proxy`
- `geforcenow-proxy`

And `public/games.html` includes visible tiles for:

- `kirka-proxy`
- `crazygames-proxy`

## Dev notes

- Start in dev watch mode:

```bash
npm run dev
```

- If proxy scripts change and behavior seems stale, hard refresh and clear service workers in the browser dev tools.

## Deploment

To deploy you can't deploy the site on gitlab pages because it doesn't support node.js. You can deploy it on a VPS or a cloud platform like Heroku, Vercel, or Netlify.

What learmathforforefree\mathlearnhub uses:
- Cloudflare Pages

Before deploying change all preset links to your own domain. And add your own firebase config

What to do to depoly on Pages :
1. Go to cloudflare.com
2. Create a Cloud flare Pages
3. Name it whatever you want
4. Upload all files
5. Click on deploy