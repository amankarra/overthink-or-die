# Overthink or Die!

Overthink or Die! is a short surreal retro browser game about shadows, doors, robots, and the danger of asking too many questions. It is built with Phaser 3, TypeScript, Vite, chunky original pixel art, and optional audio that stays silent when files are missing.

Live URL: TBD

## Controls

| Input | Action |
|---|---|
| A / Left | Move left |
| D / Right | Move right |
| Space | Jump / advance dialogue |
| E | Interact / advance dialogue |
| Mouse click | Start, speak, advance dialogue, choose doors |
| M | Mute / unmute audio |
| R | Restart current scene |

## Run Locally

```sh
npm install
npm run dev
```

Production checks:

```sh
npm run build
npm run test:smoke
npm run test:smoke:prod
```

## Deploy

The game is a static site. Netlify can build it with `npm run build` and publish `dist/`.

Credits: game design, music, and direction by the developer. Built with Phaser.
