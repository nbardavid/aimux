import type { WorkspaceSnapshotV1 } from "../state/session-persistence";
import type { TabSession, TerminalModeState, TerminalSnapshot } from "../state/types";

export interface AttachRequest {
  cols: number;
  rows: number;
  workspaceSnapshot?: WorkspaceSnapshotV1;
}

export interface AttachResult {
  tabs: TabSession[];
  activeTabId: string | null;
}

export type ClientRequest =
  | { id: string; type: "attach"; payload: AttachRequest }
  | {
      id: string;
      type: "createTab";
      payload: {
        tabId: string;
        assistant: TabSession["assistant"];
        title: string;
        command: string;
        args?: string[];
        cols: number;
        rows: number;
        cwd?: string;
      };
    }
  | { id: string; type: "write"; payload: { tabId: string; data: string } }
  | { id: string; type: "resizeClient"; payload: { cols: number; rows: number } }
  | { id: string; type: "scroll"; payload: { tabId: string; deltaLines: number } }
  | { id: string; type: "scrollToBottom"; payload: { tabId: string } }
  | { id: string; type: "closeTab"; payload: { tabId: string } }
  | { id: string; type: "disposeAll"; payload: Record<string, never> }
  | { id: string; type: "ping"; payload: Record<string, never> };

export type ServerResponse =
  | { id: string; type: "ok"; payload: Record<string, never> }
  | { id: string; type: "attachResult"; payload: AttachResult }
  | { id: string; type: "error"; payload: { message: string } };

export type ServerEvent =
  | { type: "tabRender"; payload: { tabId: string; viewport: TerminalSnapshot; terminalModes: TerminalModeState } }
  | { type: "tabExit"; payload: { tabId: string; exitCode: number } }
  | { type: "tabError"; payload: { tabId: string; message: string } };

export type IpcMessage = ClientRequest | ServerResponse | ServerEvent;

export function encodeMessage(message: IpcMessage): string {
  return `${JSON.stringify(message)}\n`;
}
