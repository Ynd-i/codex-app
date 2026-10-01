# Codex-style desktop UI

## Target and boundaries

Recreate the appearance and core interactions of Codex **26.924.22138** on macOS,
using the original dark-theme screenshots and the user's `context-images/`. Keep all Paseo
providers and remote connections. Model names, modes, permissions, and reasoning
controls come from the selected host and provider.

**Single-chat main area — 2026-10-01:** the user clarified that the main area must
show only the current conversation, with no workspace tab strip or its plus menu.
Terminal, files, diff, browser and other supporting tools open in the right
sidebar. Hide the Terminal profiles group and its edit action from desktop
launchers; provider selection belongs to New chat. Preserve the normal Terminal
tool and Paseo backend. This supersedes earlier main-tab styling work; right-side
tool tabs remain in scope. Retain existing chats, terminal IDs and panel state
when adapting saved layouts. The two `paseo-main-*-tabs-to-remove.png` references
in `context-images/` show unwanted current UI, not the target design.
The subsequent `codex-right-tools-titlebar.png` reference places supporting tabs
in the same top window bar as the chat title. Supporting content starts below
that shared bar; a file tree belongs inside the supporting tool, not beside the
main chat as a separate main tab strip.

**Sidebar and navigation rail scope — 2026-10-01:** keep Paseo's default workspace
sidebar, including its navigation rows, project/workspace groups, footer, resizing
and workspace pin shortcut. The user clarified that the separate thin icon rail
should be restored. Keep that rail independent of the workspace sidebar toggle;
hide it in compact layouts and constrained settings windows. The custom chat-row
sidebar remains outside the current scope. Keep the default 320px width for new
preferences and retain saved widths. Earlier sidebar screenshots and phase-2
results below are historical; this clarification governs the current layout.

The upstream baseline is `getpaseo/paseo` commit `53ee9cd` on `main`. Work lives on
`codex/desktop-ui`. This document owns the steps, decisions, progress, and evidence.
The root [changelog](../../CHANGELOG.md) records custom work under Unreleased;
the existing versioned entries describe upstream releases.

Keep the daemon, relay, protocol, connection runtime, timeline synchronization,
and persistence under their existing owners. Customize desktop presentation
through small composition points and the existing `.electron.*` resolver.
Do not copy whole screens or add another client, transport, or session store.

### Multi-provider reference scope — 2026-09-30

The user wants the interface to accommodate Claude models, GLM, DeepSeek, OpenRouter,
and other providers without depending on Codex/ChatGPT-only services. A reference
image defines presentation, not a feature commitment or a supported-model catalog.
Use the selected host/provider's actual capabilities for models, reasoning, tools,
permissions, and usage data; omit unavailable controls. Keep client features such
as projects, files, terminals, shortcuts, and supported plugins independent of the
model. Do not assume a capability exists merely because it appears in Codex.

Usage, plan limits, and resets remain in scope for every supported provider and
account/plan. Show used/remaining allowance, applicable quota windows, next reset
time or countdown, and available usage history or credit balances using that
provider's actual data. Distinguish scheduled quota renewal from a manual reset
or reset-credit redemption; expose the latter only when the selected provider
and plan support it. Do not hard-code Codex's quota windows, reset rules, prices,
or account data for Claude, GLM, DeepSeek, OpenRouter, or another integration.
Unavailable usage data must remain unavailable, not appear as zero. These are
implementation requirements, not a claim that every integration already exposes
all of these capabilities.

Exclude these surfaces from the desktop recreation:

- Parental controls and trusted contacts.
- Voice conversations, dictation, microphone controls, and voice shortcuts, as
  explicitly requested, even where Paseo has its own optional voice services.
- ChatGPT Pets and ChatGPT-specific profile/account-management pages. Provider
  plan information, usage, credit balances, and supported resets remain in scope.
- ChatGPT-specific import, memories, Computer History, Appshots, and account-bound
  computer-control integrations.
- OpenAI-hosted Cloud computer, Codex Cloud, cloud code-review services, and
  ChatGPT Pages/Space creation flows. Generic local diffs and code review remain
  in scope where the runtime supports them.

Existing user reference files remain intact. Retained raw screenshots may include
excluded sidebar items, microphone icons, GPT names, or cloud choices incidentally;
copy only their applicable layout and interactions, with usage and reset behavior
adapted to the actual provider and account/plan.
This request is limited to selecting screenshots and updating implementation
scope; it does not remove runtime code or add new provider integrations.

## Steps

| Step                             | Status                                                | Acceptance                                                                                                                                                                                   |
| -------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0. Upstream baseline             | Complete for local startup                            | Pinned dependencies and workspace builds pass; original Electron screenshot and development daemon connection recorded.                                                                      |
| 1. Window and sidebar appearance | Frame and Appearance controls checked                 | Window frame, navigation, Advanced collapse and motion selection have native evidence. Scoped reset passes isolated renderer and packaged checks; full reference matching remains.           |
| 1a. Upstream integration check   | Refreshed and verified                                | Upstream `4893629` integrated in isolation; 13 conflicts resolved. Provider, usage, navigation and custom desktop checks pass; protected daemon processes stay running.                      |
| 2. Chat navigation               | Single-chat layout verified locally                   | Main tabs removed; tools route right with saved state retained. Default sidebar, current-chat actions, draft isolation and Back/Forward remain. Custom chat sidebar stays deferred.          |
| 3. Transcript and composer       | Composer and activity verified; visual polish pending | Column, input/model controls, tool cards and completed-turn activity are checked in native development. Attachment-menu renderer checks pass; native follow-up and transcript polish remain. |
| 4. Supporting panels             | Right tools and shared titlebar verified locally      | Terminal, browser, file and diff routing pass. Internal file tree and responsive browser controls pass; detailed panel styling and native tool acceptance remain.                            |
| 5. Custom distribution           | Local macOS package verified; distribution pending    | Independent identity, exclusive custom scheme, update guard and isolated renderer/daemon/CLI startup pass. Release source, signing, OS handler coexistence and distribution remain.          |

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
| Upstream compatibility | Keep presentation in desktop overrides; review each upstream merge; rebuild affected workspace dependencies before checking consumers.                                                           | Small revertible commits, no unintended backend/protocol changes, targeted tests for changed upstream behavior. Last accepted upstream parent: `4893629`.               |
| Distribution           | Inspect existing identity and updater configuration; prevent a custom package from installing official Paseo bundles; prepare a separate identity/channel; build and validate the local package. | Packaged launch and update behavior accepted separately from development. A release destination, signing identity and any publication are resolved before distribution. |

For each slice: inspect its source and reference, make the smallest change, run
focused checks plus root typecheck/lint/format, review the diff, update the relevant
evidence and changelog, then commit only the slice's files. Preserve user images
and other unrelated work. Never restart the production daemon on 6767.

The migration is complete only when the scoped desktop surfaces, provider behavior,
remote connection behavior, upstream integration, and custom package have their
required acceptance evidence. Browser tests using an Electron bridge and simulated
provider do not establish native, real-provider, remote-device, or packaged acceptance.

### Parallel ownership — 2026-10-01

The user requested separate chats for concrete surfaces. Each owner implements
one visible slice at a time against the supplied Codex reference, preserving Paseo
backend, protocol, provider behavior and saved data. The shared starting checkpoint
is `7aca932`, including the restored rail in `8d4f548`.

| Chat                    | Owned frontend scope                                                                                                                                                                                                                                                              |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Paseo：设置页像素对齐   | `screens/settings/**`, `screens/settings-screen.tsx`, `components/settings/**`, `styles/settings.ts`, and a dedicated settings visual regression.                                                                                                                                 |
| Paseo：侧栏交互与动画   | `components/sidebar/**`, `components/left-sidebar.tsx`, `components/sidebar-workspace-list.tsx`, sidebar sizing/resize components, `components/desktop/desktop-shell.electron.tsx`, and a dedicated sidebar regression. Preserve the default workspace list and independent rail. |
| Paseo：聊天窗口像素对齐 | `components/message.tsx`, `agent-stream/**`, `composer/**`, and a dedicated transcript/composer regression. Preserve streaming, drafts, scroll anchoring, provider choices and send/stop behavior.                                                                                |

Owners share this checkout and must preserve each other's edits. Shared theme
tokens, translations, generic UI primitives, desktop main/preload, routes, the
changelog and this plan stay with the coordinating chat. Report a needed shared
change there rather than editing across ownership. No owner stages, commits,
stashes, switches branches or restarts the live development app. The coordinator
runs integration checks, records evidence here and creates scoped commits.

Each owner may delegate a bounded subtask to a subagent within its own files;
avoid overlapping assignments and unnecessary nested delegation. Use isolated
test state and unique evidence filenames. Native GUI validation is coordinated
here so simultaneous chats do not drive the same window. Return exact changed
paths, focused check results, before/after evidence and remaining visual gaps;
green functional tests alone do not prove pixel equality.

The transcript owner also owns the content-font preference in
`hooks/use-settings/storage.ts`, `appearance/apply.ts`, `appearance/provider.tsx`,
the typography fields of `styles/theme.ts`, `styles/markdown-styles.ts`, and their
focused tests. Empty content-font settings retain the existing UI-font fallback.
The coordinator connects that preference to Appearance after the settings owner
finishes its layout slice. Browser toolbar and Explorer tab-close controls are
separate bounded subagent assignments; neither changes shared pane state.

### Work that can continue unattended

