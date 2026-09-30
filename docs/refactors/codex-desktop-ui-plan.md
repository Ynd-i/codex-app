# Codex-style desktop UI

## Target and boundaries

Recreate the appearance and core interactions of Codex **26.924.22138** on macOS,
using the original dark-theme screenshots and the user's `context-images/`. Keep all Paseo
providers and remote connections. Model names, modes, permissions, and reasoning
controls come from the selected host and provider.

The upstream baseline is `getpaseo/paseo` commit `53ee9cd` on `main`. Work lives on
`codex/desktop-ui`. This document owns the steps, decisions, progress, and evidence.
The root [changelog](../../CHANGELOG.md) records custom work under Unreleased;
the existing versioned entries describe upstream releases.

Keep the daemon, relay, protocol, connection runtime, timeline synchronization,
and persistence under their existing owners. Customize desktop presentation
through small composition points and the existing `.electron.*` resolver.
Do not copy whole screens or add another client, transport, or session store.

## Steps

| Step                             | Status                                        | Acceptance                                                                                                                                                                                       |
| -------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0. Upstream baseline             | Complete for local startup                    | Pinned dependencies and workspace builds pass; original Electron screenshot and development daemon connection recorded.                                                                          |
| 1. Window and sidebar appearance | Complete for local macOS development          | Desktop shell and dark palette implemented; native navigation, sidebar toggle, menus, theme changes, window resize/fullscreen/reactivation checked. Scoped visual QA passed.                     |
| 1a. Upstream integration check   | Merged and rebuilt                            | Merge `309f2c4` includes upstream `4e9a458` (release notes plus a host-startup race fix). No conflicts; server/client rebuild and 11 targeted startup tests passed.                              |
| 2. Chat navigation               | Core implemented; final UI acceptance pending | Chat rows, shared sidebar/titlebar actions, draft isolation, Back/Forward and current title implemented. Final native visual verification remains.                                               |
| 3. Transcript and composer       | Core composer implemented; transcript pending | Column, frame, mode/model controls and reasoning popover implemented; isolated provider-control, attachment, send/stop checks pass. Attachment menu, empty state and transcript matching remain. |
| 4. Supporting panels             | Pending                                       | Adapt Diff, files, terminal, and settings separately using additional reference screenshots.                                                                                                     |
| 5. Custom distribution           | Pending                                       | Independent package identity and update source; validate packaged launch and updates before distribution.                                                                                        |

Each slice leaves a runnable app and a small independently revertible commit.
Update this table and its evidence before moving to the next slice. Local startup
is not acceptance of provider runs, approvals, or remote pairing.

## Execution plan

Work is authorized through implementation, local validation, and regular commits.
Keep working on independent slices while a reference or native UI check is blocked.
Do not treat a missing screenshot as a reason to stop unrelated implementation.
Use this plan for status and the root changelog for user-visible changes; do not
create another task ledger.

| Track                  | Ordered slices                                                                                                                                                                                   | Completion evidence                                                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chat and composer      | Align transcript width, type and spacing; align composer and attachment previews; adapt provider-backed model/effort controls.                                                                   | Targeted action regressions; isolated renderer checks for sibling drafts, navigation, send/stop and attachments; native comparison against the matching supplied state. |
| Supporting UI          | Inspect the supplied browser and settings states; adapt existing panels one at a time; then tool output, waiting approval and populated diff when their references are available.                | Existing panel navigation and keyboard behavior retained; empty, loading and error states checked; each visual state has its own evidence.                              |
| Upstream compatibility | Keep presentation in desktop overrides; review each upstream merge; rebuild affected workspace dependencies before checking consumers.                                                           | Small revertible commits, no unintended backend/protocol changes, targeted tests for changed upstream behavior. Last accepted upstream parent: `4e9a458`.               |
| Distribution           | Inspect existing identity and updater configuration; prevent a custom package from installing official Paseo bundles; prepare a separate identity/channel; build and validate the local package. | Packaged launch and update behavior accepted separately from development. A release destination, signing identity and any publication are resolved before distribution. |

For each slice: inspect its source and reference, make the smallest change, run
focused checks plus root typecheck/lint/format, review the diff, update the relevant
evidence and changelog, then commit only the slice's files. Preserve user images
and other unrelated work. Never restart the production daemon on 6767.

The migration is complete only when the scoped desktop surfaces, provider behavior,
remote connection behavior, upstream integration, and custom package have their
required acceptance evidence. Browser tests using an Electron bridge and simulated
provider do not establish native, real-provider, remote-device, or packaged acceptance.

### Work that can continue unattended

Code inspection, implementation, targeted unit tests, isolated headless renderer
tests, dependency builds, documentation, and commits can continue while the Mac
is locked. Native screenshots and window interactions wait for manual unlock.
The active Codex goal tracks continuation; this document is the durable checkpoint.

At 2% remaining account usage, alert the user; at 1%, save a verified checkpoint
and prepare the requested banked reset. The current tool exposes usage and reset
counts but cannot redeem a reset. If execution stops at the limit, manual reset
is required before continuation; do not claim a reset was applied.

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

Back/Forward and the current-chat title are now implemented. Navigation history
ignores bootstrap/workspace-hydration states and waits for explicit open intents
to settle. A new case in the existing desktop project-picker suite passed with an
isolated daemon and Chromium renderer: sibling drafts, initial Back state,
Back/Forward, chat pinning, and the pin shortcut. This uses a simulated Electron
bridge; native visual acceptance still requires an unlocked Mac.

