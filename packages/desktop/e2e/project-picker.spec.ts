import { test, expect } from "../../app/e2e/support/fixtures";
import { gotoAppShell } from "../../app/e2e/support/helpers/app";
import {
  expectNewWorkspaceForAddedProject,
  openAddProjectFlow,
} from "../../app/e2e/support/helpers/add-project-flow";
import { getE2EDaemonPort } from "../../app/e2e/support/helpers/daemon-port";
import { waitForConnectedHost } from "../../app/e2e/support/helpers/hosts";
import { expectOpenedProject } from "../../app/e2e/support/helpers/project-picker-ui";
import { getServerId } from "../../app/e2e/support/helpers/server-id";
import { connectSeedClient } from "../../app/e2e/support/helpers/seed-client";
import { installDesktopRuntime, waitForDirectoryDialog } from "./support/runtime";
import { seedMockAgentWorkspace, openAgentRoute } from "../../app/e2e/support/helpers/mock-agent";
import { composerLocator, dropFileOnComposer } from "../../app/e2e/support/helpers/composer";
import { expectAgentIdle } from "../../app/e2e/support/helpers/agent-stream";

test("desktop composer keeps send and stop reachable with attachments", async ({
  page,
}, testInfo) => {
  const fixture = await seedMockAgentWorkspace({
    repoPrefix: "desktop-composer-",
    title: "Composer layout check",
    model: "five-minute-stream",
  });
  try {
    await installDesktopRuntime(page, {
      serverId: getServerId(),
      manageBuiltInDaemon: false,
      daemonListen: `127.0.0.1:${getE2EDaemonPort()}`,
    });
    await page.setViewportSize({ width: 1352, height: 782 });
    await page.emulateMedia({ colorScheme: "dark" });
    await openAgentRoute(page, fixture);
    await expect(page.getByTestId("desktop-chat-title")).toHaveText("Composer layout check");
    await composerLocator(page).fill("Check the attached layout fixture.");
    await dropFileOnComposer(page, {
      name: "layout-fixture.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"layout":"desktop"}'),
    });
    const attachment = page.getByTestId("composer-file-attachment-pill");
    await expect(attachment).toContainText("layout-fixture.json");
    await page.screenshot({ path: testInfo.outputPath("composer-wide.png") });

    await page.setViewportSize({ width: 900, height: 680 });
    await composerLocator(page).fill("Check the attached layout fixture.\n".repeat(40));
    const send = page.getByRole("button", { name: "Send message", exact: true });
    await expect(send).toBeInViewport();
    await expect(attachment).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath("composer-narrow.png") });
    console.info("Composer visual evidence", {
      wide: testInfo.outputPath("composer-wide.png"),
      narrow: testInfo.outputPath("composer-narrow.png"),
    });
    await send.click();
    const stop = page.getByRole("button", { name: "Stop agent", exact: true });
    await expect(stop).toBeInViewport();
    await expect(attachment).toHaveCount(0);
    await stop.click();
    await expectAgentIdle(page);
  } finally {
    await fixture.cleanup();
  }
});

