import { test, expect } from "../../app/e2e/support/fixtures";
import { seedMockAgentWorkspace, openAgentRoute } from "../../app/e2e/support/helpers/mock-agent";
import { getServerId } from "../../app/e2e/support/helpers/server-id";
import { getE2EDaemonPort } from "../../app/e2e/support/helpers/daemon-port";
import { expectFileTabOpen } from "../../app/e2e/support/helpers/file-explorer";
import { installDesktopRuntime } from "./support/runtime";

test("desktop tool rows expand independently of file navigation", async ({ page }, testInfo) => {
  const readPath = "packages/app/src/components/conversation-list.tsx";
  const fixture = await seedMockAgentWorkspace({
    repoPrefix: "desktop-tool-output-",
    title: "Tool output check",
    model: "ten-second-stream",
    initialPrompt: "Show the synthetic tool activity.",
    repo: { files: [{ path: readPath, content: "export const toolPreview = true;\n" }] },
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
    await expect(page.getByTestId("assistant-message").last()).toContainText(
      "(end of synthetic stream)",
      { timeout: 30_000 },
    );
    await page.getByTestId("desktop-turn-activity").first().click();
    const read = page.getByTestId("tool-call-badge").filter({ hasText: readPath }).first();
    await read.scrollIntoViewIfNeeded();
    await read.hover();
    await expect(read.getByTestId("tool-call-open-file")).toBeVisible();
    await expect(read.locator("button button")).toHaveCount(0);
    const toggle = read.getByRole("button").first();
    await toggle.press("Enter");
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(read).toContainText("const ref = useRef");
    await toggle.press("Enter");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(read).not.toContainText("const ref = useRef");
    await page.mouse.move(10, 10);
    await toggle.focus();
    await page.keyboard.press("Tab");
    const openFile = read.getByTestId("tool-call-open-file");
    await expect(openFile).toBeFocused();
    await expect(openFile).toHaveCSS("opacity", "1");
    await openFile.press("Enter");
    await expectFileTabOpen(page, readPath);
    await page.getByTestId(`workspace-tab-agent_${fixture.agentId}`).click();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    const shell = page
      .getByTestId("tool-call-badge")
      .filter({ hasText: "node scripts/simulate-stream-burst.mjs" })
      .first();
    await shell.scrollIntoViewIfNeeded();
    await shell.getByRole("button").first().click();
    await expect(shell.getByTestId("tool-call-detail-title")).toHaveText("Shell");
    await expect(shell).toContainText("$ node scripts/simulate-stream-burst.mjs");
    await expect(shell).toContainText("[burst] drag-end isDragging=false");
    await page.mouse.move(10, 10);
    await page.screenshot({ path: testInfo.outputPath("desktop-shell-output.png") });
  } catch (error) {
    await page.screenshot({ path: testInfo.outputPath("tool-interaction-failure.png") });
    throw error;
  } finally {
    await fixture.cleanup();
  }
});
