import type { AppState } from "../state/types";

import type { TerminalContentOrigin } from "../input/raw-input-handler";
import type { MouseEvent } from "@opentui/core";
import { NewTabModal } from "./components/new-tab-modal";
import { Sidebar } from "./components/sidebar";
import { StatusBar } from "./components/status-bar";
import { TerminalPane } from "./components/terminal-pane";
import { theme } from "./theme";

interface RootViewProps {
  state: AppState;
  contentOrigin: TerminalContentOrigin;
  mouseForwardingEnabled: boolean;
  onTerminalMouseEvent: (event: MouseEvent, origin: TerminalContentOrigin) => void;
}

export function RootView({ state, contentOrigin, mouseForwardingEnabled, onTerminalMouseEvent }: RootViewProps) {
  const activeTab = state.tabs.find((tab) => tab.id === state.activeTabId);

  return (
    <box flexDirection="column" width="100%" height="100%" backgroundColor={theme.background}>
      <box flexDirection="row" gap={1} padding={1} flexGrow={1}>
        <Sidebar state={state} />
        <TerminalPane
          tab={activeTab}
          focusMode={state.focusMode}
          contentOrigin={contentOrigin}
          mouseForwardingEnabled={mouseForwardingEnabled}
          onTerminalMouseEvent={onTerminalMouseEvent}
        />
      </box>
      <StatusBar state={state} activeTab={activeTab} />
      {state.modal.type === "new-tab" ? (
        <NewTabModal
          selectedIndex={state.modal.selectedIndex}
          customCommands={state.customCommands}
          editBuffer={state.modal.editBuffer}
        />
      ) : null}
    </box>
  );
}
