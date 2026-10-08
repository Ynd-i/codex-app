import { encodeTerminalPaste } from "@/terminal/runtime/terminal-paste";

// One shell per workspace runs every command the user sends from a chat code
// block, so `cd`, exports and virtualenvs carry over to the next command.
// Agents find this shell by name: list_terminals, then capture_terminal (Paseo MCP).
export const RUNNER_TERMINAL_NAME = "Run";

const runnerTerminalIds = new Map<string, string>();

export function resolveRunnerTerminalId(key: string, liveTerminalIds: string[]): string | null {
  const terminalId = runnerTerminalIds.get(key);
  if (terminalId && liveTerminalIds.includes(terminalId)) {
    return terminalId;
  }
  runnerTerminalIds.delete(key);
  return null;
}

export function setRunnerTerminalId(key: string, terminalId: string): void {
  runnerTerminalIds.set(key, terminalId);
}

export function toTerminalCommandInput(command: string): string {
  const text = command.replace(/\n+$/, "");
  if (!text.includes("\n")) {
    return `${text}\r`;
  }
  // Typed raw, a multi-line block runs its first line and leaves the rest in the tty
  // queue, where an interactive first command (gh, git, npm) reads them as its own
  // stdin and they never run. Bracketed paste loads the whole block into the shell's
  // edit buffer before anything executes.
  // ponytail: assumes the shell enabled DECSET 2004; one that never does (bash 3.2)
  // echoes the markers. Gate on the emulator's tracked mode if that ever shows up.
  return `${encodeTerminalPaste({ text, bracketedPaste: true })}\r`;
}
