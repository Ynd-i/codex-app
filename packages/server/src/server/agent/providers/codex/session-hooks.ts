import { createHash } from "node:crypto";
import type { CommandHook, HooksByEvent } from "../../workspace-contract/hooks-json.js";

// The source path that Codex gives hooks arriving in a thread's config.
const SESSION_FLAGS_SOURCE = "/<session-flags>/config.toml";

interface CodexHookTimeout {
  defaultSeconds: number;
  maxSeconds: number;
}

// Codex hashes the timeout it will run with, after its per-event default and limit.
const DEFAULT_HOOK_TIMEOUT: CodexHookTimeout = {
  defaultSeconds: 600,
  maxSeconds: Number.POSITIVE_INFINITY,
};
const HOOK_TIMEOUT_BY_EVENT: Record<string, CodexHookTimeout> = {
  session_end: { defaultSeconds: 1, maxSeconds: 3 },
  interrupt: { defaultSeconds: 1, maxSeconds: 3 },
};

/**
 * The `hooks` table of a Codex thread config: each event's groups with one handler apiece, and a
 * `state` entry per group that marks it trusted. Codex skips an untrusted hook without a message,
 * so the daemon vouches for the hooks it injects with the hash Codex computes for them.
 */
export function buildCodexSessionHooks(hooksByEvent: HooksByEvent): Record<string, unknown> {
  const table: Record<string, unknown> = {};
  const state: Record<string, { trusted_hash: string }> = {};
  for (const [event, groups] of Object.entries(hooksByEvent)) {
    const eventName = toCodexEventName(event);
    const split = groups.flatMap((group) =>
      group.hooks.map((handler) => ({ group: { ...group, hooks: [handler] }, handler })),
    );
    split.forEach(({ group, handler }, groupIndex) => {
      state[`${SESSION_FLAGS_SOURCE}:${eventName}:${groupIndex}:0`] = {
        trusted_hash: codexHookTrustHash({ eventName, matcher: group.matcher, handler }),
      };
    });
    table[event] = split.map(({ group }) => group);
  }
  // Assigned last, so an event named "state" cannot replace the trust table.
  table.state = state;
  return table;
}

/** The `trusted_hash` that Codex 0.159 computes for a hook group with one command handler. */
export function codexHookTrustHash(params: {
  eventName: string;
  matcher: string | undefined;
  handler: CommandHook;
}): string {
  const { eventName, matcher, handler } = params;
  const timeout = HOOK_TIMEOUT_BY_EVENT[eventName] ?? DEFAULT_HOOK_TIMEOUT;
  // Codex hashes compact JSON with sorted keys, so both objects list their keys in sorted order.
  // A matcher is hashed whenever it is present, including "".
  const hashed = {
    event_name: eventName,
    hooks: [
      {
        async: handler.async ?? false,
        command: handler.command,
        ...(handler.statusMessage === undefined ? {} : { statusMessage: handler.statusMessage }),
        timeout: Math.min(handler.timeout ?? timeout.defaultSeconds, timeout.maxSeconds),
        type: "command",
      },
    ],
    ...(matcher === undefined ? {} : { matcher }),
  };
  return `sha256:${createHash("sha256").update(JSON.stringify(hashed)).digest("hex")}`;
}

/** `UserPromptSubmit` becomes `user_prompt_submit`, the event name in Codex trust keys. */
function toCodexEventName(event: string): string {
  return event.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}
