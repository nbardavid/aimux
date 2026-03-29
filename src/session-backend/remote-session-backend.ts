import { EventEmitter } from "node:events";
import { Socket, connect } from "node:net";

import { logDebug } from "../debug/input-log";
import { getDaemonSocketPath } from "../daemon/runtime-paths";
import { encodeMessage, type AttachResult, type ClientRequest, type ServerEvent, type ServerResponse } from "../ipc/protocol";
import type { WorkspaceSnapshotV1 } from "../state/session-persistence";
import type { SessionBackend, SessionBackendEvents } from "./types";

export class RemoteSessionBackend extends EventEmitter<SessionBackendEvents> implements SessionBackend {
  private socket: Socket | null = null;
  private readonly pending = new Map<string, (message: ServerResponse) => void>();
  private buffer = "";
  private attached = false;

  private getConnectedSocket(): Socket {
    if (!this.socket || this.socket.destroyed) {
      throw new Error("Remote backend socket is unavailable");
    }

    return this.socket;
  }

  private ensureAttached(): void {
    if (!this.attached) {
      throw new Error("Remote backend is not attached");
    }
  }

  private send(request: ClientRequest): Promise<ServerResponse> {
    const socket = this.getConnectedSocket();
    logDebug("backend.remote.send", { type: request.type, id: request.id });
    return new Promise((resolve, reject) => {
      this.pending.set(request.id, resolve);
      socket.write(encodeMessage(request), (error) => {
        if (error) {
          this.pending.delete(request.id);
          logDebug("backend.remote.sendError", {
            type: request.type,
            id: request.id,
            error: error.message,
          });
          reject(error);
        }
      });
    });
  }

  private handleServerEvent(message: ServerEvent): void {
    logDebug("backend.remote.event", { type: message.type });
    switch (message.type) {
      case "tabRender":
        this.emit("render", message.payload.tabId, message.payload.viewport, message.payload.terminalModes);
        break;
      case "tabExit":
        this.emit("exit", message.payload.tabId, message.payload.exitCode);
        break;
      case "tabError":
        this.emit("error", message.payload.tabId, message.payload.message);
        break;
    }
  }

  async attach(options: { cols: number; rows: number; workspaceSnapshot?: WorkspaceSnapshotV1 }): Promise<AttachResult> {
    const socketPath = getDaemonSocketPath();
    logDebug("backend.remote.attach.start", {
      socketPath,
      cols: options.cols,
      rows: options.rows,
      snapshotTabs: options.workspaceSnapshot?.tabs.length ?? 0,
    });
    const socket = connect(socketPath);
    this.socket = socket;
    this.attached = false;

    await new Promise<void>((resolve, reject) => {
      socket.once("connect", resolve);
      socket.once("error", reject);
    });
    logDebug("backend.remote.attach.connected", { socketPath });

    socket.on("error", (error) => {
      this.attached = false;
      logDebug("backend.remote.socketError", { error: error.message });
    });
    socket.on("close", () => {
      this.attached = false;
      logDebug("backend.remote.socketClose");
    });

    socket.on("data", (chunk) => {
      logDebug("backend.remote.data", { byteLength: chunk.length });
      this.buffer += chunk.toString("utf8");
      let newlineIndex = this.buffer.indexOf("\n");
      while (newlineIndex !== -1) {
        const line = this.buffer.slice(0, newlineIndex).trim();
        this.buffer = this.buffer.slice(newlineIndex + 1);
        if (line.length > 0) {
          const message = JSON.parse(line) as ServerResponse | ServerEvent;
          if ("id" in message) {
            logDebug("backend.remote.response", { type: message.type, id: message.id });
            const resolver = this.pending.get(message.id);
            if (resolver) {
              this.pending.delete(message.id);
              resolver(message);
            }
          } else {
            this.handleServerEvent(message);
          }
        }
        newlineIndex = this.buffer.indexOf("\n");
      }
    });

    const response = await this.send({
      id: crypto.randomUUID(),
      type: "attach",
      payload: options,
    });

    if (response.type !== "attachResult") {
      logDebug("backend.remote.attach.unexpected", { type: response.type });
      this.socket?.destroy();
      this.socket = null;
      throw new Error(response.type === "error" ? response.payload.message : "Unexpected attach response");
    }

    this.attached = true;

    logDebug("backend.remote.attach.success", {
      tabs: response.payload.tabs.length,
      activeTabId: response.payload.activeTabId,
    });

    return response.payload;
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
    if (!this.attached) {
      logDebug("backend.remote.skipCreateBeforeAttach", { tabId: options.tabId });
      return;
    }

    this.ensureAttached();

    void this.send({
      id: crypto.randomUUID(),
      type: "createTab",
      payload: options,
    });
  }

  write(tabId: string, input: string): void {
    if (!this.attached) {
      logDebug("backend.remote.skipWriteBeforeAttach", { tabId, inputLength: input.length });
      return;
    }
    this.ensureAttached();
    void this.send({ id: crypto.randomUUID(), type: "write", payload: { tabId, data: input } });
  }

  scrollViewport(tabId: string, deltaLines: number): void {
    if (!this.attached) {
      return;
    }
    this.ensureAttached();
    void this.send({ id: crypto.randomUUID(), type: "scroll", payload: { tabId, deltaLines } });
  }

  scrollViewportToBottom(tabId: string): void {
    if (!this.attached) {
      return;
    }
    this.ensureAttached();
    void this.send({ id: crypto.randomUUID(), type: "scrollToBottom", payload: { tabId } });
  }

  resizeAll(cols: number, rows: number): void {
    if (!this.attached) {
      logDebug("backend.remote.skipResizeBeforeAttach", { cols, rows });
      return;
    }
    this.ensureAttached();
    void this.send({ id: crypto.randomUUID(), type: "resizeClient", payload: { cols, rows } });
  }

  disposeSession(tabId: string): void {
    if (!this.attached) {
      return;
    }
    this.ensureAttached();
    void this.send({ id: crypto.randomUUID(), type: "closeTab", payload: { tabId } });
  }

  disposeAll(): void {
    if (!this.attached) {
      return;
    }
    this.ensureAttached();
    void this.send({ id: crypto.randomUUID(), type: "disposeAll", payload: {} });
  }

  async destroy(keepSessions = true): Promise<void> {
    logDebug("backend.remote.destroy", { keepSessions });
    if (!keepSessions) {
      this.disposeAll();
    }

    this.socket?.end();
    this.socket?.destroy();
    this.socket = null;
    this.attached = false;
  }
}
