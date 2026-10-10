import { describe, expect, test } from "vitest";
import { concatHooksByEvent, parseHooksJson } from "./hooks-json.js";

function parse(value: unknown): { hooks: ReturnType<typeof parseHooksJson>; warnings: string[] } {
  const warnings: string[] = [];
  const text = typeof value === "string" ? value : JSON.stringify(value);
  const hooks = parseHooksJson(text, { onWarning: (message) => warnings.push(message) });
  return { hooks, warnings };
}

describe("parseHooksJson", () => {
  test("keeps command hooks with their matcher and drops fields Codex does not hash", () => {
    const result = parse({
      hooks: {
        PreToolUse: [
          {
            matcher: "^(Bash|shell|functions.exec_command)$",
            hooks: [
              {
                type: "command",
                command: "$HOME/.agents/hooks/check.sh",
                timeout: 30,
                async: true,
                statusMessage: "Checking",
                if: "Bash(git *)",
                shell: "bash",
                once: true,
                commandWindows: "check.cmd",
              },
            ],
          },
          { matcher: "", hooks: [{ type: "command", command: "echo any" }] },
        ],
        UserPromptSubmit: [{ hooks: [{ type: "command", command: "echo prompt" }] }],
      },
    });

    expect(result).toEqual({
      hooks: {
        PreToolUse: [
          {
            matcher: "^(Bash|shell|functions.exec_command)$",
            hooks: [
              {
                type: "command",
                command: "$HOME/.agents/hooks/check.sh",
                timeout: 30,
                async: true,
                statusMessage: "Checking",
              },
            ],
          },
          { matcher: "", hooks: [{ type: "command", command: "echo any" }] },
        ],
        UserPromptSubmit: [{ hooks: [{ type: "command", command: "echo prompt" }] }],
      },
      warnings: [],
    });
  });

  test("skips handlers that are not valid command hooks and keeps the rest of the group", () => {
    const result = parse({
      hooks: {
        Stop: [
          {
            hooks: [
              { type: "prompt", prompt: "Check the work" },
              { type: "command", command: "echo stop" },
              { type: "command", command: "echo slow", timeout: "30" },
            ],
          },
        ],
      },
    });

    expect(result.hooks).toEqual({
      Stop: [{ hooks: [{ type: "command", command: "echo stop" }] }],
    });
    expect(result.warnings).toEqual([
      'hooks.Stop[0].hooks[0]: only valid "command" hooks are bridged; skipped',
      'hooks.Stop[0].hooks[2]: only valid "command" hooks are bridged; skipped',
    ]);
  });

  test("drops malformed groups and events with a warning each", () => {
    const result = parse({
      hooks: {
        Stop: [
          { matcher: 3, hooks: [{ type: "command", command: "echo bad-matcher" }] },
          "echo not-a-group",
          { hooks: [{ type: "command", command: "echo ok" }] },
        ],
        SessionStart: { hooks: [] },
      },
    });

    expect(result.hooks).toEqual({ Stop: [{ hooks: [{ type: "command", command: "echo ok" }] }] });
    expect(result.warnings).toEqual([
      "hooks.Stop[0] is not a { matcher?, hooks } group; skipped",
      "hooks.Stop[1] is not a { matcher?, hooks } group; skipped",
      "hooks.SessionStart is not a list; skipped",
    ]);
  });

  test("drops a group and an event that end up with no command hook", () => {
    const result = parse({
      hooks: {
        Stop: [{ hooks: [{ type: "agent", prompt: "Review" }] }],
        Notification: [{ hooks: [] }],
      },
    });

    expect(result.hooks).toEqual({});
    expect(result.warnings).toHaveLength(1);
  });

  test("accepts only the wrapped form", () => {
    const result = parse({
      UserPromptSubmit: [{ hooks: [{ type: "command", command: "echo prompt" }] }],
    });

    expect(result).toEqual({
      hooks: {},
      warnings: ["expected an object with a `hooks` object"],
    });
  });

  test("returns no hooks with a warning for malformed JSON", () => {
    const result = parse("{ not json");

    expect(result.hooks).toEqual({});
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("invalid JSON");
  });
});

describe("concatHooksByEvent", () => {
  test("concatenates groups per event in layer order", () => {
    const user = {
      Stop: [{ hooks: [{ type: "command" as const, command: "echo user-stop" }] }],
      SessionStart: [{ hooks: [{ type: "command" as const, command: "echo user-start" }] }],
    };
    const project = {
      Stop: [{ matcher: "", hooks: [{ type: "command" as const, command: "echo repo-stop" }] }],
    };

    expect(concatHooksByEvent([user, project])).toEqual({
      Stop: [
        { hooks: [{ type: "command", command: "echo user-stop" }] },
        { matcher: "", hooks: [{ type: "command", command: "echo repo-stop" }] },
      ],
      SessionStart: [{ hooks: [{ type: "command", command: "echo user-start" }] }],
    });
  });
});
