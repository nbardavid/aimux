import { createServer, type Socket } from "node:net";

import { logDebug } from "../debug/input-log";
import { getDaemonSocketPath, removeDaemonSocketIfExists } from "./runtime-paths";
import { SessionRegistry } from "./session-registry";
import { encodeMessage, type ClientRequest, type ServerEvent, type ServerResponse } from "../ipc/protocol";

function send(socket: Socket, message: ServerResponse | ServerEvent): void {
  socket.write(encodeMessage(message));
}

export async function runDaemon(): Promise<void> {
  const socketPath = getDaemonSocketPath();
  logDebug("daemon.start", { socketPath, pid: process.pid });
  logDebug("daemon.removeStaleSocket", { socketPath });
  removeDaemonSocketIfExists();

  const registry = new SessionRegistry();
  const sockets = new Set<Socket>();

  registry.on("render", (tabId, viewport, terminalModes) => {
    const event: ServerEvent = { type: "tabRender", payload: { tabId, viewport, terminalModes } };
    for (const socket of sockets) {
      send(socket, event);
    }
  });
  registry.on("exit", (tabId, exitCode) => {
    const event: ServerEvent = { type: "tabExit", payload: { tabId, exitCode } };
    for (const socket of sockets) {
      send(socket, event);
    }
  });
  registry.on("error", (tabId, message) => {
    const event: ServerEvent = { type: "tabError", payload: { tabId, message } };
    for (const socket of sockets) {
      send(socket, event);
    }
  });

  const server = createServer((socket) => {
    logDebug("daemon.client.connected");
    sockets.add(socket);
    let buffer = "";

    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      let newlineIndex = buffer.indexOf("\n");
      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);

        if (line.length > 0) {
          try {
            const message = JSON.parse(line) as ClientRequest;
            logDebug("daemon.request", { type: message.type, id: message.id });
            switch (message.type) {
              case "attach": {
                const attachResult = registry.attachFromSnapshot(message.payload.workspaceSnapshot);
                send(socket, { id: message.id, type: "attachResult", payload: attachResult });
                break;
              }
              case "createTab":
                registry.createSession(message.payload);
                send(socket, { id: message.id, type: "ok", payload: {} });
                break;
              case "write":
                registry.write(message.payload.tabId, message.payload.data);
                send(socket, { id: message.id, type: "ok", payload: {} });
                break;
              case "resizeClient":
                registry.resizeAll(message.payload.cols, message.payload.rows);
                send(socket, { id: message.id, type: "ok", payload: {} });
                break;
              case "scroll":
                registry.scrollViewport(message.payload.tabId, message.payload.deltaLines);
                send(socket, { id: message.id, type: "ok", payload: {} });
                break;
              case "scrollToBottom":
                registry.scrollViewportToBottom(message.payload.tabId);
                send(socket, { id: message.id, type: "ok", payload: {} });
                break;
              case "closeTab":
                registry.closeTab(message.payload.tabId);
                send(socket, { id: message.id, type: "ok", payload: {} });
                break;
              case "disposeAll":
                registry.disposeAll();
                send(socket, { id: message.id, type: "ok", payload: {} });
                break;
              case "ping":
                send(socket, { id: message.id, type: "ok", payload: {} });
                break;
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logDebug("daemon.request.error", { error: message });
            send(socket, { id: crypto.randomUUID(), type: "error", payload: { message } });
          }
        }

        newlineIndex = buffer.indexOf("\n");
      }
    });

    socket.on("close", () => {
      logDebug("daemon.client.close");
      sockets.delete(socket);
    });
    socket.on("error", () => {
      logDebug("daemon.client.error");
      sockets.delete(socket);
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(socketPath, () => resolve());
  });
  logDebug("daemon.listening", { socketPath });

  process.on("SIGTERM", () => {
    logDebug("daemon.sigterm");
    registry.disposeAll();
    server.close();
    process.exit(0);
  });

  process.on("SIGINT", () => {
    logDebug("daemon.sigint");
    registry.disposeAll();
    server.close();
    process.exit(0);
  });

  await new Promise<void>(() => {
    // Keep the daemon process alive until it is terminated.
  });
}
