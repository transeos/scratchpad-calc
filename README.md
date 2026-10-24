# Scratchpad Calculator

A scientific calculator. Expressions are evaluated by
[ExprTk](https://www.partow.net/programming/exprtk/) — the C++ library vendored in
`3rdPartyLib/exprtk` — compiled to WebAssembly and run in the browser. The front
end is TypeScript and React, bundled with webpack into static files.

Nothing is sent to a server: the wasm module, your variables and your history all
stay in the browser.

## Editor

VS code (https://code.visualstudio.com/download) is recommended.

## Prerequisite(s)

- **Node.js 20 or newer** — https://nodejs.org/en/download
- **Emscripten SDK** — only needed to rebuild the WebAssembly module. See
  [Rebuilding the WebAssembly module](#rebuilding-the-webassembly-module).

## Download the git repository

The calculator needs the `exprtk` submodule, so clone recursively:

```sh
# SSH
git clone --recursive git@github.com:transeos/scratchpad-calc.git

# HTTPS
git clone --recursive https://github.com/transeos/scratchpad-calc
```

Already cloned without `--recursive`?

```sh
git submodule update --init --recursive
```

## Building and running on localhost

Install dependencies:

```sh
npm install
```

## Start server

```sh
npm run dev
```

Then open http://localhost:3000.

## Testing

```sh
npm test
```

The suite loads the compiled wasm module and checks arithmetic, precedence,
variable binding, error reporting, and every function the UI advertises.

Type checking is separate:

```sh
npm run typecheck
```

## Rebuilding the WebAssembly module

`public/wasm/exprtk.mjs` and `public/wasm/exprtk.wasm` are build outputs. You only
need to regenerate them after changing `wasm/exprtk_bridge.cpp` or updating the
`exprtk` submodule.

Install the Emscripten SDK once:

```sh
git clone https://github.com/emscripten-core/emsdk.git /c/emsdk
cd /c/emsdk
python emsdk.py install latest
python emsdk.py activate latest
```

Then, from the repository root:

```sh
npm run build:wasm
```

The script looks for `em++` on `PATH` and otherwise falls back to `$EMSDK`
(default `/c/emsdk`). Set `EMSDK` if the SDK lives elsewhere:

```sh
EMSDK=/path/to/emsdk npm run build:wasm
```

## Production build

```sh
npm run build
```

This writes a static site to `dist/`. Upload the **contents** of `dist/` to an S3
bucket (at the root or under any prefix) — there is no server-side code.

| File                    | Content-Type                 | Cache                       |
| ----------------------- | ---------------------------- | --------------------------- |
| `index.html`            | `text/html`                  | `no-cache`                  |
| `sw.js`                 | `text/javascript`            | `no-cache`                  |
| `manifest.webmanifest`  | `application/manifest+json`  | short                       |
| `main.<hash>.js`        | `text/javascript`            | long, e.g. 1 year immutable |
| `main.<hash>.css`       | `text/css`                   | long, e.g. 1 year immutable |
| `workbox-<hash>.js`     | `text/javascript`            | long, e.g. 1 year immutable |
| `wasm/exprtk.js`        | `text/javascript`            | short                       |
| `wasm/exprtk.wasm`      | `application/wasm`           | short                       |
| `icons/*`               | `image/png`, `image/svg+xml` | short                       |

`wasm/exprtk.js` must be served as JavaScript or the browser will not load it.
`sw.js` must not be cached long, or users will not pick up new releases. The
`*.map` files are source maps; uploading them is optional.

Share links have the form `/?expr=<url-encoded expression>`, so they work on a
plain S3 bucket with no redirect rules.

To try the production build locally:

```sh
npm run build
npm run preview
```

Then open http://localhost:4173.

## Installing as an app (PWA)

The calculator can be installed like a regular desktop or phone app. It then
opens in its own window, has its own icon, and works **completely offline**: no
server, no network, no `npm` command running.

You install it *from a browser*, while the calculator is open in it. The browser
only offers to install it when both of these are true:

- the page comes from a **production build** (`npm run build`). The dev server
  (`npm run dev`) leaves out the offline support, so it can't be installed.
- the address is **`https://…`** or **`http://localhost…`**. Any other `http://`
  address, and opening `dist/index.html` directly from disk (`file://`), will
  not work.

Pick **A** to install it on this computer now, or **B** to install it from your
hosted copy on any device.

### A. Install on this computer (no hosting needed)

1. Build and serve the app:

   ```sh
   npm run build
   npm run preview
   ```

2. Open **http://localhost:4173** in **Chrome** or **Edge**, and wait until a
   result appears for an expression (that means everything has been cached).
3. Install it, using either:
   - the **install icon** at the right end of the address bar (a screen with a
     down arrow), then **Install**; or
   - the **⋮** menu (Chrome) / **…** menu (Edge) → **Cast, save, and share** →
     **Install page as app…** (Edge: **Apps** → **Install this site as an
     app**).
4. The calculator opens in its own window. You'll find it in Launchpad / the
   Dock / Spotlight on macOS, or the Start menu on Windows.
5. Press **Ctrl+C** in the terminal to stop `npm run preview`. The installed app
   keeps working without it.

### B. Install from your hosted site

1. Upload `dist/` (see [Production build](#production-build)) to a host that
   serves it over **HTTPS**. The plain S3 website endpoint
   (`http://<bucket>.s3-website-<region>.amazonaws.com`) is HTTP-only, so put
   CloudFront, or another HTTPS front, in front of the bucket.
2. On the device, open the `https://` address and wait until the calculator
   shows a result.
3. Install it the way your browser does:

   | Device and browser                  | Steps                                                                      |
   | ----------------------------------- | -------------------------------------------------------------------------- |
   | Chrome or Edge on Mac/Windows/Linux | Install icon in the address bar, or the menu, as in step A.3 above         |
   | Safari on macOS 14 or newer         | **File** → **Add to Dock…** → **Add**                                      |
   | Safari on iPhone / iPad             | **Share** button (square with up arrow) → **Add to Home Screen** → **Add** |
   | Chrome on Android                   | **⋮** menu → **Install app** (or **Add to Home screen**) → **Install**     |
   | Firefox on desktop                  | Not supported; use one of the browsers above                               |

### After installing

- **Updates:** when you upload a new build, the installed app downloads it in
  the background the next time it is opened online, and uses it from the
  following launch.
- **Your data:** variables and history are kept per address. An app installed
  from `http://localhost:4173` and one installed from your HTTPS site do not
  share data.
- **Uninstall:** in Chrome/Edge, open the app → **⋮** / **…** menu →
  **Uninstall**. On macOS (Safari), drag it from `~/Applications` to the Trash.
  On a phone, remove it like any other app.

### If there's no install option

- Check the address bar: it must start with `https://` or `http://localhost`.
- Make sure you ran `npm run build`, not `npm run dev`.
- In Chrome, open DevTools (**F12**) → **Application** → **Manifest**. The
  *Installability* section lists the exact reason, if there is one.
- Already installed? The browser hides the install option. Look for an **Open
  in app** button in the address bar instead.

## Layout

| Path                     | What it holds                                            |
| ------------------------ | -------------------------------------------------------- |
| `src/index.tsx`          | Entry point: mounts the calculator, reads `?expr=` links   |
| `src/index.html`         | HTML template the bundle is injected into                  |
| `src/styles.css`         | Global stylesheet                                          |
| `src/components/`        | React components for the display, numpad and tab panels    |
| `src/lib/`               | wasm loader, formatting helpers, function catalogue        |
| `webpack.config.mjs`     | Dev server and production build configuration              |
| `wasm/`                  | The C++ bridge to ExprTk and its Emscripten build script   |
| `public/`                | Copied into `dist/` as-is: manifest and app icons          |
| `public/wasm/`           | Generated wasm module and its loader, copied into `dist/`  |
| `dist/`                  | Production build output (not committed)                    |
| `3rdPartyLib/exprtk/`    | ExprTk, as a git submodule                                 |
| `test/`                  | Mocha tests that run against the compiled module           |

## Expression syntax

Anything ExprTk accepts, including:

- arithmetic and precedence — `1 + 2 * 3`, `2 ^ 3 ^ 2`
- functions — `sqrt`, `log10`, `hypot`, `clamp`, `ncdf`, and ~50 more
- constants — `pi`, `e`, `inf`, `epsilon`
- comparisons and logic — `3 > 2 and 1 < 2`
- conditionals — `if(x > 0, 1, -1)` and `x > 0 ? 1 : -1`
- your own variables, defined in the Variables tab
