import { EventEmitter } from "node:events";

import { PtyManager } from "../pty/pty-manager";
import type { SessionBackend, SessionBackendEvents } from "./types";

export class LocalSessionBackend extends EventEmitter<SessionBackendEvents> implements SessionBackend {
  private readonly ptyManager = new PtyManager();

  constructor() {
    super();
    this.ptyManager.on("render", (...args) => this.emit("render", ...args));
    this.ptyManager.on("exit", (...args) => this.emit("exit", ...args));
    this.ptyManager.on("error", (...args) => this.emit("error", ...args));
  }

  async attach(): Promise<null> {
    return null;
  }

  createSession(options: {
    tabId: string;
    assistant: "claude" | "codex" | "opencode";
    title: string;
    command: string;
    args?: string[];
    cols: number;
    rows: number;
    cwd?: string;
  }): void {
    this.ptyManager.createSession(options);
  }

  write(tabId: string, input: string): void {
    this.ptyManager.write(tabId, input);
  }

  scrollViewport(tabId: string, deltaLines: number): void {
    this.ptyManager.scrollViewport(tabId, deltaLines);
  }

  scrollViewportToBottom(tabId: string): void {
    this.ptyManager.scrollViewportToBottom(tabId);
  }

  resizeAll(cols: number, rows: number): void {
    this.ptyManager.resizeAll(cols, rows);
  }

  disposeSession(tabId: string): void {
    this.ptyManager.disposeSession(tabId);
  }

  disposeAll(): void {
    this.ptyManager.disposeAll();
  }

  destroy(): void {
    this.disposeAll();
  }
}
