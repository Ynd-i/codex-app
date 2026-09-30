import { test, expect } from "../../app/e2e/support/fixtures";
import { seedWorkspace } from "../../app/e2e/support/helpers/seed-client";
import { gotoWorkspace } from "../../app/e2e/support/helpers/launcher";
import { getServerId } from "../../app/e2e/support/helpers/server-id";
import { getE2EDaemonPort } from "../../app/e2e/support/helpers/daemon-port";
import { installDesktopRuntime } from "./support/runtime";

test("macOS browser toolbar retains its address and tools when resized", async ({
  page,
}, testInfo) => {
  const workspace = await seedWorkspace({ repoPrefix: "browser-toolbar-" });
  try {
    await installDesktopRuntime(page, {
      serverId: getServerId(),
      manageBuiltInDaemon: false,
      daemonListen: `127.0.0.1:${getE2EDaemonPort()}`,
    });
    await page.setViewportSize({ width: 1352, height: 782 });
    await page.emulateMedia({ colorScheme: "dark" });
    await gotoWorkspace(page, workspace.workspaceId);
    await page.getByTestId("workspace-new-tab-button").filter({ visible: true }).first().click();
    // This renderer check exercises toolbar layout, not a real Electron webview.
    await page.evaluate(() => {
      if (!window.paseoDesktop) throw new Error("Desktop fixture is missing");
      window.paseoDesktop.browser = {
        profilePartition: "persist:browser-toolbar-test",
        registerAttachedBrowser: async () => {},
      };
    });
    await page.getByTestId("workspace-new-tab-menu-browser").click();

    const address = page.getByRole("textbox", { name: "Browser URL", exact: true });
    const addressFrame = address.locator("..");
    await expect(address).toBeVisible();
    await expect(addressFrame).toHaveCSS("height", "32px");
    await expect(addressFrame).toHaveCSS("border-radius", "16px");
    await address.fill("https://example.test/retained-draft");
    await address.press("Enter");
    await expect(address).toHaveValue("https://example.test/retained-draft");
    await page.mouse.move(500, 400);
    await page.screenshot({ path: testInfo.outputPath("browser-toolbar-wide.png") });

    for (const width of [900, 700, 1352]) {
      await page.setViewportSize({ width, height: 782 });
      await expect(address).toBeInViewport();
      await expect(address).toHaveValue("https://example.test/retained-draft");
      for (const label of [
        "Device size",
        "Open browser dev tools",
        "Annotate element",
        "Screenshot element",
      ]) {
        await expect(page.getByRole("button", { name: label, exact: true })).toBeInViewport();
      }
    }
    await page.keyboard.press("Meta+l");
    await expect(address).toBeFocused();
  } finally {
    await workspace.cleanup();
  }
});
