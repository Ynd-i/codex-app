import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { Page } from "@playwright/test";
import { test, expect } from "../../app/e2e/support/fixtures";
import { gotoAppShell } from "../../app/e2e/support/helpers/app";
import { getE2EDaemonPort } from "../../app/e2e/support/helpers/daemon-port";
import { getServerId } from "../../app/e2e/support/helpers/server-id";
import { seedWorkspace } from "../../app/e2e/support/helpers/seed-client";
import { installDesktopRuntime } from "./support/runtime";

async function waitForTwoFrames(page: Page): Promise<void> {
  const nextFrame = () =>
    page.evaluate(() => new Promise<void>((frameDone) => requestAnimationFrame(frameDone)));
  await nextFrame();
  await nextFrame();
}

test("desktop navigation rail stays visible and marks the current destination", async ({
  page,
}) => {
  const workspace = await seedWorkspace({ repoPrefix: "desktop-sidebar-transition-" });
  try {
    await installDesktopRuntime(page, {
      serverId: getServerId(),
      manageBuiltInDaemon: false,
      daemonListen: `127.0.0.1:${getE2EDaemonPort()}`,
    });
    await page.setViewportSize({ width: 1352, height: 782 });
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "no-preference" });
    await gotoAppShell(page);

    const rail = page.getByTestId("desktop-shell-rail");
    const workspaceSidebar = page.getByTestId("desktop-workspace-sidebar");
    const projectList = page.getByTestId("sidebar-project-list");
    const home = page.getByTestId("desktop-shell-home");
    const history = page.getByTestId("desktop-shell-history");
    const homeIconPath = home.locator("svg path").first();
    const historyIconPath = history.locator("svg path").first();
    await expect(rail).toBeVisible();
    await expect(workspaceSidebar).toBeVisible();
    await expect(projectList).toBeVisible();
    await expect(home).toHaveAttribute("aria-current", "page");
    await expect(history).not.toHaveAttribute("aria-current");
    const selectedIconStroke = await homeIconPath.evaluate((path) => getComputedStyle(path).stroke);

    const sidebarToggle = page.getByTestId("menu-button");
    const expandedWidth = await workspaceSidebar.evaluate(
      (node) => node.getBoundingClientRect().width,
    );
    await sidebarToggle.focus();
    await expect(sidebarToggle).toBeFocused();
    await sidebarToggle.press("Enter");
    await expect(sidebarToggle).toHaveAttribute("aria-expanded", "false");
    await expect(sidebarToggle).toBeFocused();
    await waitForTwoFrames(page);
    const closingWidth = await workspaceSidebar.evaluate(
      (node) => node.getBoundingClientRect().width,
    );
    expect(closingWidth).toBeGreaterThan(0);
    expect(closingWidth).toBeLessThan(expandedWidth);
    await expect(projectList).toBeVisible();

    await sidebarToggle.press("Enter");
    await expect(sidebarToggle).toHaveAttribute("aria-expanded", "true");
    await expect(sidebarToggle).toBeFocused();
    await expect
      .poll(async () => workspaceSidebar.evaluate((node) => node.getBoundingClientRect().width))
      .toBeGreaterThan(expandedWidth * 0.95);

    await sidebarToggle.press("Enter");
    await expect(sidebarToggle).toHaveAttribute("aria-expanded", "false");
    await expect(sidebarToggle).toBeFocused();
    await expect(workspaceSidebar).toBeHidden();
    await expect(projectList).toBeHidden();
    await expect(rail).toBeVisible();

    await history.click();
    await expect(page).toHaveURL(/\/sessions(?:[/?]|$)/);
    await expect(rail).toBeVisible();
    await expect(home).not.toHaveAttribute("aria-current");
    await expect(history).toHaveAttribute("aria-current", "page");
    expect(await home.evaluate((node) => getComputedStyle(node).backgroundColor)).not.toBe(
      await history.evaluate((node) => getComputedStyle(node).backgroundColor),
    );
    expect(await historyIconPath.evaluate((path) => getComputedStyle(path).stroke)).toBe(
      selectedIconStroke,
    );
    expect(await homeIconPath.evaluate((path) => getComputedStyle(path).stroke)).not.toBe(
      selectedIconStroke,
    );

    const screenshotPath = resolve(
      process.cwd(),
      "../../docs/qa-evidence/codex-desktop/sidebar-navigation-selection.png",
    );
    await mkdir(dirname(screenshotPath), { recursive: true });
    await page.mouse.move(900, 400);
    await page.screenshot({ path: screenshotPath });
  } finally {
    await workspace.cleanup();
  }
});

test("desktop workspace sidebar skips its transition for reduced motion", async ({ page }) => {
  await installDesktopRuntime(page, {
    serverId: getServerId(),
    manageBuiltInDaemon: false,
    daemonListen: `127.0.0.1:${getE2EDaemonPort()}`,
  });
  await page.setViewportSize({ width: 1352, height: 782 });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await gotoAppShell(page);

  const sidebar = page.getByTestId("desktop-workspace-sidebar");
  const toggle = page.getByTestId("menu-button");
  const width = () => sidebar.evaluate((node) => node.getBoundingClientRect().width);
  await expect(sidebar).toBeVisible();
  const expandedWidth = await width();

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await waitForTwoFrames(page);
  const closedWidth = await width();
  expect(closedWidth).toBe(0);
  await expect(sidebar).toBeHidden();

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await waitForTwoFrames(page);
  const reopenedWidth = await width();
  expect(reopenedWidth).toBe(expandedWidth);
});
