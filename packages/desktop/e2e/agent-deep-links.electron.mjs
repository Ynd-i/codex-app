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
    invalidUrlRejected: true,
    osProtocolDispatch: "not tested",
  };
}
