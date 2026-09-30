import { test, expect } from "../../app/e2e/support/fixtures";
import { seedMockAgentWorkspace, openAgentRoute } from "../../app/e2e/support/helpers/mock-agent";
import { composerLocator, submitMessage } from "../../app/e2e/support/helpers/composer";
import { openSettings } from "../../app/e2e/support/helpers/app";
import {
  openSettingsSection,
  clickSettingsBackToWorkspace,
} from "../../app/e2e/support/helpers/settings";
import { getServerId } from "../../app/e2e/support/helpers/server-id";
import { getE2EDaemonPort } from "../../app/e2e/support/helpers/daemon-port";
import { installDesktopRuntime } from "./support/runtime";

test("content font changes conversation text and returns to the interface font when cleared", async ({
  page,
}, testInfo) => {
  const fixture = await seedMockAgentWorkspace({
    repoPrefix: "content-font-",
    title: "Content font verification",
    model: "ten-second-stream",
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
    const prompt = "Show a short synthetic response for typography verification.";
    await submitMessage(page, prompt);
    const assistant = page.getByTestId("assistant-message").last();
    await expect(assistant).toContainText("(end of synthetic stream)", { timeout: 30_000 });
    const userText = page.getByTestId("user-message").getByText(prompt, { exact: true });
    const title = page.getByTestId("desktop-chat-title");
    const uiFont = await title.evaluate((node) => getComputedStyle(node).fontFamily);

    await openSettings(page);
    await openSettingsSection(page, "appearance");
    const contentFont = page.getByRole("textbox", { name: "Content font family", exact: true });
    await contentFont.fill("Georgia");
    await contentFont.press("Tab");
    await clickSettingsBackToWorkspace(page);
    await expect(userText).toHaveCSS("font-family", "Georgia");
    await expect(assistant.getByText("(end of synthetic stream)", { exact: true })).toHaveCSS(
      "font-family",
      "Georgia",
    );
    await expect(composerLocator(page)).toHaveCSS("font-family", "Georgia");
    await expect(title).toHaveCSS("font-family", uiFont);
    await page.screenshot({ path: testInfo.outputPath("transcript-content-font.png") });

    await openSettings(page);
    await openSettingsSection(page, "appearance");
    await contentFont.fill("");
    await contentFont.press("Tab");
    await clickSettingsBackToWorkspace(page);
    await expect(userText).toHaveCSS("font-family", uiFont);
    await expect(composerLocator(page)).toHaveCSS("font-family", uiFont);
  } finally {
    await fixture.cleanup();
  }
});