test("desktop chat navigation preserves sibling drafts and scopes pinning", async ({
  page,
}, testInfo) => {
  // Allow the real host liveness check to detect a dropped browser connection.
  test.setTimeout(120_000);
  const fixture = await seedMockAgentWorkspace({
    repoPrefix: "desktop-chat-navigation-",
    title: "First chat",
  });
  try {
    const second = await fixture.client.createAgent({
      provider: "mock",
      cwd: fixture.cwd,
      workspaceId: fixture.workspaceId,
      title: "Second chat",
      model: "e2e-fast-stream",
      modeId: "load-test",
    });
    const serverId = getServerId();
    await installDesktopRuntime(page, {
      serverId,
      manageBuiltInDaemon: false,
      daemonListen: `127.0.0.1:${getE2EDaemonPort()}`,
    });
    await page.setViewportSize({ width: 1352, height: 782 });
    await page.emulateMedia({ colorScheme: "dark" });
    await openAgentRoute(page, fixture);
    const title = page.getByTestId("desktop-chat-title");
    const firstRow = page.getByTestId(`desktop-chat-${serverId}:${fixture.agentId}`).first();
    const secondRow = page.getByTestId(`desktop-chat-${serverId}:${second.id}`).first();
    await expect(title).toHaveText("First chat");
    await expect(page.getByTestId("desktop-shell-back")).toBeDisabled();
    await composerLocator(page).fill("Draft stays with first chat");
    await secondRow.click();
    await expect(title).toHaveText("Second chat");
    await expect(composerLocator(page)).toHaveValue("");
    await page.getByTestId("desktop-shell-back").click();
    await expect(title).toHaveText("First chat");
    await expect(composerLocator(page)).toHaveValue("Draft stays with first chat");
    await page.getByTestId("desktop-shell-forward").click();
    await expect(title).toHaveText("Second chat");
    const toolbarMenu = page.getByTestId("desktop-chat-toolbar-menu");
    await expect(toolbarMenu).toBeVisible({ timeout: 5_000 });
    await toolbarMenu.click();
    await page.getByText("Rename", { exact: true }).click();
    const renameId = `desktop-chat-rename-${serverId}:${second.id}`;
    await page.getByTestId(`${renameId}-input`).fill("Renamed second chat");
    await page.context().setOffline(true);
    const attachButton = page.getByTestId("message-input-attach-button").filter({ visible: true });
    await expect(attachButton).toBeDisabled({ timeout: 75_000 });
    await page.getByTestId(`${renameId}-submit`).click();
    await expect(page.getByTestId(`${renameId}-error`)).toHaveText("Daemon client unavailable");
    await expect(page.getByTestId(`${renameId}-input`)).toHaveValue("Renamed second chat");
    await expect(page.getByTestId(`${renameId}-submit`)).toBeEnabled();
    expect((await fixture.client.fetchAgent({ agentId: second.id }))?.agent.title).toBe(
      "Second chat",
    );
    await page.context().setOffline(false);
    await expect(attachButton).toBeEnabled({ timeout: 30_000 });
    await expect(title).toHaveText("Second chat");
    await page.getByTestId(`${renameId}-submit`).click();
    await expect(title).toHaveText("Renamed second chat", { timeout: 20_000 });
    await expect(page.getByTestId(`${renameId}-input`)).toHaveCount(0, { timeout: 15_000 });
    expect((await fixture.client.fetchAgent({ agentId: fixture.agentId }))?.agent.title).toBe(
      "First chat",
    );
    await secondRow.hover();
    await page.getByTestId(`desktop-chat-menu-${serverId}:${second.id}`).first().click();
    await page.getByText("Pin to top", { exact: true }).click();
    await expect
      .poll(
        async () =>
          (await fixture.client.fetchAgent({ agentId: second.id }))?.agent.labels[
            "codex-ui.pinned-at"
          ] ?? "",
      )
      .toMatch(/^\d{4}-\d\d-\d\dT/);
    expect((await fixture.client.fetchAgent({ agentId: fixture.agentId }))?.agent.labels).toEqual(
      {},
    );
    await page.keyboard.press("Meta+Shift+P");
    await expect
      .poll(
        async () =>
          (await fixture.client.fetchAgent({ agentId: second.id }))?.agent.labels[
            "codex-ui.pinned-at"
          ],
      )
      .toBe("");
    await firstRow.click();
    await expect(title).toHaveText("First chat");
    await expect(composerLocator(page)).toHaveValue("Draft stays with first chat");
    await secondRow.click();
    await toolbarMenu.click();
    await page.getByText("Archive", { exact: true }).click();
    await expect(secondRow).toHaveCount(0);
    await firstRow.click();
    await expect(title).toHaveText("First chat");
    await expect(composerLocator(page)).toHaveValue("Draft stays with first chat");
    expect((await fixture.client.fetchAgent({ agentId: fixture.agentId }))?.agent.archivedAt).toBe(
      null,
    );
  } catch (error) {
    await page
      .screenshot({ path: testInfo.outputPath("before-cleanup.png") })
      .catch(() => undefined);
    throw error;
  } finally {
    await page.context().setOffline(false);
    await fixture.cleanup();
  }
});

test("Browse opens the folder selected by the desktop dialog", async ({
  page,
  projectPickerFixture,
}) => {
  await installDesktopRuntime(page, {
    serverId: getServerId(),
    manageBuiltInDaemon: false,
    dialogOpenResult: projectPickerFixture.projectPath,
  });
  await gotoAppShell(page);
  await waitForConnectedHost(page, {
    serverId: getServerId(),
    endpoint: `localhost:${getE2EDaemonPort()}`,
  });

  await openAddProjectFlow(page);
  const browse = page.getByRole("button", { name: /^Browse/ });
  await expect(browse).toBeVisible({ timeout: 30_000 });
  await browse.click();
  const dialogOptions = await waitForDirectoryDialog(page);
  expect(dialogOptions).toEqual({
    createDirectory: true,
    directory: true,
    multiple: false,
  });

  const projectId = await expectOpenedProject(page);
  projectPickerFixture.rememberProjectId(projectId);
  await expectNewWorkspaceForAddedProject(page, {
    serverId: getServerId(),
    projectId,
    projectName: projectPickerFixture.projectName,
    projectPath: projectPickerFixture.projectPath,
  });
  const client = await connectSeedClient();
  try {
    expect((await client.fetchWorkspaces({ filter: { projectId } })).entries).toEqual([]);
  } finally {
    await client.close();
  }
});

test("canceling Browse returns to the Add Project methods", async ({
  page,
  projectPickerFixture,
}) => {
  await installDesktopRuntime(page, {
    serverId: getServerId(),
    manageBuiltInDaemon: false,
    dialogOpenResult: null,
  });
  await gotoAppShell(page);
  await waitForConnectedHost(page, {
    serverId: getServerId(),
    endpoint: `localhost:${getE2EDaemonPort()}`,
  });

  await openAddProjectFlow(page);
  const browse = page.getByRole("button", { name: /^Browse/ });
  await expect(browse).toBeVisible({ timeout: 30_000 });
  await browse.click();

  const dialogOptions = await waitForDirectoryDialog(page);
  expect(dialogOptions).toEqual({
    createDirectory: true,
    directory: true,
    multiple: false,
  });
  await expect(browse).toBeVisible();
  await expect(
    page
      .locator('[data-testid^="sidebar-project-row-"]')
      .filter({ hasText: projectPickerFixture.projectName }),
  ).toHaveCount(0);
});
