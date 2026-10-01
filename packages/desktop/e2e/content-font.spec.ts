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
import { installUsageReportsFixture } from "../../app/e2e/support/helpers/usage-reports";

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

test("macOS composer hides its focus hint while retaining shortcut and narrow draft layout", async ({
  page,
}, testInfo) => {
  const fixture = await seedMockAgentWorkspace({
    repoPrefix: "composer-focus-hint-",
    title: "Composer focus verification",
  });
  try {
    await installDesktopRuntime(page, {
      serverId: getServerId(),
      manageBuiltInDaemon: false,
      daemonListen: `127.0.0.1:${getE2EDaemonPort()}`,
    });
    await installUsageReportsFixture(page, { lists: [[]] });
    await page.setViewportSize({ width: 1352, height: 781 });
    await page.emulateMedia({ colorScheme: "dark" });
    await openAgentRoute(page, fixture);
    const input = composerLocator(page);
    const composer = page.getByTestId("message-input-root").filter({ visible: true });
    const attach = composer.getByTestId("message-input-attach-button");
    await expect(input).toHaveValue("");
    await input.focus();
    await expect(input).toBeFocused();
    await attach.focus();
    await expect(input).not.toBeFocused();
    await expect(composer.getByText(/to focus$/)).toHaveCount(0);

    await page.getByTestId("workspace-explorer-toggle").click();
    await expect(page.getByTestId("workspace-explorer-sidebar")).toBeVisible();
    await page.getByTestId("explorer-sidebar-tab-files").click();
    await expect(
      page.getByTestId("file-explorer-tree-scroll").filter({ visible: true }),
    ).toBeVisible();
    await page.setViewportSize({ width: 900, height: 781 });
    await input.focus();
    await attach.focus();
    await expect(input).toHaveValue("");
    await expect(composer.getByText(/to focus$/)).toHaveCount(0);
    const composerBox = await composer.boundingBox();
    const inputBox = await input.boundingBox();
    if (!composerBox || !inputBox) throw new Error("Missing narrow composer geometry");
    expect(inputBox.x).toBeGreaterThanOrEqual(composerBox.x);
    expect(inputBox.y).toBeGreaterThanOrEqual(composerBox.y);
    expect(inputBox.x + inputBox.width).toBeLessThanOrEqual(composerBox.x + composerBox.width);
    expect(inputBox.y + inputBox.height).toBeLessThanOrEqual(composerBox.y + composerBox.height);
    await page.mouse.move(500, 300);
    await page.screenshot({ path: testInfo.outputPath("composer-empty-narrow.png") });
    await page.keyboard.press("Meta+l");
    await expect(input).toBeFocused();
    const draft = "Keep this draft while resizing the composer.";
    await input.fill(draft);
    const send = composer.getByRole("button", { name: "Send message", exact: true });
    await expect(send).toBeVisible();
    const draftBox = await composer.boundingBox();
    const sendBox = await send.boundingBox();
    if (!draftBox || !sendBox) throw new Error("Missing narrow send control geometry");
    expect(sendBox.x).toBeGreaterThanOrEqual(draftBox.x);
    expect(sendBox.y).toBeGreaterThanOrEqual(draftBox.y);
    expect(sendBox.x + sendBox.width).toBeLessThanOrEqual(draftBox.x + draftBox.width);
    expect(sendBox.y + sendBox.height).toBeLessThanOrEqual(draftBox.y + draftBox.height);
    await page.setViewportSize({ width: 1352, height: 781 });
    await expect(input).toHaveValue(draft);
    await expect(composer.getByText(/to focus$/)).toHaveCount(0);
  } finally {
    await fixture.cleanup();
  }
});