On October 1 the regular allowance reached 0% and reported
`ordinaryUsageAllowed: false`; a new per-redemption reset confirmation was requested.
Existing prepaid credits remained available for continued authorized work;
no credits were purchased. The subsequent account read reports ordinary usage
allowed and zero banked resets. This task did not
call the reset tool. The Shell-overflow and real-webview checks are recorded below.
See [Custom package evidence](#custom-agent-links-and-refreshed-package--2026-10-01)
for the current verified source and real-renderer checks.

Code inspection, implementation, targeted unit tests, isolated headless renderer
tests, dependency builds, documentation, and commits can continue while the Mac
is locked. The Mac was unlocked during the latest continuation; the development
window follow-up below records the newly completed native checks.
The active Codex goal tracks continuation; this document is the durable checkpoint.

At 2% remaining account usage, alert the user; at 1%, save a verified checkpoint
and prepare the requested banked reset. Check every reported core usage window.
The current reset tool is available; it requires explicit confirmation for each
redemption and checks eligibility again. The allowance recovered and the reset
credit count fell without a reset-tool call from this task.

## Update strategy

Merge upstream source changes and review server, protocol, and client compatibility
together. Keep custom changes at the presentation boundary. Any required protocol
change is a separate backward-compatible slice.

The October 1 refresh integrates `upstream/main` at
`4893629ff5ff8938c129c322d6328dd183023095`, 26 commits after the previous accepted
baseline. Work was isolated in `/Users/yndi/dev/projects/codex-app/paseo-upstream-4893629`
from UI checkpoint `8f49c67`. Thirteen conflicts were resolved without overwriting
the primary checkout's separate Native session fork plan or reference images.

The merge retains upstream runtime model/thinking selection, sidebar Usage
preferences and footer ordering, stacked dialogs/host confirmation, reactive
provider icons, provider options and tool approvals. Local usage cards retain
localization, unknown-vs-zero values, credit units and reported quota durations.
Both locale key sets are present. Two combined components crossed the existing
complexity limit; a runtime-selection destructure and a close-control predicate
keep the same behavior without weakening lint rules.

Client/server packages were rebuilt before consumers were checked. Validation:
380 provider/core unit tests; 166 UI contract checks; 31 usage model/format/pin
checks; 10 Codex usage-source checks; 93 Muse and 37 Antigravity fake-CLI checks;
44 browser integration cases (41 first-pass plus three corrected platform-specific
shortcut assertions); six usage-page cases; five custom desktop cases and both
desktop usage cases. Typecheck, lint and formatting pass. The shortcut fixtures
use the actual browser platform and isolated usage data, retaining their click,
navigation, ordering and visibility assertions.

New-provider testing exposed a macOS exit race: a failed auth CLI was already a
zombie before Node consumed its exit event, so group cleanup could return EPERM
and hide the authentication error. Cleanup now waits briefly for that owned
child's exit before retrying; real permission failures still propagate with the
original error. Ten repeated auth failures verify the owned PID is gone. This
uses fake CLIs and does not establish real provider sign-in acceptance.

Logs are under `/private/tmp/paseo-upstream-`: `build-server`, `server-final-build`,
`provider-unit`, `ui-contracts`, `usage-unit`, `codex-usage-unit`, `new-providers`,
`antigravity-unit`, `browser-contracts`, `shortcut-e2e`, `desktop-regression`,
`usage-ui-e2e`, `usage-overview-verified`, `lint` and `typecheck` (`.log` suffix).
The verified merge `37be3a0` was fast-forwarded into `codex/desktop-ui`. The
primary checkout's 215-line Native session fork draft and all 74 reference files
were preserved byte-for-byte. Dependency patches and `build:app-deps` then passed
in that checkout. Native and remote-device checks remain separate. Neither
protected daemon was restarted; source integration does not claim a running-daemon
upgrade.

The upstream desktop updater targets `getpaseo/paseo`. Use the
[custom macOS package command](../release.md#custom-macos-development-package)
for this fork: automatic updates stay disabled until an independent release source
and replacement bundle are accepted. Remote daemon upgrades retain Paseo's existing
protocol and feature checks.

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
Those captures used **Paseo Debug** served by Metro on `http://localhost:8083`
with daemon `127.0.0.1:6768`; see the resume checkpoint for the current instance.

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
The later recording supplies expanded execution and keyboard-settings references.
The October 1 screenshots additionally cover populated split diffs and pending/
denied Computer Use permission cards; see Reference coverage and next input below.

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

The Mac empty composer now omits the floating focus-shortcut label, matching the
supplied projectless-chat and terminal references. It previously overlapped the
placeholder in a narrow chat column. The new renderer regression failed on that
label before the change, then passed with Meta+L focus, input/send bounds and draft
retention across 900/1352px. The [empty narrow composer capture](../qa-evidence/codex-desktop/composer-empty-narrow.png)
was inspected with a loaded Files dock. Logs:
`/private/tmp/paseo-composer-focus-hint-{red,verified,lint,typecheck}.log`.
The default Mac dark placeholder now matches the sampled reference RGB
132/132/129 (`#848481`), replacing the too-dark surface4 value. Mac chat uses
“随心输入” / “Ask anything”, with translations for all nine supported languages.
Explicit caller text and terminal prompts still take precedence. The renderer
regression went red separately for color and copy, then passed with real UI
switches through Light, Pure black and Dark, preserving each other palette and a
custom Georgia content font. Switching to Chinese confirms the reference text.
All 36 locale-resource checks pass. The [wide](../qa-evidence/codex-desktop/composer-placeholder-dark-wide.png)
and [narrow](../qa-evidence/codex-desktop/composer-placeholder-dark-narrow.png)
empty composer captures were inspected. This accepts the composer text/color
slice, not whole-window equality. The refreshed package built at `c706ee5` includes
these frontend changes. Logs: `/private/tmp/paseo-composer-placeholder-red.log`,
`/private/tmp/paseo-composer-placeholder-copy-{red,verified}.log`,
`/private/tmp/paseo-composer-copy-locales.log`, and
`/private/tmp/paseo-composer-placeholder-final-{lint,typecheck}.log`.

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

The expanded renderer case passed in 5.2 seconds (16.1 seconds including setup):
model selection, keyboard adjustment, reset, deferred pointer submission, one/no
reasoning option, attachment upload, narrow long-draft layout, send and stop.
The popover screenshot was inspected. A follow-up regression caught the generic
combobox consuming Up/Down; range controls now keep their native arrow/Home/End
behavior while the overlay prevents those keys reaching background shortcuts.
Root typecheck, lint and translation parity
passed (36 locale tests). The macOS combobox frame uses the same rounded surface
for the preferences and model browser.

The default Mac dark preset now uses the reference's coral emphasis for the
reasoning range, lightning icon and selected-level text. The reference PNG's
embedded Display profile converts its sampled color to CSS sRGB `#d97757`;
using its raw RGB bytes would produce a different color. Other palettes retain
their existing orange. The composer case first failed on the old bright orange,
then passed dark/light/dark colors and all existing provider-option, keyboard,
drag, Reset, attachment and send/stop checks. The refreshed
[popover capture](../qa-evidence/codex-desktop/model-effort-accent.png) uses an empty
usage fixture. Logs: `/private/tmp/paseo-effort-accent-red.log` and
`/private/tmp/paseo-effort-accent-final.log`.

The macOS new-chat page now centers the existing Paseo mark and a project-aware
26px heading above the bottom composer. Project, host, isolation and launch controls
remain in the existing form; their desktop pickers open upward from the bottom
placement. The layout owns its frame and omits the duplicate inner titlebar on wide
macOS windows. Other form factors retain the original presentation.

The new-chat renderer case passed in 4.5 seconds (16.1 seconds including setup),
checking project context, picker visibility, configured model, draft retention at
700px and 1352px widths, creation through the real isolated daemon, and stopping
the mock provider. Its screenshot was inspected; typecheck, lint and locale parity
passed. No creation or draft store was replaced.

User-message bubbles now use the reference's 70% maximum width, dark fill, 24px
corners and tighter vertical padding on macOS. The existing text, attachment,
copy and rewind behavior remains in the shared message renderer. The creation/
message regression passed in 6.3 seconds (18.8 seconds including setup), including
Back/Forward between the existing chat and the new-chat draft without losing its
text. Root typecheck and lint passed for the message change.

### Native follow-up

The real Electron development window is available again. Verified the localized
[new-chat page](../qa-evidence/codex-desktop/phase3-native-new-chat.jpg), the current-chat
action menu, and the [model popover](../qa-evidence/codex-desktop/phase3-native-model-menu.jpg).
Native Back/Forward between project settings and the QA chat also returned to the
correct chat and title.
Route serialization now removes only parameters consumed by the active route's
path segments. It retains an explicit `serverId` on global `/new` routes, so a
history entry cannot silently lose its chosen host. The regression first reproduced
the missing host and now passes with the navigation model checks (3 tests).
The two focused navigation/creation renderer cases also passed after the fix,
including the real disconnect/retry scenario (1.4 minutes including setup).
Tab then Up changed Low to Medium, End selected High, and Reset restored Low.
Native inspection also caught a redundant model tooltip covering the slider;
that tooltip is now suppressed on the custom macOS surface and was rechecked.
The existing Mock Load Test chat B accepted a native UI message, streamed a reply,
and completed its ten-second run. Its Stop control was visible while running;
the turn finished before the native stop check, so stop execution remains covered
by the isolated renderer case. [Chat evidence](../qa-evidence/codex-desktop/phase3-native-chat.jpg)
shows the new bubble and the retained transcript renderer. Mock tool narration
does not represent actual shell commands or source edits.

These earlier captures retain the development window's saved sidebar width and show
the historical workspace header/tab duplication. They establish native rendering and
the listed interactions, not final full-window fidelity or real-provider acceptance.

This is acceptance of the frame, controls and those simulated-provider interactions.
The attachment menu, assistant turn presentation, and supporting-panel consolidation
remain in this phase. Preserve all provider-backed choices while changing their
presentation.

### Inline tool output

The supplied expanded-tool and shell-output references now guide the macOS tool
rows: compact vertical spacing, persistent tool icons, trailing disclosure
chevrons and a separate rounded output card. Inline details have a heading and
a 160px scroll bound by default; their complete content remains available.
Existing explicit grouped-tool bounds and non-macOS card styling are retained.

The shared file-open action is a sibling of the expansion control, fixing an
observed nested-button warning. Keyboard focus reveals that action even without
hover, and file navigation leaves the tool's expansion state unchanged. The
expansion control also exposes `aria-expanded` on web.

The isolated desktop test first reproduced the nested-button issue, then verified
keyboard expansion/collapse, visible detail text, keyboard file navigation and
return, and the shell command plus its final output line. The existing ordinary
browser test for a tool-group heading transitioning into its loading animation
also passes. Root typecheck, lint and format pass. Logs:
`/private/tmp/paseo-tool-card-final-e2e.log`,
`/private/tmp/paseo-tool-shimmer-final-e2e.log`,
`/private/tmp/paseo-tool-card-typecheck.log` and
`/private/tmp/paseo-tool-card-lint.log`.
The [native output card](../qa-evidence/codex-desktop/phase3-native-tool-output.jpg)
was inspected with the existing synthetic chat; it does not represent shell
execution or a live provider run.

### Completed-turn activity

Wide macOS conversations now show elapsed headers and initially fold the completed
activity preceding the reply. The protocol has no universal commentary/final
channel, so the display boundary is the last tool/reasoning item: all subsequent
assistant blocks remain visible. Notifications, plans, plugin content and failed
or unfinished tool rows/overview groups remain outside the fold. A response with
no assistant text after its activity stays fully visible. Active turns, compact
layouts and other platforms retain their existing presentation.

This filters viewport segments only. The full layout, message identities,
copy text and fork cursors stay complete; search expands a hidden message before
scrolling to its match. Completed header identities are retained during live
text updates, and disclosure state is scoped by host, agent and turn. Expanding
pauses the viewport's existing automatic-follow behavior to keep the header at
the reader's position. Completion timestamps remain available on hover.

The initial fold and scroll-position failures were reproduced before their fixes.
The desktop regression forces partial virtualization and checks running/completed
states, compact/wide transitions, expansion position, full clipboard text, hidden
search matches and the real fork-context response. The tool-card flow also passes
through the expanded activity. All 61 targeted model, boundary, viewport and locale
unit tests pass, along with root typecheck/lint/format. Logs:
`/private/tmp/paseo-turn-activity-final-e2e.log`,
`/private/tmp/paseo-turn-activity-anchor.log`,
`/private/tmp/paseo-turn-activity-unit.log`,
`/private/tmp/paseo-turn-activity-typecheck.log` and
`/private/tmp/paseo-turn-activity-lint.log`.

Native [collapsed](../qa-evidence/codex-desktop/phase3-native-activity-collapsed.jpg)
and [expanded](../qa-evidence/codex-desktop/phase3-native-activity-expanded.jpg) states
were inspected in the existing mock conversation. This is simulated-provider and
local native acceptance, not live-provider, remote-device or packaged acceptance.

### Inline Shell overflow — 2026-10-01

Mac inline Shell cards now fade their bottom 25px only while output overflows
below the visible viewport. A native CSS mask fades text, card background and
border together into the conversation. Scrolling to the end restores the entire
card and final line; short output never receives the mask. Complete output remains
selectable, with both scroll axes intact. Full detail panels and other platforms
do not subscribe to the new scroll-boundary callback.

The existing tool-interaction case passes after its file-open assertion was moved
to the right dock. The dedicated overflow case passes long output, full-text
selection, horizontal scrolling, bottom/top transitions, collapse/reopen and a
separate short-output agent. Reusing one agent while rewriting its cached detail
was an invalid fixture and was replaced, without changing production caching.
The initial red test lacked the new surface locator; it did not separately prove
a CSS-only regression. Final inspected captures: [overflow](../qa-evidence/codex-desktop/shell-overflow-top.png),
[last line](../qa-evidence/codex-desktop/shell-overflow-bottom.png), and
[short output](../qa-evidence/codex-desktop/shell-short-output.png).
Logs: `/private/tmp/paseo-shell-fade-e2e.log` (existing case green, earlier fixture
failure) and `/private/tmp/paseo-shell-fade-verified.log` (final overflow/short case
green). Root checks pass in `/private/tmp/paseo-navigation-fade-final-{format,lint,typecheck}.log`.

The packaged large-font check found that tool output still used a fixed 18px line
height after the saved code font grew to its supported maximum of 22px. Tool
detail text and the shared diagnostic code surface now derive their line height
from the code size at 1.5×; the default 12px font retains its 18px line height.
The real Custom regression went red on 18px instead of 33px, then passed after
rebuilding. Inspected [overflow](../qa-evidence/codex-desktop/packaged-shell-large-font-top.png)
and [final-line](../qa-evidence/codex-desktop/packaged-shell-large-font-bottom.png)
captures show legible spacing and the retained bottom-boundary behavior. These
use a deliberately enlarged font to check readability, not the default reference
typography. Logs: `/private/tmp/paseo-shell-line-height-red-22.log` and
`/private/tmp/paseo-code-line-height-final.log`.

### Attachment menu

The wide macOS attachment popover now matches the composer width and opens above
the whole input. It follows window/composer resizing, keeps file upload first,
and separates available plugin sources under their own heading. Rounded surfaces
and focused rows use the existing theme tokens. The supported file, image and
Issue/PR handlers are reused; unsupported reference actions are not added.
Compact sheets and other-platform menus retain their existing presentation.

The shared menu engine now accepts a positioning anchor and optional width match;
focus restoration still targets the original button. Two isolated desktop tests
cover geometry through delayed animation cleanup, resize, initial keyboard focus, Escape restoration, canceled
selection, native-read failure, retry, successful daemon upload and draft retention.
The native dialog/file boundary is simulated in these tests. Two existing browser
tests cover upload acknowledgment and compact sheet alignment; all 33 targeted
menu unit tests and 36 locale checks pass. Root typecheck, lint and format pass. Logs:
`/private/tmp/paseo-attachment-menu-awake.log`,
`/private/tmp/paseo-attachment-menu-browser-e2e.log`,
`/private/tmp/paseo-attachment-menu-unit.log`,
`/private/tmp/paseo-attachment-menu-typecheck.log` and
`/private/tmp/paseo-attachment-menu-lint.log`.

The [isolated renderer capture](../qa-evidence/codex-desktop/phase3-renderer-attachment-menu.png)
and [native menu capture](../qa-evidence/codex-desktop/phase3-native-attachment-menu.jpg)
were visually inspected. On October 1 the existing Electron instance opened the
real macOS file chooser; canceling selected no file and returned focus to the
attachment button with the empty draft retained.
Plugin-specific resource selection has not been exercised in this slice.
Maintenance sleep coincided with fixture setup timeouts. The passing renderer run
used a temporary `caffeinate -i` wrapper; it changes no persistent power or lock settings.

### Content typography — 2026-10-01

Appearance now exposes a content-font preference independently of interface and
code fonts. Empty values inherit the existing interface font, including older
saved settings; no font files are bundled or downloaded. User text, assistant
Markdown and the composer use the content font. UI controls and code keep their
own font roles. The existing root UI-font CSS needed a separate content scope;
changing the theme token alone was insufficient in the actual renderer.

The font/settings unit checks pass (108), as do all 36 locale parity checks and
root format/lint/typecheck. The isolated desktop case sets Georgia through
Appearance, checks user/assistant/composer text and unchanged navigation, then
clears the preference and verifies the UI-font fallback. It passes alongside the
two sidebar cases in `/private/tmp/paseo-content-motion-e2e.log`.
The [typography capture](../qa-evidence/codex-desktop/transcript-content-font.png)
predates the latest single-chat main-area correction; it verifies typography,
not acceptance of the older visible main tab strip.

### Code weight — 2026-10-01

Mac Appearance now exposes Default, Regular, Medium and SemiBold beside the code
font family. Default stores no override: it retains the editor's existing 600
and the existing regular/inherited weights in chat code and diffs. Explicit choices
apply to inline/fenced Markdown, tool code, editable/readonly files and diff bodies.
Other platforms retain the saved preference without applying it. Terminal/xterm
normal and ANSI-bold weights remain independent.

Font loading, canvas painting and text measurement use the same font description;
the diff typography cache also distinguishes weight. A CSS-only canvas change
would leave painting and selection geometry inconsistent. The existing appearance
boundary refreshes rendered code without introducing another navigation or editor
lifecycle. The Advanced reset includes this preference.

Validation: 116 settings/application/boundary checks, 36 locale checks, 11 Markdown
checks and 15 diff paint/cache checks pass. The Advanced Mac and ordinary-browser
cases pass. The cross-surface renderer case verifies actual editor and Markdown
weights, Shell output, canvas draw calls, regular/default restoration and reload;
ordinary prose, composer text, heading and strong styles retain their prior values.
The canvas test observes draw calls because the painter restores context state
afterward; Chromium omits the normal 400 token when serializing a canvas font.
The [wide control](../qa-evidence/codex-desktop/appearance-code-weight-wide.png),
[narrow control](../qa-evidence/codex-desktop/appearance-code-weight-narrow.png),
[code surfaces](../qa-evidence/codex-desktop/code-weight-medium.png) and
[diff setting](../qa-evidence/codex-desktop/code-weight-diff.png) captures were
inspected. The diff capture proves preference application, not reference parity
for the still-unverified populated-diff design.

Logs: `/private/tmp/paseo-code-weight-foundation-{red,green}.log`,
`/private/tmp/paseo-code-weight-locales.log`,
`/private/tmp/paseo-code-weight-markdown-green.log`,
`/private/tmp/paseo-code-weight-diff-green.log`,
`/private/tmp/paseo-code-weight-advanced-visual.log`, and
`/private/tmp/paseo-code-weight-surfaces-final.log`.

Independent interface and content weight controls remain open work. An isolated
probe confirmed that ordinary RN-web text stays at 400 when its parent changes
to 500, so inherited container styling alone cannot implement the interface
control. Adding weight to the high-specificity font-family rule would flatten
authored emphasis; that shortcut was not introduced.

### Voice exclusions

The custom macOS desktop now hides both composer microphone controls and the
audio playback diagnostic. The shared shortcut platform guard excludes voice,
dictation, confirm and mute bindings from execution and from shortcut settings,
help and hints, including saved overrides. Browser and non-macOS desktop bindings
remain unchanged; no voice service or protocol was removed.

The keyboard platform/override regression was reproduced before the change and
all 132 focused shortcut tests pass. The renderer regression first caught the
remaining microphone, then passed with model selection, uploads, send/stop, draft
retention and the shortcut/diagnostic settings checks. Root typecheck, lint and
format passed. Logs: `/private/tmp/paseo-voice-shortcuts-tests.log`,
`/private/tmp/paseo-voice-settings-e2e.log`, `/private/tmp/paseo-voice-typecheck.log`
and `/private/tmp/paseo-voice-lint.log`.

Native inspection confirmed the empty composer has neither voice control and
Diagnostics has no playback test. The
[native shortcut input section](../qa-evidence/codex-desktop/phase3-native-keyboard-input.jpg)
contains focus, mode and interrupt actions only. This checks the excluded entry
points, not microphone hardware or voice backend behavior.

### Default sidebar restoration

The default `SidebarWorkspaceList`, navigation rows and footer are active again.
The separate navigation rail and the custom chat-pin keyboard override are no
longer mounted. Cmd+Shift+P pins the workspace as in upstream Paseo; current-chat
actions remain available through the titlebar menu. Existing sidebar preferences
and chat metadata were preserved.

The default-sidebar regression failed before the restoration and passed afterward.
All three scoped desktop flows pass: new chat/project/history, composer and
settings, and sibling-chat drafts/offline rename/archive with independent workspace
pinning. Ten sidebar layout/toggle unit tests and root typecheck/lint/format pass.
Native [restored-sidebar evidence](../qa-evidence/codex-desktop/default-sidebar-native.jpg)
shows the original workspace rows and footer alongside the migrated chat area.
Logs: `/private/tmp/paseo-default-sidebar-newchat.log`,
`/private/tmp/paseo-default-sidebar-interactions.log`,
`/private/tmp/paseo-default-sidebar-layout-tests.log`,
`/private/tmp/paseo-default-sidebar-typecheck.log` and
`/private/tmp/paseo-default-sidebar-lint.log`.

### Sidebar motion and selection — 2026-10-01

Mac Appearance now exposes a saved System / On / Off reduced-motion preference.
System listens to the live media-query setting; On and Off override it. One
application context feeds sidebar movement, outline magnification/transitions,
the synchronized streaming loader and Reanimated configuration. Consumers outside
Appearance keep their prior OS fallback, without requiring a QueryClient. Other
platforms do not mount the new override. Decorative tool-row/startup shimmer also
uses this Mac preference; necessary ActivityIndicator feedback remains available.
This follows the [global configuration API](https://docs.swmansion.com/react-native-reanimated/docs/device/ReducedMotionConfig/)
while avoiding the [startup-only OS hook](https://docs.swmansion.com/react-native-reanimated/docs/device/useReducedMotion/)
as the application preference source.

All 90 storage/context tests pass. Separate final renderer runs verify saved
overrides, reload, live System changes, immediate/animated sidebar geometry,
outline transitions and real Mock streaming-loader frames. A normal browser
shimmer regression passes. The [settings capture](../qa-evidence/codex-desktop/settings-reduced-motion.png)
was inspected. Logs: `/private/tmp/paseo-motion-unit.log`,
`/private/tmp/paseo-motion-ui.log`, `/private/tmp/paseo-motion-stream.log`, and
`/private/tmp/paseo-motion-browser.log`. Earlier fixed-frame timing assumptions in
the combined run were corrected; the final runs sample the observed transition.

The default workspace list remains intact. Its macOS show/hide action now uses
a 220ms width transition and retains rows until closing finishes. Resize width
stays independent of visibility; a canceled close cannot hide a reopened list.
Reduced-motion mode and other platforms retain immediate toggling. Navigation
rail selection has both a brighter icon and `aria-current="page"`.

Both focused renderer cases pass in `/private/tmp/paseo-content-motion-e2e.log`,
alongside the separate content-font case. They check rows during collapse, a quick
reversal, keyboard focus, the rail after navigation and instant reduced-motion
toggling. The [selection capture](../qa-evidence/codex-desktop/sidebar-navigation-selection.png)
was inspected. Root format, lint and typecheck pass; native animation timing has
not been independently measured.

## Phase 4 progress — 2026-09-30

The workspace menu, scripts, editor, Git and Explorer controls now share the
macOS window titlebar, removing the repeated workspace header beneath it. The
folder menu retains project/branch details and the existing copy/import/setup
actions. The title falls back to the workspace name when no chat is selected.
The default sidebar remains. The October 1 single-chat update below supersedes
the earlier main-pane tab and split presentation.

The toolbar uses a DOM portal so its original workspace routing and panel
contexts remain attached. Only the focused workspace contributes controls;
Settings, inactive retained workspaces and focus mode do not leave stale actions
behind. Compact layouts continue using the original mobile header. Explorer's
toggle stays in the titlebar while its panel is open. No provider, transport or
panel-content implementation was copied or replaced.

All four targeted desktop regressions pass, including the existing composer,
new-chat/history and offline chat-action flows. Root typecheck, lint and format
pass. The isolated titlebar check covers two distinct editor paths through the desktop
IPC test boundary, workspace switching, Settings return, Explorer open/close,
900px desktop and 700px compact layouts, and focus mode. Native inspection
confirmed menu placement, project/branch context and Explorer open/close in the
[consolidated toolbar](../qa-evidence/codex-desktop/phase4-native-workspace-toolbar.jpg).
Native editor launch, script execution and Git mutation were not exercised.

### Development window follow-up — 2026-10-01

After manual unlock, the existing Electron development window on port 8082 was
checked at source `1f7b321`. Its stale renderer still had the old composer prompt;
a normal Cmd+R loaded the current prompt and retained chat `123`. No daemon was
restarted. Native checks confirmed the single main chat, separate navigation rail,
default workspace sidebar, neutral Archive row, Copy submenu and disabled Mock
resume command. Copy was inspected without writing the clipboard.

Appearance Advanced collapsed and reopened with Space. Reduce motion switched to
On and was restored to its original System setting. Files and a new blank browser
opened in the right dock; the tool launcher contained no Terminal profiles. The
actual project editor displayed its source directory, kept Save disabled without
edits, and Cancel followed by Settings return retained chat `123`. The temporary
blank browser tab was closed and the original closed-dock layout restored. No
provider turn, project save, external navigation or OS protocol dispatch occurred.

Private native captures and the check manifest are in
`/private/tmp/paseo-live-20261001-qa`. The keyboard check found that ArrowRight did
not enter the Copy submenu; the shared menu correction is recorded below. Saved
native theme/size choices were preserved, so
these screenshots do not establish full-window pixel equality with the references.

After promotion to `bfe7bc7`, another normal reload verified ArrowRight, Return and
Space entering Copy and focusing its first enabled item; ArrowLeft closed it and
restored parent focus. No copy action was invoked. The updated size fields and
right-tool capsules were visually checked, settings values stayed unchanged, and
the original closed-dock chat layout was restored. The post-fix manifests and
captures are in the same private native directory.

### Single chat and right tools — 2026-10-01

The native keyboard finding was reproduced in the existing Copy regression and
fixed in the shared menu engine. [Menu keyboard behavior](../menus.md#keyboard-navigation)
now includes submenu entry/return, focus and hover ownership. Diagnostics proved
that an entering Reanimated surface could still be hidden during the old one-frame
focus attempt; focus now waits for that surface's animation only when initially
hidden and does not override a subsequent user focus change. No caller-specific
menu or second focus scope was added. The final Copy case passed twice serially,
including normal/reduced motion, disabled items, hover and clipboard isolation;
the ordinary-browser nested label-form case also passes. Logs:
`/private/tmp/paseo-submenu-keyboard-red.log`,
`/private/tmp/paseo-submenu-focus-diagnosis.log`,
`/private/tmp/paseo-submenu-keyboard-ready.log`, and
`/private/tmp/paseo-submenu-browser-final.log`.

The current-chat titlebar now includes Copy with the existing agent-ID and provider
resume-command actions. Resume uses runtime native session identity first, then
persisted native identity; it never substitutes a Paseo agent ID and is disabled
when the provider/template or identity is unavailable. Four pure checks cover that
selection. The renderer test opens the actual submenu, switches chats through
search and verifies the correct ID in an isolated clipboard-write capture. It
does not overwrite the user's clipboard or execute a provider CLI.

The shared menu anchor now flips a horizontal submenu when its requested side
cannot fit and the opposite side can, including edge padding and offset. If both
sides are too small it retains the clamp fallback. This fixes the new right-edge
Copy submenu obscuring its parent. All 23 positioning checks, the Copy renderer
case and the existing browser nested-label-menu case pass. Inspected captures:
[menu](../qa-evidence/codex-desktop/chat-copy-menu.png) and
[submenu](../qa-evidence/codex-desktop/chat-copy-submenu.png). Logs:
`/private/tmp/paseo-chat-copy-unit.log`, `/private/tmp/paseo-chat-copy-verified.log`
and `/private/tmp/paseo-menu-flip-browser.log`. Native session branching remains
outside this UI slice; no new branch or cloud-share behavior was added.

The Archive row now uses the reference's neutral text color on macOS; other
platforms retain destructive coloring, and running-agent confirmation is unchanged.
The existing Copy case first failed on the old red color, then passed in 14.4s;
the refreshed menu capture was inspected. Logs:
`/private/tmp/paseo-chat-menu-tone-{red,final}.log`.

The older desktop chat-navigation case still clicked the removed main agent tabs.
Its targeted red run reproduced that timeout; the test now selects real chats
through Command Center. Back/Forward, per-chat drafts, offline rename rejection
and recovery, chat/workspace pin scope and archive behavior all remain asserted.
After archive it checks the daemon record, active list and search absence. The
unchanged 120-second case limit and 75-second connection-liveness boundary remain.
The repaired case passes in 56.6 seconds; log:
`/private/tmp/paseo-chat-navigation-verified.log`.

The expanded packaged test then exposed a separate production bug: returning from
project settings could replace chat A with its unread sibling B. The shared
last-workspace helper reused an explicit workspace-open path that prioritizes
attention agents. It now restores the existing route and pane selection without
opening another agent tab. Explicit workspace navigation keeps its attention
priority. A focused regression first recorded the unwanted sibling tab open;
all 12 navigation tests and the original real-Electron flow now pass, with chat A
and its draft retained after project editing. Settings test helpers also restrict
their Back locator to visible screens, since inactive routes remain mounted.
Logs: `/private/tmp/paseo-settings-return-{red,unit}.log` and
`/private/tmp/paseo-settings-return-package-final.log`.

The main area now renders only the current conversation. Supporting tools move
into the right dock and share the top window bar with the chat title. The
[Explorer contract](../explorer-sidebar.md#custom-macos-layout) owns placement,
saved-layout retention and platform boundaries. The new plus menu contains tools;
provider profiles stay in New chat. Files have an internal tree on the right.

The final isolated renderer case passes for Terminal, Browser, File and Diff,
including the terminal shortcut while the composer is focused. It checks retained
chat/draft state, shared-titlebar geometry, hide/reopen, Settings return, narrow
windows, editor identity and unsaved content while toggling the file tree, and
opening another file through that tree. Inspected captures:
[right tools](../qa-evidence/codex-desktop/single-main-chat-right-tools.png) and
[file tree](../qa-evidence/codex-desktop/file-tool-with-tree.png).

Focused store, placement and plugin tests passed (167), followed by the added
macOS routing cases (7) and hidden-browser lifecycle case (1). Fresh terminal
deep links initially lacked the Explorer registration; the shared layout write
now keeps that registration synchronized. The real-terminal supporting-panel
renderer case passes, including inactive close hover/focus and retained terminal
IDs. Four ordinary-browser placement cases pass on the unchanged web layout.

On October 1, the live development renderer still showed the old main tabs after
source changes. A normal frontend reload removed the tabs and plus button while
preserving the open chat. Native evidence is private at
`.dev/codex-reference/native-single-chat-after-reload.jpg`; neither daemon was
restarted. Native right-tab dragging remains unverified. Actual browser-webview
navigation now has the isolated Electron evidence below. The file-tool follow-up adds the path and filtering controls;
these checks do not establish full pixel equality or package acceptance.

Logs: `/private/tmp/paseo-single-chat-final-e2e.log`,
`/private/tmp/paseo-supporting-titlebar-e2e.log`,
`/private/tmp/paseo-browser-placement-verified.log`,
`/private/tmp/paseo-hidden-explorer-browser.log`, and
`/private/tmp/paseo-layout-final-{format,lint,typecheck}.log`.

The legacy desktop editor tests still waited for the removed main tab bar through
`withWorkspace.navigateTo`. The reproduced timeout is now fixed by one shared
workspace-readiness helper; tests that actually require a tab bar retain their
strict tab-bar check. All four desktop editor cases pass, retaining cross-workspace
and nested-directory IPC path checks and adding the narrow Mac titlebar/right-dock
expectations. Logs: `/private/tmp/paseo-workspace-ready-{red,e2e,lint,typecheck}.log`.

### Terminal content surface — 2026-10-01

The macOS default dark terminal now uses the reference's sampled `#262626`
background. Its left/top inset is 16/8 CSS pixels at the supplied 2x scale; the
right/bottom use the same spacing as a symmetric layout choice. Insets live
outside the emulator so its existing fit logic measures the reduced content box.
Other platforms, theme palettes, ANSI output, font preferences and terminal
transport remain under their existing owners.

The existing theme regression failed with the old background and passes with the
new one, including unchanged non-Mac and other-theme identities. One new case in
the existing desktop supporting-panel suite uses a real isolated bash PTY. It
checks the full inset/background, input/output after narrowing to 900px, and the
same terminal ID after hiding/reopening the dock. The [wide capture](../qa-evidence/codex-desktop/terminal-content-wide.png)
was compared with `context-images/codex-terminal-side-panel.png` at 1352×781 CSS
pixels; the [narrow capture](../qa-evidence/codex-desktop/terminal-content-narrow.png)
was also inspected. This accepts the terminal surface changes in the renderer,
not full-window pixel equality or native app acceptance. Native inspection remains
pending while the Mac is locked.

Logs: `/private/tmp/paseo-terminal-theme-{red,green}.log`,
`/private/tmp/paseo-terminal-reference-verified.log`, and
`/private/tmp/paseo-terminal-links-{lint,typecheck}.log`.

### File path and tree controls — 2026-10-01

The supplied right-tools screenshot now guides one 48px file toolbar across the
editor and tree, with 32px path/editor capsules and a round tree toggle. The path
menu copies actual absolute or relative paths; the editor split button reuses
Paseo's current-file target planner. File size, cursor, save/error and preview-mode
controls remain in the bottom status row. The tree has a root action menu and
filter, with its search scope documented in the [Explorer contract](../explorer-sidebar.md).

Editable and read-only source files now soft-wrap in the macOS dock, matching the
reference's long import lines. The same fixture name and representative imports
exercise visual wrapping, with byte-for-byte save checks proving that no physical
newlines are inserted. The existing ordinary-browser regression still keeps
TypeScript horizontally scrollable and Markdown wrapped. Logs:
`/private/tmp/paseo-source-wrap-{red,e2e,web,lint,typecheck}.log`.

The source `context-images/codex-right-tools-titlebar.png` is 2704×1564 at 2×;
comparison uses a 1352×782 copy and a 1352×782 renderer capture. Both full views
and focused path/tree-header crops were opened together. That comparison caught
oversized path/root text; both now use the 12px small-text token. The shared row,
capsule heights, column boundaries and tree-header spacing follow the reference.
The fixture uses English labels and a temporary workspace; the source uses
Chinese labels and different file contents. This is a scoped structural/visual
comparison, not a claim of whole-window pixel equality. Existing typography,
theme tokens and real editor icons remain configurable. The default left
workspace sidebar is intentionally retained per the user's scope clarification.
The [latest file-tool capture](../qa-evidence/codex-desktop/file-toolbar-and-tree.png)
records this structural state. The source-appearance follow-up below addresses
the measured keyword/string colors, code weight and visual-row spacing.

The file-toolbar renderer case verifies path copying, file-specific editor bridge
arguments, tree-toggle editor identity and unsaved content, full-width geometry,
and controls at 1352/900/700px. The file-tree case verifies an unopened nested
match with ancestors, Enter to open, no results/clear, error/retry, and creation
and rename against the isolated daemon's filesystem. One injected response
tests search failure; successful file operations use the real daemon. Review
caught a stale-input bug after file actions: the shared search input uses an
initial value, so resetting React state did not clear its text. A local explicit
reset fixes this without changing shared input behavior; its new regression went
red then green. The ancestor-tree unit case and 36 locale checks pass.

Logs: `/private/tmp/paseo-file-toolbar-{red,e2e,lint,typecheck}.log`,
`/private/tmp/paseo-file-tree-{e2e,unit,locales}.log`,
`/private/tmp/paseo-file-filter-reset-{red,e2e,lint,typecheck}.log`, and
`/private/tmp/paseo-file-tools-integration.log` (single-chat integration passed).
The final capture and long-filename visibility checks pass in
`/private/tmp/paseo-file-tool-visual-final.log`; root format, lint and typecheck
pass in `/private/tmp/paseo-file-tools-final-{format,lint,typecheck}.log`.
Native inspection was attempted on October 1 but the Mac was locked. Native
file-tool acceptance and real editor launching remain pending; no daemon restart
was attempted.

### Source appearance — 2026-10-01

The independent Codex syntax preset lives in the app. The shared highlighter,
daemon and protocol remain unchanged. Its dark keyword, string and ordinary
identifier colors come from sampled reference pixels: `#e66845`, `#5ac461` and
`#f0f0ee`. Roles without usable samples retain the shared GitHub palette; the
light variant is adapted for legibility and is not an exact light-reference match.
Mac settings without a saved syntax choice default to Codex. Explicit One,
GitHub and other choices are retained, and the non-Mac default stays One. Existing
installations with a saved preset can choose Codex in Appearance; no user setting
was forcibly replaced.

Measured source rows were roughly 22px at the default code size. Mac file views
now use 1.8 line-height, semibold text, a wider number gutter and no extra top
padding. Font family and code size remain user-controlled. Read-only source also
has line numbers; its missing-gutter regression failed before the fix and passes
afterward. The first comparison still placed the first code row 8px too low;
removing that padding produced the [final default capture](../qa-evidence/codex-desktop/file-code-reference.png).
The full reference and focused crops were inspected at the same 1352×782 CSS size.
Different dock origins reflect the retained workspace sidebar and resizable dock;
relative gutter/content spacing is aligned.

Focused appearance/storage checks pass (105, plus the added inherited-role case).
The syntax renderer case checks sampled colors, Codex/One selection and reload
persistence, light/dark switching and a custom Courier New/16px font. The file
renderer case retains path/editor actions, byte-for-byte saves, editable/readonly
wrapping and narrow-window checks. The ordinary-browser wrapping regression also
passes. Logs: `/private/tmp/paseo-codex-syntax-{red,unit,e2e,lint,typecheck}.log`,
`/private/tmp/paseo-codex-syntax-scoped-unit.log`,
`/private/tmp/paseo-source-gutter-red.log`,
`/private/tmp/paseo-code-geometry-final.log`, and
`/private/tmp/paseo-code-geometry-web.log`.
Native source-code typography comparison remains pending; the latest unlocked
follow-up checked the Files initial view and tree, without opening source content.

### Earlier panel-tab styling

The current Mac right-tool tabs are 32 CSS pixels high, measured from the 64px
selected capsule in the 2× terminal/browser references. The shared 26px toolbar
control token and other platforms are unchanged. The existing supporting-panels
case first failed at 26px, then passed at 32px for Files and Terminal, including
900px resizing and all existing close/hover/keyboard/session-retention checks.
The refreshed [wide capture](../qa-evidence/codex-desktop/supporting-panels-32px.png)
was inspected. Log: `/private/tmp/paseo-tool-tab-height-verified.log`.

The macOS workspace and Explorer tab rails now follow the reference's rounded
selected outlines. Workspace tabs allow longer titles, reserve close-control space
in their existing sizing algorithm, and keep the active close control visible.
The default workspace sidebar and the existing tab menus, dragging and panel model
remain unchanged.

The isolated desktop check uses real daemon terminals. It covers active controls,
terminal switching, Explorer open/close, 1352px/900px resizing and keyboard closing;
the native confirmation boundary is simulated. The ordinary-browser retained-stream
regression and all 10 tab-layout tests also pass. The
[renderer capture](../qa-evidence/codex-desktop/phase4-renderer-panel-tabs.png) was
visually inspected. Default dark-theme label contrast is 8.27:1 for the selected
tab and 6.25:1 for an inactive tab. Root typecheck, lint and format pass.

Logs: `/private/tmp/paseo-supporting-panels-final-e2e.log`,
`/private/tmp/paseo-supporting-panels-browser.log`,
`/private/tmp/paseo-supporting-panels-layout-unit.log`,
`/private/tmp/paseo-supporting-panels-typecheck.log` and
`/private/tmp/paseo-supporting-panels-lint.log`.
The [native tab capture](../qa-evidence/codex-desktop/phase4-native-panel-tabs.jpg)
was inspected on October 1 after a normal renderer reload. Active outlines and
close controls were visible with Explorer open; Explorer was then closed again.
The later single-chat update integrates supporting tabs into window chrome.
Each panel's detailed presentation remains; this is not full panel acceptance.

On October 1, Explorer tabs gained their own macOS close control. A fixed 20px
slot keeps hover from moving titles. The button appears on selection, hover or
keyboard focus; choosing it does not activate or drag the tab. The final renderer
case verifies keyboard close, menu reopening with a new instance ID, inactive-tab
focus/hover and pointer close, stable geometry, and both retained terminals.
The [capture](../qa-evidence/codex-desktop/explorer-tab-close.png) was inspected.
The web hover boundary uses a native div because nested Pressables steal hover;
native platforms retain their original handlers. Root checks and the targeted
renderer case pass in `/private/tmp/paseo-final-panels-e2e.log`. The new close
control has not yet been exercised in the real Electron window.

### Browser toolbar — 2026-10-01

The macOS toolbar uses the supplied 2× browser references: a 48px row, 32px
controls/address field, 16px corners and 10px group gaps. Existing navigation and
four browser tools remain available. Other desktop platforms keep their previous
dimensions. The device-size menu now exposes its button role.

The right-dock follow-up puts device size and DevTools in More, with annotation,
screenshots and then navigation joining that menu as available width shrinks.
The [updated renderer capture](../qa-evidence/codex-desktop/browser-toolbar-right-dock.png)
was inspected. The isolated case passes at 1352/900/700px and retains the submitted
URL and address keyboard shortcut. Its profile bridge is simulated, so this does
not establish actual webview navigation or native acceptance. The passing log is
`/private/tmp/paseo-browser-responsive-e2e.log`.

The address-focus follow-up uses the supplied focused screenshot's lighter
surface and subtle edge on the default Mac dark theme; other themes retain their
own tokens. Click and the address shortcut select the URL. Blur retains a draft,
Escape restores the committed URL without navigation, and Enter submits once.
The extended renderer case went red then green across 1352/900/700px; its simulated
webview observes zero source changes for Escape and one for Enter. The
[focused capture](../qa-evidence/codex-desktop/browser-toolbar-focused.png) was
inspected. Logs: `/private/tmp/paseo-browser-focus-{red,e2e,lint,typecheck}.log`.
Actual webview navigation is covered by the isolated Electron check below.

The empty Mac address hint is centered through its placeholder pseudo-element;
the input itself retains start alignment for its caret and URL text. No duplicate
hint element, URL state or navigation path was added. The existing toolbar case
first failed on start-aligned placeholder text, then passed the new alignment and
all draft/Escape/submit/resize checks. The
[empty-address capture](../qa-evidence/codex-desktop/browser-centered-placeholder.png)
was inspected. Logs: `/private/tmp/paseo-address-placeholder-red.log` and
`/private/tmp/paseo-address-placeholder-green.log`.

The start-page follow-up matches the reference's two-column Review, Terminal,
Files and More tools section. Actions reuse the supporting launch catalog and
right-dock placement, preserving the main chat and draft. Page cards represent
only titled HTTP(S) browser tabs still present in the current host/workspace's
layout. The label is Open pages, not invented recommendations or visit history;
the group is omitted when empty. Nine locales include the new labels.

Only the two Mac UI launch paths select the private start-page URL marker. The
store and automation defaults remain unchanged. A first implementation treated
all `about:blank` pages as home; review and a failing regression exposed that this
would hide real popup/automation blank documents. The exact private fragment now
distinguishes home from ordinary blank documents, without broadening the allowed
about protocols. The same resident guest survives home/page transitions.

Two renderer cases pass: real isolated-daemon tool creation/routing, main draft
retention, active-page focus, More-menu provider exclusion, ordinary blank-page
visibility, rejection of other about fragments, guest identity, open-page reuse,
closed-tab exclusion, workspace isolation and responsive address controls. The
profile/guest boundary is simulated. The [start-page capture](../qa-evidence/codex-desktop/browser-new-tab-open-pages.png)
was inspected against the supplied browser reference. Logs:
`/private/tmp/paseo-browser-new-tab-e2e.log`,
`/private/tmp/paseo-browser-home-locales.log`, and
`/private/tmp/paseo-browser-home-final-{format,lint,typecheck}.log`.

### Real local browser navigation — 2026-10-01

The existing real-Electron harness now has a focused Mac navigation mode. A private
Mock host and temporary user data open a real local HTTP page in the right browser
dock. Submitting `/two` in the address field navigates the actual guest; Back and
Forward return between `/one` and `/two` without replacing its WebContents. The
right titlebar close button removes the tab, resident guest and browser-tool
listing. The main draft remains intact and the main tab strip stays absent.

The test uses the production deep-link queue to enter the agent route, waits for
the main inspector, and pins English for its accessible-label selectors. It
does not inject a browser bridge or send a real-provider prompt. Its environment
uses an empty temporary home, and ports 6767/6768 are excluded. The
[real guest capture](../qa-evidence/codex-desktop/browser-navigation-webview.png)
was inspected. Log: `/private/tmp/paseo-browser-navigation-final.log`; report:
`/private/tmp/paseo-browser-navigation-final-qa/result.json`. This proves local
webview navigation and cleanup, not external websites, OS URL dispatch or signing.
See [the focused command](../testing.md#desktop-browser-regression).

### Settings frame — 2026-10-01

Mac project editing now follows the supplied dialog's combined icon/name input,
520px width, source-folder group and compact Cancel/Save footer. The source path
and host are real, read-only project metadata; no unsupported multi-folder mapping
or removal control was added. The icon entry reveals the existing upload, URL and
automatic-icon controls. Name/icon validation, acquisition-before-rename and
daemon mutation paths are unchanged. The Mac regression and five existing browser
project-edit cases pass, including cancellation, invalid URL recovery, combined
save and reopening saved values.

The shared wide Mac modal frame now uses 20px corners, an 18px semibold title,
borderless header/footer and a lighter backdrop. Only the default dark dialog
surface uses the sampled neutral fill; other palettes and compact/non-Mac paths
retain their defaults. The backdrop opacity is a visual approximation from the
supplied edit/create references, not an exact same-frame measurement. Final
[wide](../qa-evidence/codex-desktop/project-edit-wide.png) and
[narrow](../qa-evidence/codex-desktop/project-edit-narrow.png) captures were inspected.
The original 440px width and 12px corner checks went red before their fixes.
The final Mac case passes in `/private/tmp/paseo-mac-modal-verified.log`; the
ordinary-browser rename case passes in `/private/tmp/paseo-mac-modal-browser.log`.
Earlier full edit-flow coverage is in `/private/tmp/paseo-project-edit-browser.log`.
The native file-picker/read boundary is simulated; project and icon saves use the
real isolated daemon. These slices are included in the refreshed bundle below.

Integration formatting, lint and workspace typechecks pass for the motion,
project/modal and Copy changes. Logs:
`/private/tmp/paseo-motion-project-copy-final-{format,lint,typecheck}.log`.

The macOS Settings sidebar is 280px with a Settings heading, back action, compact
32px category rows and searchable category labels. Existing General/Appearance
values, host selection and save paths remain. Content-font editing was delivered
with the separate typography slice.

The focused renderer case passes in `/private/tmp/paseo-settings-layout-e2e.log`.
It checks category filtering, General/Appearance navigation and 1352/900/700px
layouts. Both [General](../qa-evidence/codex-desktop/settings-general.png) and
[Appearance](../qa-evidence/codex-desktop/settings-appearance.png) captures were
inspected. Native General-to-Appearance navigation also worked; native search was
interrupted by user activity and is not accepted. Root format, lint and typecheck
pass. Detailed settings-page parity remains outstanding.

The follow-up removes six inactive placement selectors on macOS while retaining
the service-URL setting and saved placement values for other platforms. Both Mac
and Windows-runtime renderer cases pass, including setting changes and reload
persistence. This is simulated platform coverage, not a Windows-device check.

Menu interaction exposed a separate crop: the top resize edge had no horizontal
anchor, so its parent's inset created overflow. Focus then scrolled the hidden
overflow containers and moved Settings partly off-screen. Adding `left: 0` at
the shared edge fixes the source. The regression checks zero shell overflow and
fully visible navigation/search through 1352/900/700px and back, rather than
accepting partial visibility. The updated General capture was inspected. Logs:
`/private/tmp/paseo-settings-geometry-{red,e2e,lint,typecheck}.log`.

The Mac Appearance page now starts with the reference's system/light/dark preview
choices in a 78px-high mode card. The 80×60px buttons directly select the existing
theme preference; the full theme menu remains below. Claude and plugin themes
leave all three mode choices unselected, rather than misrepresent their state.
No separate mode storage or theme application path was added. The renderer case
passes keyboard activation, focus and hover, Light persistence after reload,
installation/selection/reload of the Catppuccin fixture, returning to built-in
themes and 700px layout. The [mode-card capture](../qa-evidence/codex-desktop/settings-appearance-modes.png)
was inspected. The existing ordinary-browser Pure black selector case also passes
(`/private/tmp/paseo-appearance-mode-browser.log`). Log: `/private/tmp/paseo-appearance-mode.log`; 36 locale checks
also pass in `/private/tmp/paseo-appearance-mode-locales.log`. The refreshed Custom
bundle now includes this slice and passes the real-Electron checks below;
comparison with the user's live window still waits for manual unlock.

The next settings comparison measured both original 2704px-wide references at
2× scale: their cards span 728 CSS pixels with approximately 16px corners. Mac
Settings now uses a 760px outer PageLayout column, including its existing 16px
side padding, to match that 728px content width. Other pages and platforms retain
the 720px default. Shared settings cards use 16px corners only on Mac; the local
Appearance mode-to-theme gap is 16px. General section and row spacing is unchanged.

The mode preview also now reads the platform's registered theme, correcting its
previous upstream green dark palette. Tests went red for the actual old 688px
width, 8px corners and RGB 24/27/26 preview instead of the live RGB 44/44/43.
All three updated desktop cases pass, including narrow layouts, the unchanged
Windows-runtime 688px/8px layout and plugin/theme persistence; the ordinary-browser
Pure black case passes too. Corrected captures were inspected:
[General](../qa-evidence/codex-desktop/settings-general-geometry.png) and
[Appearance](../qa-evidence/codex-desktop/settings-appearance-geometry.png).
Logs: `/private/tmp/paseo-settings-geometry{-red,,-browser}.log` and
`/private/tmp/paseo-settings-package-final-{format,lint,typecheck}.log`.

### Advanced appearance — 2026-10-01

On macOS, Interface font now sits in the upper visual-style card. Advanced starts
expanded and supports keyboard collapse/expand. It groups the existing size,
motion, content/code family and weight, width and syntax controls. Other platforms
retain their previous layout.

Reset submits only nine fields through the existing save path: interface,
content and code sizes; content and code families; code weight; content width; syntax theme;
and reduced motion. Theme, plugin theme, interface family, language and other
preferences remain unchanged. Uncontrolled inputs use their existing replacement
refs and a reset key so dirty text and the preview refresh even when stored values
already equal the defaults. A pointer reset avoids blur-saving the discarded
draft first. Save errors show a localized message and permit retry; the existing
optimistic settings cache is not rolled back by this feature.

The renderer regression passes all nine saved defaults, one storage write for a
focused dirty reset, numeric/family/width drafts when saved defaults are unchanged,
preview refresh, reload, unrelated preference retention, save failure/retry and
700px layout. The initial red run proved the missing Advanced entry. A later
test correction distinguished the legacy missing-content-size migration (14)
from the current reset default (15); product defaults were not changed. Syntax
defaults are resolved when Reset is clicked, including late desktop bridge
availability. Logs: `/private/tmp/paseo-advanced-red.log` and
`/private/tmp/paseo-advanced.log`. All 36 locale checks pass in
`/private/tmp/paseo-advanced-i18n.log`.

The existing AppearanceStyleBoundary intentionally remounts children after font
token changes. A repeated test filled the next field after storage completed but
before that remount, losing the test's new draft. Trace snapshots showed the
replacement before the next Tab event. The regression now waits for the old
input node to detach after those font-token saves before editing the next field;
no fixed sleep or production lifecycle change was added.

The [Advanced capture](../qa-evidence/codex-desktop/settings-appearance-advanced.png)
was inspected at 1352×782 with synthetic host data. The ordinary-browser interface
font-size regression passes in `/private/tmp/paseo-advanced-browser.log`.

Its Mac numeric size fields now match the reference's 64×28px controls, left-aligned
numbers and 8px corners. The sampled border/fill apply only to the default dark
preset; other themes keep semantic colors. Height remains a minimum so larger UI
fonts fit. The same Advanced regression first failed against the previous 40px
controls, then passed all three fields, Claude palette preservation and 21px UI
type without internal clipping, alongside its full reset checks. The ordinary
browser font-size case also passes. The capture above was refreshed. Logs:
`/private/tmp/paseo-size-input-red.log`, `/private/tmp/paseo-size-input.log`, and
`/private/tmp/paseo-size-input-browser.log`.

### Usage data foundation

The existing usage-source contract already supplies provider/account labels, quota
windows, reset timestamps, balances and details. Keep presentation on this contract.
It exposes no history or manual-reset operation; those controls need a supported
source capability before they can be shown.

Unknown quota percentages now retain their unavailable marker without an empty
meter. Real zero usage remains a zero-valued meter. Known meters expose min/max/current
values in browser ARIA and native accessibility props. The two targeted browser
checks cover unknown/zero/remaining-only readings and per-report refresh. Report
values are simulated at the usage RPC boundary in these checks.

A read-only development-host query found an available Codex source and an unavailable
Claude source. A separate read through the Codex adapter confirmed a primary window
of 604800 seconds. The adapter had labeled every primary window Session and mapped
absent/null percentages to zero. It now uses reported durations, keeps unknown
percentages/reset times/balances null, and preserves its existing window IDs.
Credit balances use the credit unit described in
[OpenAI's usage-credit guidance](https://help.openai.com/en/articles/12642688).
The same read-only source probe now returns Weekly and credits; credentials and
account identifiers were omitted from its evidence.

All 10 Codex usage-adapter tests pass. No credential refresh, purchase, manual reset
or provider agent turn was performed. This direct-source verification does not imply
that the already-running daemon or the previously built custom bundle contains the
latest adapter. The running daemon still reports the earlier labels and units;
the frontend does not reinterpret those provider fields. No daemon restart or
backend rebuild was performed during the October 1 frontend verification.

Logs: `/private/tmp/paseo-usage-meter-final-e2e.log`,
`/private/tmp/paseo-codex-usage-values-green.log`,
`/private/tmp/paseo-live-usage-read.log`,
`/private/tmp/paseo-codex-usage-final-probe.log`,
`/private/tmp/paseo-usage-meter-typecheck.log` and `/private/tmp/paseo-usage-meter-lint.log`.

### Usage overview — 2026-10-01

Wide macOS usage pages now show separate provider/account cards, explicit used
and remaining values, and reset countdowns driven by the existing shared clock.
The desktop overview meter represents remaining allowance; compact views retain
used allowance. Unknown readings stay unavailable, and refresh failures retain
the last report. All nine supported locales use the existing translation system.
The source-owned plan, account, quota and balance data continue through the
existing usage RPCs; this slice changes no backend or protocol.

Validation: 57 focused unit/locale checks, two desktop renderer cases and 15
existing browser usage regressions pass. The desktop cases cover countdown
expiry without a forced fetch, refresh failure/retry, live language changes and
1352/900/700px layouts. They passed again with the restored navigation rail,
alongside the existing titlebar geometry case. Root format, lint and typecheck
pass. The [renderer capture](../qa-evidence/codex-desktop/phase4-renderer-usage-overview.png)
was visually inspected; its provider data is simulated. Native inspection checked
the layout and actual source status, not the newer adapter or packaged bundle.
These checks do not establish pixel-for-pixel equality with every reference.

Logs: `/private/tmp/paseo-usage-overview-unit.log`,
`/private/tmp/paseo-usage-overview-final-e2e.log`,
`/private/tmp/paseo-usage-overview-browser.log` and
`/private/tmp/paseo-rail-geometry-e2e.log`.

### Pairing and local relay acceptance — 2026-10-01

All 11 desktop pairing UI cases pass against isolated hosts: consent/decline,
security link opening, home/settings entry points, selected-host offers,
disconnection errors, live enable/reload, rejected launch overrides, failed
transport startup, live config updates and outdated-host capability handling.
These exercise offer UI through a simulated desktop bridge, not QR consumption
or a physical remote device.

The existing relay-deployment case also passes against the real local Elixir
relay at `3fc41c96c8c63f3a7109e832899cc57d473c4531`, with its pinned Erlang 29.0.3
and Elixir 1.20.2-otp-29 installed through mise. The relay checkout is
`/Users/yndi/dev/projects/codex-app/paseo-relay`; its source remains unchanged.
A fresh daemon-browser export serves the client. The test uses a temporary daemon
and Mock stream, forbids direct daemon WebSocket fallback, and restarts only the
relay. In the final run, the reconnect notice appeared after 86ms, the relay was
ready in 428ms and reconnection completed in 4596ms. Output paused while
disconnected, running state remained visible, and non-empty output continued
beyond the initial catch-up update without user action. These are one-run local measurements, not production latency bounds.

The test setup now uses the selected PATH toolchain, shares the existing protected
port allocator and rejects missing executables promptly. Seven helper regressions
pass, including non-network tests proving that requests to both protected ports
abort before HTTP forwarding. This caught a wildcard-handler ordering gap and
keeps the test itself away from 6767/6768. Neither protected daemon was restarted.
External network/TLS, physical-device pairing and a real provider remain separate
acceptance gates. See [the local relay procedure](../testing.md#local-relay-recovery).

Logs: `/private/tmp/paseo-pair-device-migration.log` (11 cases),
`/private/tmp/paseo-relay-reconnect-continuing.log` (final actual relay case),
`/private/tmp/paseo-relay-http-guard-{red,unit}.log`,
`/private/tmp/paseo-relay-mock-type-{unit,typecheck}.log`, and
`/private/tmp/paseo-relay-final-{format,lint,typecheck}.log`.

## Phase 5 progress — 2026-09-30

The local custom-package profile and update guard are implemented. A renamed
packaged application rejects update checks and installation, including a previously
downloaded upstream artifact, before any daemon-stop callback. The macOS CLI shim
supports both upstream and custom Helper names. Packaging hooks resolve the actual
bundle name. The existing smoke harness checks the custom bundle ID, absence of an
update feed, real update IPC, renderer/daemon startup and CLI operation.

All 55 focused updater, startup and packaging tests pass. The ARM64 ad-hoc package
passed the existing real Electron smoke: renderer/preload, desktop-managed daemon,
bundled CLI cold start, terminal/hook command and cleanup. The update IPC rejects
checks and installs. The bundle ID is independent and no update feed is embedded.
A second smoke omitted GUI `PASEO_HOME` and `PASEO_LISTEN`, verified the daemon home
under isolated Electron user data and a free loopback port, then checked the same
CLI/terminal flow. Explicit launch overrides also passed in the first run.

The first build exposed a Helper/Framework signing-team mismatch. The local profile
now uses explicit ad-hoc signing and the documented library-validation entitlement
while retaining Hardened Runtime; the original failing cold-start path passes.
The [packaged renderer capture](../qa-evidence/codex-desktop/phase5-packaged-startup.png)
was visually inspected. This is local packaged startup acceptance. Developer ID
signing, notarization, a release source, OS deep links, real-provider runs and remote
pairing remain pending. See the [custom package instructions](../release.md#custom-macos-development-package).

Logs: `/private/tmp/paseo-custom-distribution-unit.log`,
`/private/tmp/paseo-custom-package-build.log` (initial signing failure),
`/private/tmp/paseo-custom-package-adhoc.log`,
`/private/tmp/paseo-custom-package-defaults.log`,
`/private/tmp/paseo-custom-typecheck.log` and `/private/tmp/paseo-custom-lint.log`.

### Shortcut search and Files initial view — 2026-10-01

Settings now searches shortcut names and their effective bindings, reusing the
existing shortcut-help filter. Rebinding updates search results; focusing search
cancels shortcut capture. Clear, no-results, unassign and reset remain available.
The new renderer search case, the existing Mac editing case, simulated Windows
editing case and repaired unassign case pass, along with 10 helper tests. The
[settings capture](../qa-evidence/codex-desktop/settings-shortcuts-search.png)
was inspected. Logs: `/private/tmp/paseo-shortcut-settings-{unit,e2e,existing,unassign}.log`.
The initial combined run included a failed unassign test; the final separate
unassign log records its passing rerun after fixing the dialog-close race.

The Mac Files tab now initially shows a shared root-path toolbar, an empty editor
and a right-hand directory tree, following the supplied file-explorer reference.
Panels narrower than 420px give the tree the full width. Selecting files retains
existing target deduplication and the chat draft. Tree filtering survives hiding
and reopening the tree in both the Files picker and file editor. The two focused
file-tree renderer cases pass, including existing create, rename and retry actions.
Inspected captures: [wide](../qa-evidence/codex-desktop/files-empty-wide.png) and
[narrow](../qa-evidence/codex-desktop/files-empty-narrow.png). Logs:
`/private/tmp/paseo-files-empty-{e2e,typecheck,lint,format}.log`.
These are isolated renderer checks, not native locked-screen or Windows-device
acceptance. All 36 locale-resource checks pass with the new translated labels.

### Mac chat search — 2026-10-01

The command center follows the supplied chat-search reference on Mac: a 520×486px
rounded panel, up to nine recent chats with project labels, then New chat, Open
folder, Search files and Settings. Control+1–9 selects the corresponding visible
chat. Querying retains the existing workspace, file and plugin contributions;
file scope and other platforms keep their existing behavior. The default dark
surface is reference-matched, with other themes using their own palette.

The [isolated renderer capture](../qa-evidence/codex-desktop/command-center-chats.png)
was inspected. Focused checks cover exact geometry, real chat navigation and draft
retention, scrolling to keyboard-selected matches, opening a file in the right
dock, clearing the previous query when switching to file scope, Escape, actual
quick actions, canceled folder selection, Light theme and narrow windows. The
navigation case passes in `/private/tmp/paseo-command-center-navigation.log`;
the separate quick-action/theme case passes in `/private/tmp/paseo-command-center.log`.
An earlier failed selector in that combined log was corrected before the passing
navigation rerun. All 34 result-model tests and the existing ordinary-browser
command-center scrolling case pass (`/private/tmp/paseo-command-center-browser.log`).
Root formatting, lint and typecheck pass for all three slices; logs are
`/private/tmp/paseo-search-files-final-{format,lint,typecheck}.log`. These checks
do not claim native pixel equality while the Mac remains locked.

### Sources menu data boundary — 2026-10-01

The supplied chat-contents menu cannot currently be copied as a complete inventory
without changing Paseo's backend contract. Canonical historical user messages do
not retain the optimistic attachment list; workspace attachment state is not a
chat source index. Terminals have workspace ownership but no agent ownership.
Loaded timeline outputs are paginated, not a complete output inventory. Keep this
menu pending rather than label these partial sources as all chat content. Existing
file/terminal navigation and attachment preview actions remain available in their
current surfaces. No protocol or persistence changes were made for this review.

### Custom agent links and refreshed package — 2026-10-01

Paseo Custom accepts `paseo-custom://h/<serverId>/agent/<agentId>` at cold-start
arguments, the open-URL event and second-instance arguments. The desktop adapter
passes this alias through the existing strict agent-link parser. The official app
and shared link builder retain `paseo://`; internal packaged pages retain
`paseo://app`. No daemon or shared protocol change is required.

The real package check caught an inherited configuration defect: electron-builder
26.8.1 concatenates arrays, so the previous `protocols: []` did not remove the
parent's `paseo` declaration. A single protocol object replaces that array. The
regression now loads both configurations through the actual builder and runs its
schema validation; the packaged smoke requires the final bundle to declare
exactly `paseo-custom`. It rejected the mixed-scheme package before launching it.

The verified bundle is `/Users/yndi/dev/projects/codex-app/paseo-upstream-4893629/packages/desktop/release-custom/mac-arm64/Paseo Custom.app`.
The primary checkout's older build output was not replaced; use the verified bundle
or rebuild the current checkout before running packaged acceptance.

The bundle was rebuilt at `c706ee5` after the placeholder and local relay changes.
The real renderer/preload, isolated daemon, bundled CLI, terminal hooks, exclusive
custom scheme and cleanup smoke passed again. Log:
`/private/tmp/paseo-current-custom-package-build.log`; isolated startup capture:
`/private/tmp/paseo-current-custom-package-qa/renderer.png`. The shortcut-search,
Files-empty-state and chat-search changes were added after that build. A second
refresh at `580aa19` included all three. Its isolated packaged smoke passes;
log: `/private/tmp/paseo-search-files-package-build.log`.

The expanded real-Electron agent-link regression also passes on the `580aa19`
bundle. It opens the actual packaged chat-search panel and Files initial view,
then checks that the Files dock and chat draft survive the second-instance and
open-URL chat switches. No main tabs or main plus appear. The
[packaged Files capture](../qa-evidence/codex-desktop/packaged-single-chat-files.png)
and [packaged search capture](../qa-evidence/codex-desktop/packaged-chat-search.png)
were inspected; their Light theme follows this isolated runtime's default and
does not substitute for the dark reference comparison. The test uses synthetic
Mock chat content and a private host. Log:
`/private/tmp/paseo-search-files-packaged-links.log`; result and captures:
`/private/tmp/paseo-search-files-packaged-links-qa`.

A subsequent refresh matched the production source committed as `968b8d9`, including
the settings geometry and the code-line-height repair found during screenshot
review. The source diff used for the build was compared with the final production
diff before committing. The full custom startup/CLI/terminal smoke passes in
`/private/tmp/paseo-tool-line-height-package-build.log`. The expanded agent-link
case passes in `/private/tmp/paseo-code-line-height-final.log`: it also opens real
Appearance controls, changes to Dark, saves code size 22, returns to the retained
draft, and checks 33px Shell line height plus fade removal at the final line.
The older `580aa19` package failed the added Appearance check; `8ed7135` failed the
added line-height check before the final rebuild. Result and inspected private
captures are under `/private/tmp/paseo-code-line-height-final-qa`. Root checks pass
in `/private/tmp/paseo-code-line-height-final-{format,lint,typecheck}.log`.

The previous bundle matched production source `f349168`. The startup/CLI/terminal
smoke and expanded agent-link flow pass after the settings-return repair. The flow
also checks the Copy submenu without writing the user's clipboard, changes and
restores the motion control, opens the actual project editor with its real source
directory, cancels it, and returns to chat A with its original draft. Project and
Appearance captures were inspected in the private artifact directory
`/private/tmp/paseo-settings-return-package-final-qa`. Logs:
`/private/tmp/paseo-settings-return-package-build.log`,
`/private/tmp/paseo-settings-return-package-final.log`,
`/private/tmp/paseo-settings-return-typecheck-verified.log`, and
`/private/tmp/paseo-settings-return-final-{format,lint}.log`. The first concurrent
typecheck raced the dependency build; the final check was run after build completion.

The latest Custom refresh was built from `bb54f11` after the Diff dock renderer
checks passed. Its real renderer/preload, custom identity/update guard, isolated
daemon startup, bundled CLI and terminal smoke pass. Log:
`/private/tmp/paseo-diff-dock-package-build.log`; artifacts:
`/private/tmp/paseo-diff-dock-package-qa`. This smoke establishes package startup;
the populated Diff interaction evidence is the isolated renderer case below.

The preceding Custom refresh matched production source `5b5083b`, including code
font weight, the centered address hint and reference reasoning accent, plus
Advanced appearance, compact size fields, 32px right-tool tabs and submenu
keyboard focus.
Startup, real renderer/preload, isolated daemon, CLI and terminal smoke pass in
`/private/tmp/paseo-code-weight-package-build.log`. The expanded packaged flow
checks ArrowRight/Left/Enter focus, both control heights, keyboard collapse/expand,
a focused unsaved code-size draft reset to 12, motion reset to System and the
selected Dark theme. It also opens a blank browser, checks placeholder alignment,
types a URL without navigating, closes the actual selected tab and retains the
chat draft; the model popover confirms the coral accent with its declared Low
selection unchanged. The initial close check assumed a browser-prefixed tab ID;
the corrected test reads the UI-created tab's actual identity. No product change
was needed for that test failure. It retains the prior single-chat/right-dock,
shell, project editor and deep-link checks. It additionally saves Medium code
weight and verifies actual Shell text at 500 with the saved 22px size and 33px
line height, then retains the original chat draft. The Shell capture was inspected.
Log: `/private/tmp/paseo-code-weight-package-final.log`; result and private captures:
`/private/tmp/paseo-code-weight-package-final-qa`. All 30 changed production files
match their build-input hashes. Build clean steps must run
sequentially with renderer tests as well as typechecks; an earlier parallel
renderer attempt encountered temporary missing protocol output.

Root format, lint and workspace typecheck pass, including the final feature commit
hooks. Logs: `/private/tmp/paseo-code-weight-final-{format,lint,typecheck}.log`,
`/private/tmp/paseo-code-weight-delivery-helper-lint.log` and
`/private/tmp/paseo-code-weight-feature-commit.log`.

The corrected ARM64 ad-hoc bundle passes that final declaration check, independent
bundle identity, disabled update IPC, real renderer/preload startup, isolated
daemon cold start, bundled CLI status, terminal/hook execution and cleanup.
The [packaged startup capture](../qa-evidence/codex-desktop/custom-package-protocol-startup.png)
was inspected; it shows only the isolated smoke workspace. The initial 28 focused
navigation/packaging checks passed; all 13 packaging checks passed again with the
stronger resolved-config and schema regression. Root lint, typecheck and formatting
pass; commit hooks run again before promotion.

A separate real-Electron regression against that Custom bundle now verifies cold
argv navigation to chat A, a real secondary process handing chat B to the same
window, and the `open-url` event returning to A with its unsent draft intact. It
checks the exact host/workspace and selected chat, one retained webContents ID,
secondary exit code 0, and no main tab strip or main plus button throughout. An
invalid URL must produce no preload navigation event; a following valid same-chat
event acts as the delivery barrier. The [restored-draft capture](../qa-evidence/codex-desktop/custom-agent-link-preserved-draft.png)
was inspected. This uses an isolated Mock host and temporary user data, not a
live provider. The event is injected into that test process, so it proves the
Electron event path rather than macOS URL dispatch. The existing browser harness
owns this selective mode; see [the runnable command](../testing.md#desktop-browser-regression).
Log: `/private/tmp/paseo-custom-agent-links.log`; private artifacts and result are
in `/private/tmp/paseo-custom-agent-links-qa`.

Installation, actual OS dispatch/handler coexistence, signed notarized
distribution, live-provider turns and remote pairing remain pending.
Neither protected 6767/6768 daemon was restarted. Logs:
`/private/tmp/paseo-custom-links-{unit,schemes-red,package-build}.log`,
`/private/tmp/paseo-terminal-links-custom-build.log` (the rejected mixed-scheme
package), and `/private/tmp/paseo-custom-links-final-{lint,typecheck}.log`.

## Resume checkpoint

Continue in this checkout on `codex/desktop-ui`; preserve the user's untracked
`context-images/` and unrelated plan edits. The Mac was unlocked for October 1
native attachment-menu, tab and rail checks. Reuse the live development instance
after checking its status; user activity may have changed it. The pinned
Playwright runtime supports isolated renderer tests.

After the subsequent interruption, the former daemon PIDs and listeners on
6767/6768/8082 were absent. No replacement was started. The empty Electron default
window opened by the state reader was closed, and validation continued in the
isolated renderer/package harnesses. Earlier private temporary logs may no longer
be present; committed captures and the scoped check results above remain the
durable record.

Keep the independent navigation rail and the default workspace sidebar per the
October 1 clarification. The custom chat-row sidebar remains deferred.
The rail stays visible when the workspace sidebar is collapsed. Native inspection
verified both states; the [renderer evidence](../qa-evidence/codex-desktop/restored-navigation-rail.png)
and desktop route/compact-layout regression pass.

Continue from the single-chat layout and shared right-tool titlebar above.
Recheck the live native instance after structural HMR changes: on October 1 it
retained the old main tab strip until a normal frontend reload. That reload kept
the current chat and refreshed the layout without restarting either daemon.

Inline tool output, completed-turn activity, the attachment menu and panel tabs
have local native evidence above. The usage overview passes its focused frontend
checks. Continue matching the supplied Codex images through frontend changes,
preserving Paseo backend behavior. The refreshed local custom package includes the latest upstream, terminal and
independent-link changes and passes the bundle/startup smoke above. Distribution,
OS dispatch and live-provider/remote acceptance remain separate outstanding work.

Latest composer evidence is recorded above; the earlier theme/settings tests pass (81).
The extended chat-action browser case passed in 56.2 seconds. Earlier navigation
model, agent attention (16), locale
parity and chat projection/metadata checks passed. The browser regression caught
both an initial-open history entry and a paused offline mutation; each was fixed
before a passing rerun. No live-provider or packaged acceptance is implied.

Relevant logs for the next continuation: `/private/tmp/paseo-history-host-e2e.log`,
`/private/tmp/paseo-history-host-tests.log`, `/private/tmp/paseo-history-host-typecheck.log`,
`/private/tmp/paseo-history-host-lint.log`, `/private/tmp/paseo-model-tooltip-e2e.log`,
`/private/tmp/paseo-messages-e2e.log`,
`/private/tmp/paseo-messages-typecheck.log`, `/private/tmp/paseo-messages-lint.log`,
`/private/tmp/paseo-new-chat-e2e.log`,
`/private/tmp/paseo-new-chat-typecheck.log`, `/private/tmp/paseo-new-chat-lint.log`,
`/private/tmp/paseo-new-chat-i18n.log`, `/private/tmp/paseo-slider-keys-e2e.log`,
`/private/tmp/paseo-slider-keys-typecheck.log`, `/private/tmp/paseo-slider-keys-lint.log`,
`/private/tmp/paseo-model-popover-i18n.log`, `/private/tmp/paseo-composer-settings-tests.log`,
`/private/tmp/paseo-chat-toolbar-recovery.log`, and
`/private/tmp/paseo-upstream-runtime-tests.log`. The development instance uses 8082
and 6768; reuse it if still running. The ignored `.dev/qa-chat-state.mts` queries
only the two locally created mock fixtures; A was archived and B now contains the
native smoke conversation. Its reasoning option was restored to Low.

The unrelated development-launch changes were removed outside this task. A launch
during that work exited with SIGTRAP; the restored, committed launcher now runs
successfully. Its current log is `/private/tmp/paseo-codex-dev-restored.log`.
Continue to inspect and preserve any concurrent work before staging.

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
browser side panel, usage/limits/resets, and general/appearance/agent/connection
settings. Use the matching file under `context-images/` before each slice; these files are private
reference material and are not part of the application bundle.

Retain the existing [usage overview](../../context-images/codex-settings-usage-overview.png),
[usage and resets](../../context-images/codex-settings-usage-resets.png), and
[account usage menu](../../context-images/codex-account-usage-menu.png) as active
visual references. Adapt their labels, limits, renewal schedules, and any manual
reset actions to each provider/plan; the screenshots do not establish shared
Codex reset semantics. These files already exist, so no duplicate capture is needed.

Expanded tool execution and keyboard settings are covered by the recording
captures below. Four original 2704×1564 PNGs supplied on October 1 were inspected
and copied byte-for-byte from the user's Desktop into the private reference directory:

| Reference                                                                                          | Observed state                                                                                                                                      |
| -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Populated diff, file tree open](../../context-images/codex-diff-populated-file-tree-open.png)     | Changes tab in the shared top bar; branch controls, addition/deletion totals, split code diff and right-hand file tree.                             |
| [Populated diff, file tree closed](../../context-images/codex-diff-populated-file-tree-closed.png) | Same view with the file tree hidden and the diff expanded into its width.                                                                           |
| [Permission pending](../../context-images/codex-computer-use-permission-pending.png)               | Computer Use application-access card at the composer position; persistent allow, deny/Escape and conversation allow/Return actions; waiting status. |
| [Permission denied](../../context-images/codex-computer-use-permission-denied.png)                 | Inline permission entry expands to show the request and denial; ordinary composer is restored.                                                      |

The diff pair also shows tracked-files and large-diff notices. These screenshots
establish their appearance, not thresholds or new backend requirements. Permission
cards are application-access requests, not shell-command escalation: reuse the
layout only with actions actually supported by the existing provider contract.
Automatic review behavior remains unchanged. Approval styling is lower priority
and does not block other migration work. Main chat remains untabbed; supporting
tool tabs belong to the right dock. No further screenshot is needed for these
observed states; implementation parity still requires its own validation.

### Diff dock and file filter — 2026-10-01

Mac working-diff tabs now reuse the existing combined presentation: comparison
totals above the branch row, 32px control capsules, a right-hand file tree and its
circular Folders toggle. The tree uses the existing SearchField and matches full
paths case-insensitively. Search keeps original file objects/indexes and leaves
saved folder-collapse state intact. Clearing restores that state. Tree visibility
now uses TreeRail's existing visibility prop, preserving the mounted diff canvas.
Independent Diff tabs omit tree-only Inline diffs preferences and commit history;
the Changes tree retains both. Non-Mac working-diff presentation is unchanged.

The Diff and single-chat renderer cases passed together (33.8s). A subsequent
menu regression reproduced the unwanted Inline diffs entry, then the corrected
Diff case passed (16.1s). Coverage includes actual split rendering, tree geometry,
canvas identity, filtering/empty/clear states, retained folder collapse, saved
visibility, draft preservation and absent main tabs. Sixteen diff-tree unit tests
and thirteen rail/state/preference tests pass. A read-only review found no remaining
actionable correctness issue. Logs: `/private/tmp/paseo-diff-reference-resume.log`,
`/private/tmp/paseo-diff-inline-red.log`, `/private/tmp/paseo-diff-reference-final.log`,
`/private/tmp/paseo-diff-filter-{red,green}.log` and `/private/tmp/paseo-diff-reference-unit.log`.

The [open-tree](../qa-evidence/codex-desktop/diff-tree-open.png) and
[closed-tree](../qa-evidence/codex-desktop/diff-tree-closed.png) renderer captures
were compared with the supplied reference pair. Source PNGs are 2704×1564 (@2x);
the synthetic renderer captures are 1352×782 (@1x), at the same CSS viewport.
This establishes the dock/tree layout and interaction slice, not full pixel parity:
the fixture has two small changes, while the reference is scrolled into a large
diff. Code weight/colors, diff hunk treatments and large-diff notices still need
state-matched refinement. The current branch control retains Paseo checkout
semantics; a comparison-base picker must not be fabricated from that control.
Refresh likewise retains its own operation instead of impersonating reference
search. The user's default workspace sidebar remains intentionally retained.

Earlier attempts stopped before startup with localhost `listen EPERM`, and a
granular policy rejected escalation. After the execution policy changed, escalation
was approved and the isolated renderer harness completed with its own temporary
ports and daemon state. The harness cleaned up; protected 6767/6768 daemons were
not restarted. This earlier blocker is resolved.

Implementation commit: `bb54f11`. Root format, lint, typecheck and commit hooks
pass; logs `/private/tmp/paseo-diff-dock-final-{format,lint,typecheck}.log` and
`/private/tmp/paseo-diff-dock-feature-commit.log`. The refreshed Custom bundle
passes startup/CLI/terminal smoke as recorded above. Full Diff visual parity and
provider-specific approval presentation remain open work.

### Recording references — 2026-09-30

Source: user-provided `录屏2026-09-30 12.55.37.mov` (205.383 seconds, 2704×1562).
Sampled 822 preview frames at four per second, visually reviewed the timeline,
stable candidates, and brief menu sequences, then selected 25 distinct relevant
states against the 44 existing PNG references. The exported PNGs preserve the
original frame dimensions; repeated frames,
transitions, previously covered settings, and the excluded product surfaces above
were omitted. This records the supplied video's useful states, not exhaustive
coverage of the official application.

Validation: all 25 PNGs decode at 2704×1562 and have distinct SHA-256 hashes;
none exactly duplicates an existing PNG. The selected states were visually
checked, all reference links resolve, and the 46 pre-existing files (including
the earlier recording) remained byte-for-byte unchanged.

The new reference files and source timestamps are listed below. All links are
private visual references, not application assets or feature requirements.

| Source time | Reference                                                                                               | Applicable surface                                         |
| ----------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 00:00.60    | [Sidebar collapsed](../../context-images/codex-sidebar-collapsed.png)                                   | Collapsed navigation rail                                  |
| 00:15.10    | [Chat hover card](../../context-images/codex-sidebar-chat-hover-card.png)                               | Chat metadata preview                                      |
| 00:16.85    | [Chat context menu](../../context-images/codex-sidebar-chat-context-menu.png)                           | Sidebar chat actions                                       |
| 00:23.60    | [Sort menu](../../context-images/codex-sidebar-sort-menu.png)                                           | Sidebar sort choices                                       |
| 00:26.35    | [Project actions](../../context-images/codex-project-actions-menu.png)                                  | Project menu                                               |
| 00:27.10    | [Project section submenu](../../context-images/codex-project-section-submenu.png)                       | Nested section selection                                   |
| 00:29.10    | [Edit project](../../context-images/codex-project-edit-dialog.png)                                      | Project name and folders                                   |
| 00:53.60    | [Browser tools menu](../../context-images/codex-browser-tools-menu.png)                                 | Panel tool chooser; use actual host tools                  |
| 00:57.10    | [File explorer panel](../../context-images/codex-file-explorer-side-panel.png)                          | File tree and empty editor                                 |
| 00:58.10    | [Terminal panel](../../context-images/codex-terminal-side-panel.png)                                    | Terminal tab and split layout                              |
| 00:59.85    | [Side chat panel](../../context-images/codex-side-chat-empty-panel.png)                                 | Split layout only; no temporary-session semantics implied  |
| 01:05.85    | [Model list](../../context-images/codex-chat-model-list-menu.png)                                       | Provider-backed model menu                                 |
| 01:13.35    | [Expanded tool activity](../../context-images/codex-tool-activity-expanded.png)                         | Grouped tool activity                                      |
| 01:23.85    | [Expanded shell output](../../context-images/codex-shell-tool-output-expanded.png)                      | Command and result disclosure                              |
| 01:59.35    | [Keyboard overview](../../context-images/codex-settings-keyboard-shortcuts-overview.png)                | Shortcut search and editing                                |
| 02:00.35    | [Navigation shortcuts](../../context-images/codex-settings-keyboard-shortcuts-navigation.png)           | Focus and tab shortcuts                                    |
| 02:03.35    | [Chat navigation shortcuts](../../context-images/codex-settings-keyboard-shortcuts-chat-navigation.png) | Chat shortcuts; exclude the dictation controls shown below |
| 02:12.60    | [Installed plugins](../../context-images/codex-settings-plugins-installed.png)                          | Existing plugin settings presentation                      |
| 02:53.35    | [Create section](../../context-images/codex-sidebar-create-section-dialog.png)                          | Section-name dialog                                        |
| 03:00.60    | [Section actions](../../context-images/codex-sidebar-section-actions-menu.png)                          | Section context menu                                       |
| 03:10.10    | [Project new chat](../../context-images/codex-new-chat-project-empty.png)                               | Project-scoped empty chat                                  |
| 03:11.10    | [Project picker](../../context-images/codex-new-chat-project-picker.png)                                | Searchable project selector                                |
| 03:13.85    | [Create project](../../context-images/codex-project-create-dialog.png)                                  | Project creation dialog                                    |
| 03:15.85    | [Projectless new chat](../../context-images/codex-new-chat-projectless.png)                             | Empty chat without a project                               |
| 03:16.35    | [Work location menu](../../context-images/codex-new-chat-work-location-menu.png)                        | Actual local/remote hosts; omit unsupported cloud choices  |
