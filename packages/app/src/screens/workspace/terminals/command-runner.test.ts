import { describe, expect, it } from "vitest";
import {
  resolveRunnerTerminalId,
  setRunnerTerminalId,
  toTerminalCommandInput,
} from "@/screens/workspace/terminals/command-runner";

describe("command runner terminal", () => {
  it("reuses the runner while it is live and drops it once it is gone", () => {
    setRunnerTerminalId("srv:ws", "t1");
    expect(resolveRunnerTerminalId("srv:ws", ["t0", "t1"])).toBe("t1");
    expect(resolveRunnerTerminalId("srv:ws", ["t0"])).toBeNull();
    expect(resolveRunnerTerminalId("srv:ws", ["t0", "t1"])).toBeNull();
  });

  it("keeps runners separate per workspace", () => {
    setRunnerTerminalId("srv:a", "ta");
    expect(resolveRunnerTerminalId("srv:b", ["ta"])).toBeNull();
  });

  it("ends the command with one carriage return", () => {
    expect(toTerminalCommandInput("ls\n\n")).toBe("ls\r");
  });
});
