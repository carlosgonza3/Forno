import {Group, Panel, Separator} from "react-resizable-panels";
import {cn} from "../../lib/utils";

function ResizablePanelGroup({className, ...props}) {
  return <Group data-slot="resizable-panel-group"
    className={cn("resizable-panel-group", className)} {...props}/>;
}

function ResizablePanel(props) {
  return <Panel data-slot="resizable-panel" {...props}/>;
}

function ResizableHandle({className, ...props}) {
  return <Separator data-slot="resizable-handle"
    className={cn("resizable-handle", className)} {...props}/>;
}

export {ResizableHandle, ResizablePanel, ResizablePanelGroup};
