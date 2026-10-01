import { test, expect } from "../../app/e2e/support/fixtures";
import { seedMockAgentWorkspace, openAgentRoute } from "../../app/e2e/support/helpers/mock-agent";
import { getServerId } from "../../app/e2e/support/helpers/server-id";
import { getE2EDaemonPort } from "../../app/e2e/support/helpers/daemon-port";
import { installUsageReportsFixture } from "../../app/e2e/support/helpers/usage-reports";
import { installDesktopRuntime } from "./support/runtime";

test("macOS chat Copy menu uses the current agent and disables unavailable resume commands", async ({
  page,
}, testInfo) => {
  const fixture = await seedMockAgentWorkspace({
    repoPrefix: "chat-menu-copy-",
    title: "Copy first chat",
  });
  try {
    const sibling = await fixture.client.createAgent({
      provider: "mock",
      cwd: fixture.cwd,
      workspaceId: fixture.workspaceId,
      title: "Copy second chat",
      model: "e2e-fast-stream",
      modeId: "load-test",
    });
    await installDesktopRuntime(page, {
      serverId: getServerId(),
      manageBuiltInDaemon: false,
      daemonListen: `127.0.0.1:${getE2EDaemonPort()}`,
    });
    await installUsageReportsFixture(page, { lists: [[]] });
    await page.addInitScript(() => {
      const copied: string[] = [];
      Object.defineProperty(window, "__chatMenuCopied", { value: copied });
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (text: string) => {
            copied.push(text);
          },
        },
      });
    });
    await page.setViewportSize({ width: 1352, height: 781 });
    await page.emulateMedia({ colorScheme: "dark" });
    await openAgentRoute(page, fixture);
    await page.getByTestId("desktop-chat-toolbar-menu").click();
    await page.screenshot({ path: testInfo.outputPath("chat-copy-menu-baseline.png") });
    const copy = page.getByRole("menuitem", { name: "Copy", exact: true });
    await expect(copy).toBeVisible();
    await expect(page.locator('[data-menu-surface="true"]').filter({ has: copy })).toHaveCSS(
      "opacity",
      "1",
    );
    await page.screenshot({ path: testInfo.outputPath("chat-copy-menu.png") });
    await copy.click();
    await expect(
      page.getByRole("menuitem", { name: "Copy resume command", exact: true }),
    ).toBeDisabled();
    await expect(
      page.locator('[data-menu-surface="true"]').filter({
        has: page.getByRole("menuitem", { name: "Copy agent id", exact: true }),
      }),
    ).toHaveCSS("opacity", "1");
    const parentBox = await page
      .locator('[data-menu-surface="true"]')
      .filter({ has: copy })
      .boundingBox();
    const childBox = await page
      .locator('[data-menu-surface="true"]')
      .filter({
        has: page.getByRole("menuitem", { name: "Copy agent id", exact: true }),
      })
      .boundingBox();
    expect(childBox).not.toBeNull();
    expect(parentBox).not.toBeNull();
    expect(childBox!.x + childBox!.width).toBeLessThanOrEqual(parentBox!.x + 8);
    await page.screenshot({ path: testInfo.outputPath("chat-copy-submenu.png") });
    await page.getByRole("menuitem", { name: "Copy agent id", exact: true }).click();
    await expect
      .poll(() =>
        page.evaluate(() => (window as unknown as { __chatMenuCopied: string[] }).__chatMenuCopied),
      )
      .toEqual([fixture.agentId]);
    await page.keyboard.press("Meta+K");
    const panel = page.getByTestId("command-center-panel");
    await expect(panel).toBeVisible();
    await panel.getByTestId("command-center-input").fill("Copy second chat");
    await panel.getByTestId(`command-center-agent-${getServerId()}:${sibling.id}`).click();
    await expect(page.getByTestId("desktop-chat-title")).toHaveText("Copy second chat");
    await page.getByTestId("desktop-chat-toolbar-menu").click();
    await copy.click();
    await expect(
      page.getByRole("menuitem", { name: "Copy resume command", exact: true }),
    ).toBeDisabled();
    await page.getByRole("menuitem", { name: "Copy agent id", exact: true }).click();
    await expect
      .poll(() =>
        page.evaluate(() => (window as unknown as { __chatMenuCopied: string[] }).__chatMenuCopied),
      )
      .toEqual([fixture.agentId, sibling.id]);
  } finally {
    await fixture.cleanup();
  }
});