The current-chat titlebar now reuses the sidebar's action menu, rename dialog and
archive flow. Its regression checks rename and archive against the selected chat
while retaining the sibling's title, draft and unarchived state. The menu state is
keyed by host/chat so switching chats cannot retarget an open rename dialog.
The extended isolated renderer case passed in 56.2 seconds, including a real
browser connection drop: rename reports the disconnection, preserves its draft,
and succeeds after the host reconnects. Metadata writes now require a connected
client and use the client's error handling instead of pausing in the query layer.
The pin shortcut uses that same mutation path. Root typecheck and lint passed.

Sidebar/actions commit: `4a66271`; navigation commit: `1a104c6`. Remaining in phase 2:
final native visual verification. Then continue transcript, composer, model/effort
and attachment presentation. Consolidate the retained workspace header/tab chrome
with supporting-panel controls only after their entry points remain reachable.
Real-provider turns and the remaining visual states still need their own checks.

Additional references supplied by the user are in `context-images/`; preserve
them as user-owned, currently untracked files. They cover chat actions, search,
model/effort and attachment menus, approval mode, browser and many settings views.
A real expanded execution, waiting approval request, populated code diff, and
keyboard-settings reference still need confirmation before those visual changes.

The remote reference advanced again before the merge: the actual second parent
of merge `309f2c4` is `4e9a458`, which includes `3fea128` and a seven-line host-runtime
startup guard plus its regression test. The merge commit subject names the earlier
revision; the parent hash is authoritative. Inspected both changes, rebuilt the
server/client stack, and passed the 11 initial-connection bootstrap cases.

## Phase 3 progress — 2026-09-30

The macOS default chat/Markdown column is now 736px; an explicit saved width still
wins, and the other platforms keep their 820px default. The composer reuses its
existing input, attachment, submission and cancellation machinery with a 24px
radius, tighter insets and a borderless surface. Read-only input retains its
dotted border. The macOS stop button follows the neutral foreground treatment;
other platforms retain their original stop styling.

A new case in the existing desktop renderer suite passed with a real isolated
daemon and the Mock Load Test provider. It uploads a JSON attachment, preserves a
40-line draft at 900 × 680, verifies that attachment/send/stop controls stay in
the viewport, sends the message and stops the run. Screenshots at 1352 × 782 and
900 × 680 were inspected; the test prints their artifact paths. Root typecheck,
lint and the two theme/settings regression files passed (81 unit tests).

The mode control now sits beside attachments, with model and reasoning controls
aligned to the right. The renderer regression first failed against the old
ordering, then passed after the change; it also selects Ten second stream and
High through the UI and reads those exact values back from the isolated daemon.
Wide and narrow screenshots were inspected after the selection changes.

Model and reasoning now share a compact popover on macOS. The model action opens
the existing searchable provider/model browser in the same surface. A native
range input exposes only the host's declared reasoning options, supports keyboard
input, and commits pointer changes on release. Reset is available only for a
declared default. A one-option model has a disabled range; a model without
reasoning options opens the model browser directly. The existing provider, profile,
loading and retry behavior remains under the model browser's ownership.

The expanded renderer case passed in 5.1 seconds (18.1 seconds including setup):
model selection, keyboard adjustment, reset, deferred pointer submission, one/no
reasoning option, attachment upload, narrow long-draft layout, send and stop.
The popover screenshot was inspected. Root typecheck, lint and translation parity
passed (36 locale tests). The macOS combobox frame uses the same rounded surface
for the preferences and model browser.

This is acceptance of the frame, controls and those simulated-provider interactions.
The attachment menu, new-chat empty state, transcript spacing, and native comparison
remain in this phase. Preserve all provider-backed choices while changing their
presentation.

## Resume checkpoint

Continue in this checkout on `codex/desktop-ui`; preserve the user's untracked
`context-images/`. Native inspection is awaiting Mac unlock. The installed pinned
Playwright Chromium headless runtime now supports isolated renderer tests.

Latest composer evidence is recorded above; the earlier theme/settings tests pass (81).
The extended chat-action browser case passed in 56.2 seconds. Earlier navigation
model, agent attention (16), locale
parity and chat projection/metadata checks passed. The browser regression caught
both an initial-open history entry and a paused offline mutation; each was fixed
before a passing rerun. No live-provider or packaged acceptance is implied.

Relevant logs for the next continuation: `/private/tmp/paseo-model-popover-e2e.log`,
`/private/tmp/paseo-model-popover-typecheck.log`, `/private/tmp/paseo-model-popover-lint.log`,
`/private/tmp/paseo-model-popover-i18n.log`, `/private/tmp/paseo-composer-settings-tests.log`,
`/private/tmp/paseo-chat-toolbar-recovery.log`, and
`/private/tmp/paseo-upstream-runtime-tests.log`. The development instance uses 8083
and 6768; reuse it if still running. The ignored `.dev/qa-chat-state.mts` queries
only the two locally created mock fixtures; A was archived and B remains available.

Unrelated development-runtime WIP appeared during the model-popover slice in
desktop launch scripts, daemon runtime paths, server environment/supervisor files
and `docs/development.md`. Preserve its ownership; stage migration files explicitly.

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
chat actions, search/history, model and reasoning controls, approval-mode menu,
browser side panel, and general/appearance/agent/connection settings. Use the
matching file under `context-images/` before each slice; these files are private
reference material and are not part of the application bundle.

Still needed for final visual matching: expanded tool execution, an actual waiting
approval request, a populated code diff, and keyboard settings. The approval-mode
menu and untracked-files warning do not establish those missing states. Preserve
the existing behavior until those visual references can be confirmed.
