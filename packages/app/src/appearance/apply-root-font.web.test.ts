import { afterEach, describe, expect, it, vi } from "vitest";
import { applyRootFonts } from "./apply-root-font.web";

describe("applyRootFonts", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("scopes the UI rule away from content and monospace surfaces", () => {
    const variables = vi.fn();
    const appendChild = vi.fn();
    const style = { id: "", textContent: null as string | null };
    const documentMock = {
      documentElement: { style: { setProperty: variables } },
      getElementById: vi.fn(() => null),
      createElement: vi.fn(() => style),
      head: { appendChild },
    } as unknown as Document;
    vi.stubGlobal("document", documentMock);

    applyRootFonts("Inter", "Georgia");

    expect(variables).toHaveBeenNthCalledWith(1, "--paseo-ui-font", "Inter");
    expect(variables).toHaveBeenNthCalledWith(2, "--paseo-content-font", "Georgia");
    expect(style.textContent).toContain(":not([data-pcontent]):not([data-pcontent] *)");
    expect(style.textContent).toContain("[data-pcontent]:not([data-pmono]):not([data-pmono] *)");
    expect(appendChild).toHaveBeenCalledWith(style);
  });
});
