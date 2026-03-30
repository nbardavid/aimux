import { describe, expect, test } from "bun:test";
import { dirname } from "node:path";

import { CONFIG_PATH } from "../../src/config";
import { getSessionCatalogPath } from "../../src/state/session-catalog";
import { createInitialState } from "../../src/state/store";

describe("session catalog", () => {
  test("stores sessions in a separate ~/.config file", () => {
    expect(getSessionCatalogPath()).toBe(`${dirname(CONFIG_PATH)}/aimux-sessions.json`);
  });

  test("can start in startup picker mode", () => {
    const state = createInitialState({}, [], true);
    expect(state.focusMode).toBe("modal");
    expect(state.modal.type).toBe("session-picker");
  });

  test("defaults to navigation mode without startup picker", () => {
    const state = createInitialState();
    expect(state.focusMode).toBe("navigation");
    expect(state.modal.type).toBeNull();
  });
});
