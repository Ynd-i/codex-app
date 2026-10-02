import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { Page } from "@playwright/test";
import { test, expect } from "../../app/e2e/support/fixtures";
import { gotoAppShell } from "../../app/e2e/support/helpers/app";
import { getE2EDaemonPort } from "../../app/e2e/support/helpers/daemon-port";
import { getServerId } from "../../app/e2e/support/helpers/server-id";
import { seedWorkspace } from "../../app/e2e/support/helpers/seed-client";
import { installUsageReportsFixture } from "../../app/e2e/support/helpers/usage-reports";
import { openAgentRoute, seedMockAgentWorkspace } from "../../app/e2e/support/helpers/mock-agent";
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
    // The rail carries the sidebar footer actions, so the footer drops its icon line.
    for (const testID of ["sidebar-add-project", "sidebar-usage-icon", "sidebar-hosts-trigger"])
      await expect(rail.getByTestId(testID)).toBeVisible();
    await expect(page.locator('[data-testid="sidebar-footer-bottom-line"]:visible')).toHaveCount(0);
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

test("macOS rail usage opens its summary beside the rail", async ({ page }, testInfo) => {
  const now = Date.now();
  await installDesktopRuntime(page, {
    serverId: getServerId(),
    manageBuiltInDaemon: false,
    daemonListen: `127.0.0.1:${getE2EDaemonPort()}`,
  });
  await installUsageReportsFixture(page, {
    lists: [
      [
        {
          id: "monthly:quota",
          sourceId: "monthly",
          sourceLabel: "Monthly plan",
          account: {},
          fetchedAt: new Date(now).toISOString(),
          report: {
            status: "available",
            windows: [
              {
                id: "month",
                label: "1 month",
                usedPct: 99,
                resetsAt: new Date(now + 29 * 86_400_000).toISOString(),
              },
            ],
          },
        },
      ],
    ],
  });
  await page.setViewportSize({ width: 1352, height: 782 });
  await page.emulateMedia({ colorScheme: "dark" });
  await gotoAppShell(page);
  const rail = page.getByTestId("desktop-shell-rail");
  await rail.getByTestId("sidebar-usage-icon").click();
  // Like the reference account menu, usage opens in place instead of leaving the chat.
  const summary = page.getByTestId("sidebar-usage-sheet");
  await expect(summary.getByTestId("usage-report-monthly:quota")).toBeVisible();
  await expect(page).not.toHaveURL(/\/usage(?:[/?]|$)/);
  const railBox = (await rail.boundingBox())!;
  expect((await summary.boundingBox())!.x).toBeGreaterThanOrEqual(railBox.x + railBox.width);
  await page.screenshot({ path: testInfo.outputPath("rail-usage-popover.png") });
  await page.keyboard.press("Escape");
  await expect(summary).toHaveCount(0);
});

test("macOS chat sections sort, reorder, collapse and add projects from their headers", async ({
  page,
}) => {
  const fixture = await seedMockAgentWorkspace({
    repoPrefix: "chat-sections-",
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
    // Recent lists each chat before the project groups do, so the first row is Recent's.
    const firstRow = page.getByTestId(`desktop-chat-${serverId}:${fixture.agentId}`).first();
    const secondRow = page.getByTestId(`desktop-chat-${serverId}:${second.id}`).first();
    const top = async (row: typeof firstRow) => (await row.boundingBox())!.y;
    await expect.poll(async () => (await top(secondRow)) < (await top(firstRow))).toBe(true);

    const recent = page.getByTestId("desktop-section-recent");
    await recent.hover();
    await recent.getByTestId("desktop-section-recent-menu").click();
    await page.getByTestId("desktop-section-recent-sort-manual").click();
    await expect(page.getByTestId("desktop-section-recent-sort-manual")).toHaveCount(0);
    // Drag the newer chat below the older one; manual order keeps it there.
    const from = (await secondRow.boundingBox())!;
    const to = (await firstRow.boundingBox())!;
    await page.mouse.move(from.x + 40, from.y + from.height / 2);
    await page.mouse.down();
    for (let step = 1; step <= 8; step += 1)
      await page.mouse.move(from.x + 40, from.y + from.height / 2 + (step * (to.height + 6)) / 4);
    await page.mouse.up();
    await expect.poll(async () => (await top(firstRow)) < (await top(secondRow))).toBe(true);
    await page.reload();
    await expect(secondRow).toBeVisible();
    await expect.poll(async () => (await top(firstRow)) < (await top(secondRow))).toBe(true);

    // Collapsing Recent leaves only the project group's row for each chat.
    const secondRows = page.getByTestId(`desktop-chat-${serverId}:${second.id}`);
    await page.getByTestId("desktop-section-recent-toggle").click();
    await expect(secondRows).toHaveCount(1);
    await page.getByTestId("desktop-section-recent-toggle").click();
    await expect(secondRows).toHaveCount(2);

    const projects = page.getByTestId("desktop-section-projects");
    await projects.hover();
    await projects.getByTestId("desktop-section-projects-add").click();
    await expect(page.getByTestId("add-project-flow")).toBeVisible();
  } finally {
    await fixture.cleanup();
  }
});
