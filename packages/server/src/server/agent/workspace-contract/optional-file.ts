import { readFile, readdir } from "node:fs/promises";

/** Reads and parses a file that may be missing. Other failures are reported through `onWarning`. */
export async function parseOptionalFile<T>(
  path: string,
  parse: (text: string, options: { onWarning: (message: string) => void }) => T,
  onWarning: (message: string) => void,
): Promise<T | null> {
  const text = await readOptionalFile(path, onWarning);
  return text === null
    ? null
    : parse(text, { onWarning: (message) => onWarning(`${path}: ${message}`) });
}

export function ifMissing<T>(fallback: T): (error: NodeJS.ErrnoException) => T {
  return (error) => {
    if (error.code === "ENOENT") return fallback;
    throw error;
  };
}

/**
 * The sorted entry names of a directory that may be missing, without dotfiles. Other failures are
 * reported through `onWarning`.
 */
export async function listOptionalDir(
  dir: string,
  onWarning: (message: string) => void,
): Promise<string[]> {
  try {
    const names = await readdir(dir);
    return names.filter((name) => !name.startsWith(".")).sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      onWarning(`${dir}: ${error instanceof Error ? error.message : String(error)}`);
    }
    return [];
  }
}

export async function readOptionalFile(
  path: string,
  onWarning: (message: string) => void,
): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      onWarning(`${path}: ${error instanceof Error ? error.message : String(error)}`);
    }
    return null;
  }
}
