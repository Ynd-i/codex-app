import { readFile } from "node:fs/promises";
import { test, expect } from "../../app/e2e/support/fixtures";
import { seedMockAgentWorkspace, openAgentRoute } from "../../app/e2e/support/helpers/mock-agent";
import { getServerId } from "../../app/e2e/support/helpers/server-id";
import { daemonWsRoutePattern, getE2EDaemonPort } from "../../app/e2e/support/helpers/daemon-port";
import { installDesktopRuntime } from "./support/runtime";

test("macOS file tree filters unopened nested files and preserves file actions", async ({
  page,
}, testInfo) => {
  const fixture = await seedMockAgentWorkspace({
    repoPrefix: "file-tree-reference-",
    title: "File tree reference",
    repo: {
      files: [
        { path: "example.ts", content: "export const answer = 42;\n" },
        { path: "src/deep/needle.ts", content: "export const needle = true;\n" },
        { path: "src/deep/other.ts", content: "export const other = true;\n" },
      ],
    },
  });
  try {
    await installDesktopRuntime(page, {
      serverId: getServerId(),
      manageBuiltInDaemon: false,
      daemonListen: `127.0.0.1:${getE2EDaemonPort()}`,
    });
    await page.setViewportSize({ width: 1352, height: 782 });
    await page.emulateMedia({ colorScheme: "dark" });
    // Only one failed search response is injected; successful searches and file operations use the real daemon.
    let failNextSearch = false;
    await page.routeWebSocket(daemonWsRoutePattern(), (ws) => {
      const server = ws.connectToServer();
      server.onMessage((message) => ws.send(message));
      ws.onMessage((message) => {
        let envelope;
        try {
          envelope = JSON.parse(message.toString());
        } catch {
          server.send(message);
          return;
        }
        const request = envelope.type === "session" ? envelope.message : envelope;
        if (failNextSearch && request.type === "directory_suggestions_request") {
          failNextSearch = false;
          ws.send(
            JSON.stringify({
              type: "session",
              message: {
                type: "directory_suggestions_response",
                payload: {
                  requestId: request.requestId,
                  entries: [],
                  directories: [],
                  error: "Search temporarily unavailable",
                },
              },
            }),
          );
          return;
        }
        server.send(message);
      });
    });
    await openAgentRoute(page, fixture);
    await page.getByTestId("workspace-explorer-toggle").click();
    await page.getByRole("button", { name: "Browse workspace files", exact: true }).click();
    const right = page.getByTestId("workspace-explorer-sidebar");
    const filter = right.getByTestId("files-filter").filter({ visible: true });
    await expect(filter).toBeVisible();
    await filter.fill("needle");
    const tree = right.getByTestId("file-explorer-tree-scroll").filter({ visible: true });
    await expect(tree.getByText("needle.ts", { exact: true })).toBeVisible();
    await expect(tree.getByText("src", { exact: true })).toBeVisible();
    await expect(tree.getByText("deep", { exact: true })).toBeVisible();
    await expect(tree.getByText("other.ts", { exact: true })).toHaveCount(0);
    const result = tree.getByTestId("file-explorer-row-2");
    await result.focus();
    await page.keyboard.press("Enter");
    await expect(right.locator(".cm-content").filter({ visible: true })).toContainText(
      "export const needle = true;",
    );
    const fileTree = right.getByTestId("file-tree-rail-tree").filter({ visible: true });
    await fileTree.getByTestId("files-filter").fill("zzzz-no-match");
    await expect(fileTree.getByTestId("files-filter-empty")).toBeVisible();
    await fileTree.getByTestId("files-filter-clear").click();
    await expect(fileTree.getByTestId("files-filter")).toHaveValue("");
    await expect(fileTree.getByText("example.ts", { exact: true })).toBeVisible();
    failNextSearch = true;
    await fileTree.getByTestId("files-filter").fill("needle.ts");
    await expect(fileTree.getByTestId("files-filter-error")).toHaveText(
      "Search temporarily unavailable",
    );
    await expect(
      fileTree.getByRole("textbox", { name: "Filter files...", exact: true }),
    ).toBeVisible();
    await fileTree.getByText("Retry", { exact: true }).click();
    await expect(fileTree.getByText("needle.ts", { exact: true })).toBeVisible();
    await expect(fileTree.getByTestId("files-filter-error")).toHaveCount(0);
    await fileTree.getByTestId("files-root-menu").click();
    await expect(page.getByTestId("files-new-file")).toBeVisible();
    await expect(page.getByTestId("files-new-folder")).toBeVisible();
    await expect(page.getByTestId("files-hidden-toggle")).toBeVisible();
    await expect(page.getByTestId("files-refresh")).toBeVisible();
    await page.getByTestId("files-new-file").click();
    await expect(fileTree.getByTestId("files-filter")).toHaveValue("");
    await expect(fileTree.getByTestId("files-filter-clear")).toHaveCount(0);
    await expect(fileTree.getByText("example.ts", { exact: true })).toBeVisible();
    const draft = fileTree.getByTestId("file-explorer-name-input");
    await draft.fill("created.ts");
    await draft.press("Enter");
    await expect(fileTree.getByText("created.ts", { exact: true })).toBeVisible();
    expect(await readFile(`${fixture.cwd}/created.ts`, "utf8")).toBe("");
    await expect(fileTree.getByTestId("files-filter")).toHaveValue("");
    await expect(fileTree.getByTestId("files-filter-clear")).toHaveCount(0);
    await fileTree.getByTestId("files-filter").fill("example");
    await fileTree.getByText("example.ts", { exact: true }).click({ button: "right" });
    await page.getByRole("menuitem", { name: "Rename", exact: true }).click();
    await fileTree.getByTestId("file-explorer-name-input").fill("renamed.ts");
    await fileTree.getByTestId("file-explorer-name-input").press("Enter");
    await expect(fileTree.getByText("renamed.ts", { exact: true })).toBeVisible();
    await expect(fileTree.getByTestId("files-filter")).toHaveValue("");
    await expect(fileTree.getByTestId("files-filter-clear")).toHaveCount(0);
    await expect(fileTree.getByText("created.ts", { exact: true })).toBeVisible();
    expect(await readFile(`${fixture.cwd}/renamed.ts`, "utf8")).toBe("export const answer = 42;\n");
    await expect(right.locator(".cm-content").filter({ visible: true })).toBeVisible();
    await page.mouse.click(780, 410);
    await page.screenshot({ path: testInfo.outputPath("file-tree-reference.png") });
  } finally {
    await fixture.cleanup();
  }
});
