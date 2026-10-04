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
  return `${command.replace(/\n+$/, "")}\r`;
}
