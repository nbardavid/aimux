import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const CONFIG_PATH = join(process.env.HOME ?? "~", ".config", "aimux.json");

export interface AimuxConfig {
  customCommands: Record<string, string>;
}

export function loadConfig(): AimuxConfig {
  try {
    if (existsSync(CONFIG_PATH)) {
      const raw = readFileSync(CONFIG_PATH, "utf8");
      const parsed = JSON.parse(raw);
      return { customCommands: parsed.customCommands ?? {} };
    }
  } catch {
    // ignore missing or malformed config
  }
  return { customCommands: {} };
}

export function saveConfig(config: AimuxConfig): void {
  try {
    mkdirSync(dirname(CONFIG_PATH), { recursive: true });
    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n");
  } catch {
    // ignore write errors silently
  }
}
