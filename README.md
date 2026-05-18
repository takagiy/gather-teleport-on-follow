# Gather Town Teleport on Follow

Chrome extension that teleports you next to a player when you click the "フォロー" / Follow button in Gather Town.

The extension injects a tiny script into the page world that subscribes to Gather's internal `playerSetsFollowTarget` event. Whenever a follow target is set, it reads the target's `(map, x, y)` and calls `game.teleport(...)` to move next to them, then clears the follow shortly after.

## Requirements

- [Bun](https://bun.com/) 1.3+
- Chrome 111+ (uses MV3 content scripts with `"world": "MAIN"`)

## Install dependencies

```sh
bun install
```

## Build

```sh
bun run build
```

Outputs the unpacked extension to `dist/`:

```
dist/
├── manifest.json
├── injected.js
└── icons/
    └── icon128.png
```

## Load the unpacked extension in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select the `dist/` folder.
4. Open a Gather Town space at `https://app.gather.town/app/...`.
5. Click **フォロー** / Follow on someone — you should teleport next to them.

Logs are prefixed with `[GatherTeleport/page]` and visible in the page's DevTools console (not the extension's service worker console; this is a content script running in the page world).

## Develop

```sh
bun run dev
```

Watches `src/injected.ts` and rebuilds into `dist/`. Chrome does **not** auto-reload extensions on file changes — after a rebuild:

1. Click the reload icon on the extension's card in `chrome://extensions`.
2. Reload the Gather tab.

## Package for the Chrome Web Store

```sh
bun run zip
```

Produces `gather-teleport-on-follow-<version>.zip` in the project root, ready for upload to the Web Store Developer Dashboard.

## Lint / format / type-check

```sh
bun run check       # eslint + prettier --check
bun run format      # prettier --write + eslint --fix
bun run typecheck   # tsc --noEmit
```

## Project layout

```
gather-teleport-on-follow/
├── manifest.json          # extension manifest (MV3)
├── icons/icon128.png      # extension icon
├── src/injected.ts        # source — runs in the page world
├── build.ts               # build/watch/zip orchestrator
├── docs/store-listing.md  # notes for the Web Store dashboard
└── dist/                  # build output (gitignored)
```

## License

[MIT](./LICENSE) © Yuki Takagi
