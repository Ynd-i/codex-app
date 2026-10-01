import { test, expect } from "../../app/e2e/support/fixtures";
import { TerminalE2EHarness } from "../../app/e2e/support/helpers/terminal-dsl";
import { buildTerminalWorkspaceUrl } from "../../app/e2e/support/helpers/terminal-perf";
import { getServerId } from "../../app/e2e/support/helpers/server-id";
import { getE2EDaemonPort } from "../../app/e2e/support/helpers/daemon-port";
import { installDesktopRuntime } from "./support/runtime";

test("desktop panel tabs keep active controls visible and retain terminals across resizing", async ({
  page,
}, testInfo) => {
  const harness = await TerminalE2EHarness.create({ tempPrefix: "desktop-panels-" });
  try {
    await installDesktopRuntime(page, {
      serverId: getServerId(),
      manageBuiltInDaemon: false,
      confirmShouldAccept: true,
      daemonListen: `127.0.0.1:${getE2EDaemonPort()}`,
    });
    await page.setViewportSize({ width: 1352, height: 782 });
    await page.emulateMedia({ colorScheme: "dark" });
    const first = await harness.createTerminal({ name: "Panel verification shell" });
    const second = await harness.createTerminal({ name: "Second shell" });
    await page.goto(buildTerminalWorkspaceUrl(harness.workspaceId, first.id));
    const firstTab = page.getByTestId(`explorer-sidebar-tab-terminal_${first.id}`);
    const secondTab = page.getByTestId(`explorer-sidebar-tab-terminal_${second.id}`);
    const closeFirst = page.getByTestId(`explorer-sidebar-tab-close-terminal_${first.id}`);
    await expect(firstTab).toHaveAttribute("aria-selected", "true");
    await page.mouse.move(600, 600);
    await expect(closeFirst.locator("..")).toHaveCSS("opacity", "1");
    await expect(firstTab).toHaveCSS("border-radius", "8px");
    await secondTab.click();
    await expect(secondTab).toHaveAttribute("aria-selected", "true");
    await firstTab.click();
    await expect(harness.terminalSurface(page).filter({ visible: true })).toHaveCount(1);
    await expect(page.getByTestId("terminal-attach-loading")).toBeHidden();
    await page.getByTestId("explorer-sidebar-tab-files").click();
    await expect(page.getByTestId("files-pane-header")).toBeVisible();
    const explorerRail = page.getByTestId("explorer-sidebar-tab-rail");
    const filesTab = explorerRail.getByRole("button", {
      name: "Browse workspace files",
      exact: true,
    });
    const closeFiles = page.getByTestId("explorer-sidebar-tab-close-files");
    await page.mouse.move(600, 600);
    await expect(closeFiles.locator("..")).toHaveCSS("opacity", "1");
    await filesTab.focus();
    await page.keyboard.press("Tab");
    await expect(closeFiles).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(filesTab).toHaveCount(0);
    await expect(secondTab).toBeVisible();
    const liveTerminals = await harness.client.listTerminals(harness.tempRepo.path, undefined, {
      workspaceId: harness.workspaceId,
    });
    expect(liveTerminals.terminals.map((terminal) => terminal.id)).toEqual(
      expect.arrayContaining([first.id, second.id]),
    );
    await explorerRail.click({
      button: "right",
      position: { x: 20, y: 2 },
    });
    await page
      .getByTestId("explorer-sidebar-tab-configuration")
      .getByRole("menuitem", { name: "Files", exact: true })
      .click();
    await expect(page.getByTestId("files-pane-header")).toBeVisible();
    await expect(page.getByTestId("file-explorer-tree-scroll")).toBeVisible();
    await expect(filesTab).toHaveAttribute("aria-selected", "true");
    const changesTab = page.getByTestId("explorer-sidebar-tab-changes_tree");
    const closeChanges = page.getByTestId("explorer-sidebar-tab-close-changes_tree");
    await page.mouse.move(600, 600);
    await expect(closeChanges.locator("..")).toHaveCSS("opacity", "0");
    await changesTab.focus();
    await page.keyboard.press("Tab");
    await expect(closeChanges).toBeFocused();
    await expect(closeChanges.locator("..")).toHaveCSS("opacity", "1");
    await expect(filesTab).toHaveAttribute("aria-selected", "true");
    await firstTab.focus();
    await expect(closeChanges.locator("..")).toHaveCSS("opacity", "0");
    const changesBox = await changesTab.boundingBox();
    await changesTab.hover();
    await expect(closeChanges.locator("..")).toHaveCSS("opacity", "1");
    expect(await changesTab.boundingBox()).toEqual(changesBox);
    await closeChanges.hover();
    await expect(closeChanges.locator("..")).toHaveCSS("opacity", "1");
    expect(await changesTab.boundingBox()).toEqual(changesBox);
    await closeChanges.click();
    await expect(changesTab).toHaveCount(0);
    await expect(filesTab).toHaveAttribute("aria-selected", "true");
    await expect(secondTab).toBeVisible();
    await page.mouse.move(800, 400);
    await page.screenshot({ path: testInfo.outputPath("supporting-panels-wide.png") });
    await firstTab.click({ position: { x: 12, y: 13 } });
    await page.setViewportSize({ width: 900, height: 680 });
    await expect(firstTab).toBeInViewport();
    await expect(firstTab).toHaveAttribute("aria-selected", "true");
    await page.setViewportSize({ width: 1352, height: 782 });
    await page.getByTestId("workspace-explorer-toggle").click();
    await expect(page.getByTestId("workspace-explorer-sidebar")).toBeHidden();
    await page.getByTestId("workspace-explorer-toggle").click();
    await secondTab.click();
    await expect(secondTab).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("terminal-attach-loading")).toBeHidden();
    const closeSecond = page.getByTestId(`explorer-sidebar-tab-close-terminal_${second.id}`);
    await closeSecond.focus();
    await expect(closeSecond).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(secondTab).toHaveCount(0);
    await expect(firstTab).toHaveAttribute("aria-selected", "true");
    await expect(harness.terminalSurface(page).filter({ visible: true })).toHaveCount(1);
  } catch (error) {
    await page
      .screenshot({ path: testInfo.outputPath("supporting-panels-failure.png"), timeout: 5000 })
      .catch(() => {});
    throw error;
  } finally {
    await harness.cleanup();
  }
});
