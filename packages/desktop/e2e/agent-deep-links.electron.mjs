import path from "node:path";
import { expect } from "playwright/test";

/** Runs against the harness's packaged Custom process; no OS protocol registration is involved. */
export async function runAgentDeepLinksRegression({
  page,
  serverId,
  workspaceId,
  agentA,
  agentB,
  userData,
  artifactDir,
  evaluateMain,
  launchSecondInstance,
}) {
  const appState = () =>
    evaluateMain(`(() => {
    const { app, BrowserWindow } = process.mainModule.require('electron');
    return { name: app.getName(), packaged: app.isPackaged, userData: app.getPath('userData'), windows: BrowserWindow.getAllWindows().map(win => win.webContents.id) };
  })()`);
  const initial = await appState();
  expect(initial.name).toBe("Paseo Custom");
  expect(initial.packaged).toBe(true);
  expect(initial.userData).toBe(userData);
  expect(initial.windows).toHaveLength(1);

  const title = page.getByTestId("desktop-chat-title");
  const composer = page
    .getByRole("textbox", { name: "Message agent...", exact: true })
    .filter({ visible: true });
  const expectChat = async (letter) => {
    await expect
      .poll(() => new URL(page.url()).pathname)
      .toBe(`/h/${serverId}/workspace/${workspaceId}`);
    await expect(title).toHaveText(`Deep link chat ${letter}`, { timeout: 60_000 });
    await expect(composer).toBeEditable();
    await expect(page.getByTestId("workspace-tabs-row").filter({ visible: true })).toHaveCount(0);
    await expect(
      page.getByTestId("workspace-new-tab-button").filter({ visible: true }),
    ).toHaveCount(0);
  };
  await expectChat("A");
  await page.screenshot({ path: path.join(artifactDir, "agent-link-cold-argv.png") });
  const draft = "Keep chat A's unsent draft while opening chat B.";
  await composer.fill(draft);
  await page.getByTestId("desktop-chat-toolbar-menu").click();
  const copyMenu = page.getByRole("menuitem", { name: "Copy", exact: true });
  await copyMenu.click();
  const copyId = page.getByRole("menuitem", { name: "Copy agent id", exact: true });
  await expect(copyId).toBeVisible();
  await expect(
    page.getByRole("menuitem", { name: "Copy resume command", exact: true }),
  ).toBeDisabled();
  // Inspect availability only; this packaged check never writes the user's clipboard.
  await page.keyboard.press("Escape");
  await expect(copyId).toBeHidden();
  if (await copyMenu.isVisible()) await page.keyboard.press("Escape");
  await expect(copyMenu).toBeHidden();
  await page.keyboard.press("Meta+k");
  const search = page.getByTestId("command-center-panel");
  await expect(search.getByTestId("command-center-input")).toHaveAttribute(
    "placeholder",
    "Search chats",
  );
  await expect(search.getByText("Deep link chat A", { exact: true })).toBeVisible();
  await expect(search.getByText("Deep link chat B", { exact: true })).toBeVisible();
  await page.screenshot({ path: path.join(artifactDir, "packaged-chat-search.png") });
  await page.keyboard.press("Escape");
  await expect(search).toHaveCount(0);
  await expect(composer).toHaveValue(draft);

  await page.getByTestId("workspace-explorer-toggle").click();
  await page.getByTestId("explorer-sidebar-tab-files").click();
  const files = page.getByTestId("workspace-explorer-sidebar");
  await expect(files.getByTestId("file-tool-toolbar").filter({ visible: true })).toBeVisible();
  await expect(files.getByTestId("files-empty-editor").filter({ visible: true })).toBeVisible();
  await expect(files.getByTestId("files-filter").filter({ visible: true })).toBeEditable();
  await expectChat("A");
  await expect(composer).toHaveValue(draft);
  await page.screenshot({ path: path.join(artifactDir, "packaged-single-chat-files.png") });
  await page.evaluate(async () => {
    window.__agentLinkEvents = [];
    window.__stopAgentLinkEvents = await window.paseoDesktop.events.on("open-agent", (target) => {
      window.__agentLinkEvents.push({ serverId: target.serverId, agentId: target.agentId });
    });
  });

  const link = (agentId) =>
    `paseo-custom://h/${encodeURIComponent(serverId)}/agent/${encodeURIComponent(agentId)}`;
  const targetA = { serverId, agentId: agentA };
  const targetB = { serverId, agentId: agentB };
  const events = () => page.evaluate(() => window.__agentLinkEvents);
  const second = launchSecondInstance(link(agentB));
  await expect.poll(() => second.exitCode, { timeout: 30_000 }).toBe(0);
  await expect.poll(events).toEqual([targetB]);
  await expectChat("B");
  await expect(composer).toHaveValue("");
  expect((await appState()).windows).toEqual(initial.windows);
  await page.screenshot({ path: path.join(artifactDir, "agent-link-second-instance.png") });

  const openUrl = (url) =>
    `process.mainModule.require('electron').app.emit('open-url', { preventDefault() {} }, ${JSON.stringify(url)});`;
  await evaluateMain(openUrl(link(agentA)));
  await expect.poll(events).toEqual([targetB, targetA]);
  await expectChat("A");
  await expect(composer).toHaveValue(draft);
  await expect(files.getByTestId("files-empty-editor").filter({ visible: true })).toBeVisible();

  // A valid same-chat event is a delivery barrier: an invalid B event must never reach preload.
  await evaluateMain(openUrl(`${link(agentB)}?message=not-allowed`) + openUrl(link(agentA)));
  await expect.poll(events).toEqual([targetB, targetA, targetA]);
  await expectChat("A");
  await expect(composer).toHaveValue(draft);
  expect((await appState()).windows).toEqual(initial.windows);
  await page.screenshot({ path: path.join(artifactDir, "agent-link-preserved-draft.png") });

  await page.keyboard.press("Meta+,");
  await page
    .getByTestId("settings-sidebar")
    .getByRole("button", { name: "Appearance", exact: true })
    .click();
  const modes = page.getByTestId("appearance-theme-modes");
  await expect(modes).toBeVisible();
  await modes.getByRole("button", { name: "Dark", exact: true }).click();
  await expect(modes.getByRole("button", { name: "Dark", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByLabel("Theme: Dark", { exact: true })).toBeVisible();
  const advanced = page.getByTestId("appearance-advanced-toggle");
  await expect(advanced).toHaveAttribute("aria-expanded", "true");
  await advanced.focus();
  await advanced.press("Enter");
  await expect(page.getByTestId("appearance-advanced-content")).toBeHidden();
  await expect(
    page.getByRole("textbox", { name: "Interface font family", exact: true }),
  ).toBeVisible();
  await advanced.press("Space");
  await expect(advanced).toHaveAttribute("aria-expanded", "true");
  const motion = page.getByTestId("appearance-reduced-motion");
  await motion.getByRole("button", { name: "On", exact: true }).click();
  await expect(motion.getByRole("button", { name: "On", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  const codeSize = page.getByRole("textbox", { name: "Code font size", exact: true });
  await codeSize.fill("21");
  await page.getByTestId("appearance-advanced-reset").click();
  await expect(codeSize).toHaveValue("12");
  await expect(motion.getByRole("button", { name: "System", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByLabel("Theme: Dark", { exact: true })).toBeVisible();
  await page.screenshot({ path: path.join(artifactDir, "packaged-appearance-modes.png") });
  // Exercise overflow through a real saved appearance preference, without rewriting the timeline.
  await codeSize.fill("22");
  await codeSize.press("Tab");
  await page.getByTestId("settings-back-to-workspace").filter({ visible: true }).click();
  await expectChat("A");
  await expect(composer).toHaveValue(draft);
  await page.getByTestId("workspace-explorer-toggle").click();
  await expect(page.getByTestId("assistant-message").last()).toContainText(
    "(end of synthetic stream)",
    { timeout: 30_000 },
  );
  await page.getByTestId("desktop-turn-activity").first().click();
  const shell = page
    .getByTestId("tool-call-badge")
    .filter({ hasText: "node scripts/simulate-stream-burst.mjs" })
    .first();
  await shell.scrollIntoViewIfNeeded();
  await shell.getByRole("button").first().click();
  const prompt = shell
    .getByTestId("shell-output-horizontal-scroll")
    .getByText("$", { exact: true });
  await expect(prompt).toHaveCSS("font-size", "22px");
  await expect(prompt).toHaveCSS("line-height", "33px");
  const card = shell.getByTestId("tool-call-detail-surface");
  await expect(card).toHaveCSS("mask-image", /linear-gradient.*25px/);
  await page.screenshot({ path: path.join(artifactDir, "packaged-shell-overflow.png") });
  await shell.getByTestId("shell-output-scroll").evaluate((node) => {
    node.scrollTop = node.scrollHeight;
    node.dispatchEvent(new Event("scroll"));
  });
  await expect(card).toHaveCSS("mask-image", "none");
  await expect(shell).toContainText("[burst] drag-end isDragging=false");
  await expect(composer).toHaveValue(draft);
  await page.screenshot({ path: path.join(artifactDir, "packaged-shell-final-line.png") });
  await page.keyboard.press("Meta+,");
  await page.getByTestId("settings-host-section-projects").click();
  await page.getByRole("button", { name: "Edit Desktop browser project 1", exact: true }).click();
  await page.getByTestId("project-edit-button").click();
  const projectModal = page.getByTestId("project-edit-sheet");
  await expect(projectModal.getByRole("dialog")).toHaveCSS("border-radius", "20px");
  await expect(projectModal.getByTestId("project-edit-source-folder")).toContainText("workspace-1");
  await expect(projectModal.getByTestId("project-edit-name")).toBeEditable();
  await expect(projectModal.getByTestId("project-edit-save")).toBeDisabled();
  await page.screenshot({ path: path.join(artifactDir, "packaged-project-edit.png") });
  await projectModal.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(projectModal).toBeHidden();
  await page.getByTestId("settings-back-to-workspace").filter({ visible: true }).click();
  await expectChat("A");
  await expect(composer).toHaveValue(draft);
  await page.evaluate(() => window.__stopAgentLinkEvents());
  return {
    serverId,
    workspaceId,
    agentA,
    agentB,
    coldArgv: true,
    secondInstanceExitCode: second.exitCode,
    retainedWebContentsId: initial.windows[0],
    openUrlEvent: true,
    draftPreserved: true,
    packagedChatSearch: true,
    packagedFilesDock: true,
    packagedAppearanceModes: true,
    packagedAppearanceAdvancedReset: true,
    packagedShellOverflow: true,
    packagedMotionControl: true,
    packagedCopyMenu: true,
    packagedProjectEditor: true,
    invalidUrlRejected: true,
    osProtocolDispatch: "not tested",
  };
}
