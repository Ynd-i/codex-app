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

| Step                             | Status                               | Acceptance                                                                                                                                                                   |
| -------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0. Upstream baseline             | Complete for local startup           | Pinned dependencies and workspace builds pass; original Electron screenshot and development daemon connection recorded.                                                      |
| 1. Window and sidebar appearance | Complete for local macOS development | Desktop shell and dark palette implemented; native navigation, sidebar toggle, menus, theme changes, window resize/fullscreen/reactivation checked. Scoped visual QA passed. |
| 1a. Upstream integration check   | Patch reviewed; merge deferred       | Custom changes are confined to client presentation. Remote main was still `53ee9cd`; a real merge rehearsal awaits a later upstream revision.                                |
| 2. Chat navigation               | In progress                          | Build agent-level project/recent/pinned rows, then navigation and chat-scoped actions. Reuse the directory/runtime and generic agent metadata API; verify sibling isolation. |
| 3. Transcript and composer       | Pending                              | Separate transcript and composer patches; verify streaming, stop, drafts, attachments, approvals, model selection, and reasoning controls.                                   |
| 4. Supporting panels             | Pending                              | Adapt Diff, files, terminal, and settings separately using additional reference screenshots.                                                                                 |
| 5. Custom distribution           | Pending                              | Independent package identity and update source; validate packaged launch and updates before distribution.                                                                    |

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

## Phase 1 evidence — 2026-09-30

[Visual QA and interaction evidence](../qa-evidence/codex-desktop/design-qa.md)
records the comparison scope, screenshots, fixes, and remaining acceptance gaps.
The development window remains available as **Paseo Debug**, currently served by
Metro on `http://localhost:8083` with daemon `127.0.0.1:6768`.

The first slice adds the 44px titlebar, 50px navigation rail, rounded content
frame, 278px default sidebar, and a macOS default-dark palette. It retains
Paseo branding, the existing workspace list, provider selection, menus, and user
appearance settings. Narrow settings windows give the rail's width back to the
settings split. Light and other contributed/built-in palettes remain upstream.

Validation: root `npm run typecheck`, `npm run lint`, and formatting passed;
2 focused Vitest files passed (7 tests). Commit hooks run formatting, lint, and
workspace typechecks again. The renderer remains a development build; its expected
Electron CSP warning is not packaged-app acceptance. Native window resize was
verified; sidebar width clamping is covered by the existing layout tests, while
sidebar drag persistence has not been independently accepted by automation.

Custom patch ownership:

- `.electron.*` shell and theme-registration modules own the new presentation.
- Root layout owns composition, corner clearance, focus-mode visibility, and the
  existing native window-color bridge; sidebar owns its header/footer and width.
- Panel state changes only the macOS initial width; saved widths are not migrated.
- `packages/server`, `packages/protocol`, `packages/client`, and the Electron main
  process remain unchanged. No dependency or transport was added.

Local commits: `bcb2c6a` records the baseline and plan; the following
`feat(desktop): add codex-style macos shell` commit contains the first UI slice
and its evidence. No remote push or packaged distribution was performed.

Next: phase 2 chat navigation. Preserve agent/workspace/host identities and test
archive, attention, pinning, and sibling isolation before changing row ownership.
The forward control and richer sidebar header actions belong to that slice.

## Phase 2 progress — 2026-09-30

Chat rows now use the existing agent directory and retain host/workspace/agent
identities. Recent, Pinned, and project groups reuse existing project filters and
collapsed sections. Empty workspaces retain an entry for files and terminals.
The workspace-only display options stay in the original UI; the chat header
exposes only filters that actually affect chat projection.

Chat pinning and manual unread use the generic agent metadata API, with
`codex-ui.pinned-at` (ISO timestamp; empty means unpinned) and `codex-ui.unread`
(`true`/`false`). Existing labels are patched, not replaced. No backend or wire
schema change is needed. Opening one chat clears only that chat's attention;
manual unread unfocuses only the target chat and survives leaving the pane.
Permission attention remains protected. The existing archive hook owns rollback
and tab cleanup. The pin shortcut targets the current chat when one is selected.

Native development verification with two Mock Load Test agents in the same
workspace confirmed: selecting B preserves A's attention; pinning B leaves A's
labels unchanged; B's manual unread survives switching to A and clears on reopening
B; A's draft is absent in B and restored on return; archiving A leaves B idle and
the workspace usable. These are real daemon/client operations with a simulated
provider, not real-provider acceptance. Focused projection, metadata, attention,
and translation-parity checks cover the corresponding regression boundaries.

Remaining in phase 2: titlebar Back/Forward across sibling chats, current-chat
title/actions, and final visual/shortcut verification. The Mac became locked
before the last menu/shortcut polish could be checked; the user has been asked
to unlock it. Code and automated checks can continue meanwhile.

Additional references supplied by the user are in `context-images/`; preserve
them as user-owned, currently untracked files. They cover chat actions, search,
model/effort and attachment menus, approval mode, browser and many settings views.
A real expanded execution, waiting approval request, populated code diff, and
keyboard-settings reference still need confirmation before those visual changes.

The fetched upstream `3fea128` changes only `CHANGELOG.md`. Merge it after the
current sidebar slice is committed; record that this rehearsal tests a documentation
revision, not a backend/client compatibility change.

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
