import { z } from "zod";

// Unknown fields (Claude's `if`, `once` and `shell`, Codex's `commandWindows`) are stripped by
// z.object. Codex hashes exactly these fields to decide hook trust.
const COMMAND_HOOK = z.object({
  type: z.literal("command"),
  command: z.string().min(1),
  timeout: z.number().int().positive().optional(),
  async: z.boolean().optional(),
  statusMessage: z.string().optional(),
});

const HOOK_GROUP = z.object({ matcher: z.string().optional(), hooks: z.array(z.unknown()) });

const HOOKS_JSON_FILE = z.object({ hooks: z.record(z.string(), z.unknown()) });

export type CommandHook = z.infer<typeof COMMAND_HOOK>;

export interface HookGroup {
  matcher?: string;
  hooks: CommandHook[];
}

/** Hook groups by event name, in the Claude Code hooks format that Codex also reads. */
export type HooksByEvent = Record<string, HookGroup[]>;

/**
 * Parses a `hooks/hooks.json` in the wrapped Claude Code form, `{ "hooks": { "<Event>": [...] } }`.
 * Only `command` handlers are kept, because the other handler types are vendor-specific. Anything
 * it cannot use is reported through `onWarning` and skipped, so a broken file never blocks a launch.
 */
export function parseHooksJson(
  text: string,
  options: { onWarning: (message: string) => void },
): HooksByEvent {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    options.onWarning(`invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
    return {};
  }
  const file = HOOKS_JSON_FILE.safeParse(raw);
  if (!file.success) {
    options.onWarning("expected an object with a `hooks` object");
    return {};
  }

  const hooks: HooksByEvent = {};
  for (const [event, value] of Object.entries(file.data.hooks)) {
    const groups = parseEventGroups(event, value, options.onWarning);
    if (groups.length > 0) {
      hooks[event] = groups;
    }
  }
  return hooks;
}

export function concatHooksByEvent(layers: readonly HooksByEvent[]): HooksByEvent {
  const merged: HooksByEvent = {};
  for (const hooks of layers) {
    for (const [event, groups] of Object.entries(hooks)) {
      merged[event] = [...(merged[event] ?? []), ...groups];
    }
  }
  return merged;
}

function parseEventGroups(
  event: string,
  value: unknown,
  onWarning: (message: string) => void,
): HookGroup[] {
  if (!Array.isArray(value)) {
    onWarning(`hooks.${event} is not a list; skipped`);
    return [];
  }
  const groups: HookGroup[] = [];
  value.forEach((entry, groupIndex) => {
    const path = `hooks.${event}[${groupIndex}]`;
    const group = HOOK_GROUP.safeParse(entry);
    if (!group.success) {
      onWarning(`${path} is not a { matcher?, hooks } group; skipped`);
      return;
    }
    const handlers: CommandHook[] = [];
    group.data.hooks.forEach((handler, handlerIndex) => {
      const command = COMMAND_HOOK.safeParse(handler);
      if (command.success) {
        handlers.push(command.data);
      } else {
        onWarning(
          `${path}.hooks[${handlerIndex}]: only valid "command" hooks are bridged; skipped`,
        );
      }
    });
    if (handlers.length > 0) {
      groups.push({ ...group.data, hooks: handlers });
    }
  });
  return groups;
}
