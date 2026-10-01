import { test, expect } from "../../app/e2e/support/fixtures";
import { gotoAppShell, openSettings } from "../../app/e2e/support/helpers/app";
import { openSettingsSection } from "../../app/e2e/support/helpers/settings";
import { getServerId } from "../../app/e2e/support/helpers/server-id";
import { getE2EDaemonPort } from "../../app/e2e/support/helpers/daemon-port";
import { installDesktopRuntime } from "./support/runtime";

test("macOS Settings keeps navigation searchable and Appearance preferences editable", async ({
  page,
}, testInfo) => {
  await installDesktopRuntime(page, {
    serverId: getServerId(),
    manageBuiltInDaemon: false,
    daemonListen: `127.0.0.1:${getE2EDaemonPort()}`,
  });
  await page.setViewportSize({ width: 1352, height: 782 });
  await page.emulateMedia({ colorScheme: "dark" });
  await gotoAppShell(page);
  await openSettings(page);

  const sidebar = page.getByTestId("settings-sidebar");
  const search = page.getByTestId("settings-sidebar-search");
  await expect(sidebar).toBeVisible();
  expect(await sidebar.evaluate((node) => node.getBoundingClientRect().width)).toBe(280);
  await expect(sidebar.getByText("Settings", { exact: true })).toBeVisible();
  await expect(search).toBeVisible();
  await search.fill("Appearance");
  await expect(sidebar.getByRole("button", { name: "Appearance", exact: true })).toBeVisible();
  await expect(sidebar.getByRole("button", { name: "General", exact: true })).toHaveCount(0);
  await search.fill("");

  await openSettingsSection(page, "general");
  await expect(page.getByTestId("page-title")).toHaveText("General");
  await page.screenshot({ path: testInfo.outputPath("settings-general.png") });

  await openSettingsSection(page, "appearance");
  await expect(page.getByTestId("page-title")).toHaveText("Appearance");
  await expect(page.getByText("Theme", { exact: true }).first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("settings-appearance.png") });
  await page.setViewportSize({ width: 900, height: 680 });
  await expect(sidebar).toBeInViewport();
  await page.setViewportSize({ width: 700, height: 680 });
  await expect(sidebar).toBeHidden();
  await page.setViewportSize({ width: 1352, height: 782 });
  await expect(sidebar).toBeVisible();
});
