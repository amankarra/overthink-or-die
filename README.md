# OVERTHINK OR DIE

**ADVENTURES OF A REAL NOWHERE MAN**

A short surreal retro browser game about shadows, doors, robots, philosophers, and the danger of asking too many questions.

Built with Phaser 3, TypeScript, Vite, original pixel-art sprites, and OGG audio.

## Requirements

Install these first:

- [Node.js](https://nodejs.org/) 20 or newer
- npm, which comes with Node.js
- A modern desktop browser such as Chrome, Edge, Firefox, or Safari

The game uses keyboard controls, so it is meant to be played on a computer rather than a phone.

## Run The Game Locally

From the project folder, install dependencies:

```sh
npm install
```

Start the local dev server:

```sh
npm run dev
```

Vite will print a local URL in the terminal. It usually looks like this:

```txt
http://127.0.0.1:5173/
```

Open that URL in your browser.

If port `5173` is already busy, Vite may choose another port. Use the exact URL shown in your terminal.

## Controls

| Input | Action |
|---|---|
| A / Left Arrow | Move left |
| D / Right Arrow | Move right |
| Space | Jump / advance dialogue |
| E | Interact / advance dialogue |
| Mouse click | Start, speak, advance dialogue, choose doors |
| M | Mute / unmute audio |
| R | Restart current scene |

Audio may require one click or key press before it starts, because browsers block sound until the player interacts with the page.

## Build For Sharing

Create a production build:

```sh
npm run build
```

The finished static site will be created in:

```txt
dist/
```

You can preview the production build locally with:

```sh
npm run preview
```

Then open the URL Vite prints in the terminal.

## Test

Run the smoke tests:

```sh
npm run test:smoke
```

Run a production smoke test:

```sh
npm run test:smoke:prod
```

## Deploy

This is a static browser game. Any host that can serve static files can run it.

For Netlify, the included `netlify.toml` uses:

```txt
Build command: npm run build
Publish directory: dist
```

For GitHub Pages, build the project and publish the contents of `dist/`.
