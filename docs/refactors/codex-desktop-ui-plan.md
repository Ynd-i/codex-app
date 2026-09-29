# Codex-style desktop UI

## Target and boundaries

Recreate the appearance and core interactions of Codex **26.924.22138** on macOS,
using the four dark-theme screenshots supplied on 2026-09-30. Keep all Paseo
providers and remote connections. Model names, modes, permissions, and reasoning
controls come from the selected host and provider.

The upstream baseline is `getpaseo/paseo` commit `53ee9cd` on `main`. Work lives on
`codex/desktop-ui`. This document owns the steps, decisions, progress, and evidence.
The upstream changelog continues to describe shipped releases.

Keep the daemon, relay, protocol, connection runtime, timeline synchronization,
and persistence under their existing owners. Customize desktop presentation
through small composition points and the existing `.electron.*` resolver.
Do not copy whole screens or add another client, transport, or session store.

## Steps

| Step                             | Status                     | Acceptance                                                                                                                                                                               |
| -------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0. Upstream baseline             | Complete for local startup | Pinned dependencies and workspace builds pass; original Electron screenshot and development daemon connection recorded.                                                                  |
| 1. Window and sidebar appearance | In progress                | Match window frame, navigation rail, sidebar surface, and dark palette; verify window controls, resizing, sidebar toggle, menus, and theme changes. Keep workspace navigation semantics. |
| 1a. Upstream integration check   | Awaiting a newer revision  | Review custom patch ownership. Rehearse a real merge when remote main advances beyond `53ee9cd`.                                                                                         |
| 2. Chat navigation               | Pending                    | Individual chat rows retain host, agent, and workspace identities. Verify archive, attention, pinning, and sibling-chat isolation.                                                       |
| 3. Transcript and composer       | Pending                    | Separate transcript and composer patches; verify streaming, stop, drafts, attachments, approvals, model selection, and reasoning controls.                                               |
| 4. Supporting panels             | Pending                    | Adapt Diff, files, terminal, and settings separately using additional reference screenshots.                                                                                             |
| 5. Custom distribution           | Pending                    | Independent package identity and update source; validate packaged launch and updates before distribution.                                                                                |

Each slice leaves a runnable app and a small independently revertible commit.
Update this table and its evidence before moving to the next slice. Local startup
is not acceptance of provider runs, approvals, or remote pairing.

## Update strategy

Merge upstream source changes and review server, protocol, and client compatibility
together. Keep custom changes at the presentation boundary. Any required protocol
change is a separate backward-compatible slice.

The upstream desktop updater targets `getpaseo/paseo`. Before producing a custom
package, disable installation of the upstream desktop bundle; distribution needs
an independent release source. The current work is an isolated development build.
Remote daemon upgrades retain Paseo's existing protocol and feature checks.

## Baseline evidence — 2026-09-30

- Clean upstream checkout confirmed; created `codex/desktop-ui` from `53ee9cd`.
- Installed missing Node.js `22.20.0` through mise, matching `.tool-versions`.
  Preserved npm workspaces; `npm ci --no-audit --no-fund` passed with the existing
  dependency patches.
- `npm run build:server` and `npm run build:app-deps` passed.
- Original real Electron on macOS ARM64 launched at `http://localhost:8082`;
  [original screenshot](../qa-evidence/codex-desktop/baseline.jpg) saved.
- `npm run cli -- daemon status` confirmed the desktop-managed development daemon
  is reachable on `127.0.0.1:6768`, using `.dev/paseo-home` and `.dev/user-data`.
  Claude, Codex, Copilot, OpenCode, and Pi were discovered; no real provider turn
  or remote pairing was exercised.
- Remote `main` still resolved to `53ee9cd` when checked. No newer revision was
  available for the first merge rehearsal.

## Development and validation

Use the existing pinned runtime. A bare `mise exec` also attempts to resolve the
unrelated Android SDK in this checkout; the installed Node path avoids that work.

```sh
PATH=/Users/yndi/.local/share/mise/installs/node/22.20.0/bin:$PATH PASEO_ELECTRON_REMOTE_DEBUGGING_PORT=9234 npm run dev:desktop
```

Reuse an already-running development instance. Desktop Metro selects a free port
from 8082–8089. Do not restart the production daemon on 6767. Native inspection
must target the exact app path `node_modules/electron/dist/Electron.app`; its
bundle identifier is shared by another checkout.

Build workspace dependencies before diagnosing type errors. Run root typecheck,
lint and formatting checks, plus focused regression files; never run the whole
test suite locally. Record real Electron evidence separately from browser,
simulated provider, real provider, Windows/mobile, and packaged-app evidence.

Store implementation screenshots in `docs/qa-evidence/codex-desktop/`. Private
source screenshots and comparisons containing personal chat titles remain in
ignored `.dev/codex-reference/`. Compare matching viewport regions and density.

## Reference coverage and next input

Available: full window, empty new-chat state, transcript, attachment previews,
model menu, and reasoning-intensity menu. Later slices need expanded tool output,
an approval request, a Diff panel, and appearance/keyboard settings screenshots.
