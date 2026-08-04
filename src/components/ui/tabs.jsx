import {Tabs as TabsPrimitive} from "@base-ui/react/tabs";
import {cn} from "../../lib/utils";

function Tabs({className, ...props}) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn("ui-tabs", className)} {...props}/>;
}

function TabsList({className, children, variant = "default", ...props}) {
  return <TabsPrimitive.List data-slot="tabs-list" data-variant={variant}
    className={cn("ui-tabs-list", className)} {...props}>
    {children}
    <TabsPrimitive.Indicator data-slot="tabs-indicator" className="ui-tabs-indicator"/>
  </TabsPrimitive.List>;
}

function TabsTrigger({className, ...props}) {
  return <TabsPrimitive.Tab data-slot="tabs-trigger"
    className={cn("ui-tabs-trigger", className)} {...props}/>;
}

function TabsContent({className, ...props}) {
  return <TabsPrimitive.Panel data-slot="tabs-content"
    className={cn("ui-tabs-content", className)} {...props}/>;
}

export {Tabs, TabsContent, TabsList, TabsTrigger};
