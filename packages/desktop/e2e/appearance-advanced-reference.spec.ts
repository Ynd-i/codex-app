import { test, expect } from "../../app/e2e/support/fixtures";
import { gotoAppShell, openSettings } from "../../app/e2e/support/helpers/app";
import { openSettingsSection } from "../../app/e2e/support/helpers/settings";
import { getServerId } from "../../app/e2e/support/helpers/server-id";
import { getE2EDaemonPort } from "../../app/e2e/support/helpers/daemon-port";
import { installUsageReportsFixture } from "../../app/e2e/support/helpers/usage-reports";
import { installDesktopRuntime } from "./support/runtime";

test("macOS Advanced resets only its fields and refreshes dirty controls", async ({
  page,
}, testInfo) => {
  await installDesktopRuntime(page, {
    serverId: getServerId(),
    manageBuiltInDaemon: false,
    daemonListen: `127.0.0.1:${getE2EDaemonPort()}`,
  });
  await installUsageReportsFixture(page, { lists: [[]] });
  await page.addInitScript(() => {
    const key = "@paseo:app-settings";
    if (!localStorage.getItem(key))
      localStorage.setItem(
        key,
        JSON.stringify({
          contentFontSize: 15,
          theme: "claude",
          pluginThemeId: "preserve-plugin-choice",
          uiFontFamily: "Georgia",
          sendBehavior: "queue",
          language: "en",
        }),
      );
    Reflect.set(window, "__advancedWrites", []);
    const save = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === key) {
        if (Reflect.get(window, "__failAdvancedSave")) {
          Reflect.set(window, "__failAdvancedSave", false);
          throw new Error("Synthetic settings write failure");
        }
        Reflect.get(window, "__advancedWrites").push(JSON.parse(value));
      }
      return save.call(this, name, value);
    };
  });
  await page.setViewportSize({ width: 1352, height: 782 });
  await page.emulateMedia({ colorScheme: "dark" });
  await gotoAppShell(page);
  await openSettings(page);
  await openSettingsSection(page, "appearance");
  const advanced = page.getByTestId("appearance-advanced-toggle");
  await expect(advanced).toBeVisible();
  await expect(advanced).toHaveAttribute("aria-expanded", "true");
  await advanced.focus();
  await advanced.press("Enter");
  await expect(advanced).toHaveAttribute("aria-expanded", "false");
  await expect(
    page.getByRole("textbox", { name: "Interface font family", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("appearance-advanced-content")).toBeHidden();
  await advanced.press("Space");
  await expect(advanced).toHaveAttribute("aria-expanded", "true");
  const reset = page.getByTestId("appearance-advanced-reset");
  const fields = {
    uiBaseFontSize: page.getByRole("textbox", { name: "Interface font size", exact: true }),
    contentFontSize: page.getByRole("textbox", { name: "Content font size", exact: true }),
    codeFontSize: page.getByRole("textbox", { name: "Code font size", exact: true }),
    contentFontFamily: page.getByRole("textbox", { name: "Content font family", exact: true }),
    monoFontFamily: page.getByRole("textbox", { name: "Code font family", exact: true }),
    contentMaxWidth: page.getByRole("textbox", { name: "Content width in pixels", exact: true }),
  };
  const keys = [...Object.keys(fields), "syntaxTheme", "reducedMotion"];
  const readSettings = () =>
    page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("@paseo:app-settings") ?? "{}") as Record<string, unknown>,
    );
  const defaultFields = Object.fromEntries(
    await Promise.all(
      Object.entries(fields).map(async ([key, field]) => [key, await field.inputValue()]),
    ),
  );
  const defaults: Record<string, unknown> = {
    uiBaseFontSize: Number(defaultFields.uiBaseFontSize),
    contentFontSize: Number(defaultFields.contentFontSize),
    codeFontSize: Number(defaultFields.codeFontSize),
    contentFontFamily: defaultFields.contentFontFamily,
    monoFontFamily: defaultFields.monoFontFamily,
    contentMaxWidth: null,
    syntaxTheme: "codex",
    reducedMotion: "system",
  };
  const preview = page.getByRole("img", {
    name: "Live preview of content typography, syntax theme, and code font",
    exact: true,
  });
  const readPreview = () =>
    preview.evaluate((node) => {
      const content = node.children[0];
      const code = node.children[1]?.firstElementChild;
      if (!content || !code) throw new Error("Missing live appearance preview");
      return {
        contentSize: getComputedStyle(content).fontSize,
        codeSize: getComputedStyle(code).fontSize,
        codeFamily: getComputedStyle(code).fontFamily,
      };
    });
  const defaultPreview = await readPreview();
  for (const [key, value] of Object.entries({
    uiBaseFontSize: "18",
    contentFontSize: "19",
    codeFontSize: "16",
    contentFontFamily: "Times New Roman",
    monoFontFamily: "Courier New",
    contentMaxWidth: "1000",
  })) {
    const field = fields[key as keyof typeof fields];
    const previousInput = await field.elementHandle();
    if (!previousInput) throw new Error(`Missing ${key} input`);
    await field.fill(value);
    await field.press("Tab");
    await expect.poll(async () => String((await readSettings())[key])).toBe(value);
    // These tokens re-key the existing AppearanceStyleBoundary after storage updates.
    // Wait for the actual applied UI before typing into its successor input.
    if (["uiBaseFontSize", "contentFontSize", "codeFontSize", "monoFontFamily"].includes(key)) {
      await expect.poll(() => previousInput.evaluate((node) => node.isConnected)).toBe(false);
      await expect(field).toHaveValue(value);
    }
    await previousInput.dispose();
  }
  const beforeSyntax = await fields.codeFontSize.elementHandle();
  if (!beforeSyntax) throw new Error("Missing code-size input before syntax change");
  await page.getByLabel(/^Highlight theme:/).click();
  await page.getByRole("menuitem", { name: "One", exact: true }).click();
  await expect.poll(() => beforeSyntax.evaluate((node) => node.isConnected)).toBe(false);
  await beforeSyntax.dispose();
  await page
    .getByTestId("appearance-reduced-motion")
    .getByRole("button", { name: "On", exact: true })
    .click();
  await expect.poll(readSettings).toMatchObject({ syntaxTheme: "one", reducedMotion: "on" });
  await fields.codeFontSize.fill("21");
  await expect(fields.codeFontSize).toBeFocused();
  await expect.poll(readPreview).toMatchObject({ codeSize: "21px" });
  await page.evaluate(() => Reflect.set(window, "__advancedWrites", []));
  await reset.click();
  await expect(reset).toBeEnabled();
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, "__advancedWrites").length))
    .toBe(1);
  const assertDefaults = async () => {
    const saved = await readSettings();
    expect(Object.fromEntries(keys.map((key) => [key, saved[key]]))).toEqual(
      Object.fromEntries(keys.map((key) => [key, defaults[key]])),
    );
    expect(saved).toMatchObject({
      theme: "claude",
      pluginThemeId: "preserve-plugin-choice",
      uiFontFamily: "Georgia",
      sendBehavior: "queue",
      language: "en",
    });
    for (const [key, field] of Object.entries(fields))
      await expect(field).toHaveValue(defaultFields[key]);
    await expect.poll(readPreview).toEqual(defaultPreview);
  };
  await assertDefaults();
  // Each uncontrolled row shape must refresh even when its saved value is already the default.
  for (const [field, draft] of [
    [fields.monoFontFamily, "Courier New"],
    [fields.contentMaxWidth, "1200"],
    [fields.codeFontSize, "20"],
  ] as const) {
    await field.fill(draft);
    await expect(field).toBeFocused();
    await reset.click();
    await expect(reset).toBeEnabled();
    await assertDefaults();
  }
  await fields.codeFontSize.fill("21");
  await page.evaluate(() => Reflect.set(window, "__failAdvancedSave", true));
  await reset.click();
  await expect(page.getByText("Unable to save", { exact: true })).toBeVisible();
  await expect(reset).toBeEnabled();
  await reset.click();
  await expect(reset).toBeEnabled();
  await assertDefaults();
  await page.reload();
  await expect(page).toHaveURL(/\/open-project$/);
  await openSettings(page);
  await openSettingsSection(page, "appearance");
  await assertDefaults();
  await expect(
    page.getByRole("textbox", { name: "Interface font family", exact: true }),
  ).toHaveValue("Georgia");
  await expect(page.getByLabel("Theme: Claude", { exact: true })).toBeVisible();
  // Capture the default dark visual style only after proving the preserved preferences.
  const uiFamily = page.getByRole("textbox", { name: "Interface font family", exact: true });
  const beforeFamily = await uiFamily.elementHandle();
  if (!beforeFamily) throw new Error("Missing interface family input");
  await uiFamily.fill("");
  await uiFamily.press("Tab");
  await expect.poll(async () => (await readSettings()).uiFontFamily).toBe("");
  await expect.poll(() => beforeFamily.evaluate((node) => node.isConnected)).toBe(false);
  await beforeFamily.dispose();
  const beforeTheme = await uiFamily.elementHandle();
  if (!beforeTheme) throw new Error("Missing input before theme change");
  await page
    .getByTestId("appearance-theme-modes")
    .getByRole("button", { name: "Dark", exact: true })
    .click();
  await expect.poll(() => beforeTheme.evaluate((node) => node.isConnected)).toBe(false);
  await beforeTheme.dispose();
  await expect(page.getByLabel("Theme: Dark", { exact: true })).toBeVisible();
  await expect(
    page.getByTestId("settings-sidebar").getByText("localhost", { exact: true }),
  ).toBeVisible();
  await page.getByTestId("page-title").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath("appearance-advanced.png"),
    animations: "disabled",
  });
  await page.setViewportSize({ width: 700, height: 782 });
  await expect(async () => {
    await advanced.scrollIntoViewIfNeeded();
    await expect(advanced).toBeInViewport({ ratio: 1 });
    await expect(reset).toBeInViewport({ ratio: 1 });
  }).toPass({ timeout: 10_000 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
    .toBe(0);
});
