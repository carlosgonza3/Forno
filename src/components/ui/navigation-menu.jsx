import {NavigationMenu as NavigationMenuPrimitive} from "@base-ui/react/navigation-menu";
import {ChevronDown} from "lucide-react";
import {cn} from "../../lib/utils";

export function NavigationMenu({className, children, ...props}) {
    return <NavigationMenuPrimitive.Root className={cn("ui-navigation-menu", className)}
        delay={80} closeDelay={120} {...props}>
        <NavigationMenuPrimitive.List className="ui-navigation-menu-list">
            {children}
        </NavigationMenuPrimitive.List>
        <NavigationMenuPrimitive.Portal>
            <NavigationMenuPrimitive.Positioner sideOffset={6} className="ui-navigation-menu-positioner">
                <NavigationMenuPrimitive.Popup className="ui-navigation-menu-popup">
                    <NavigationMenuPrimitive.Viewport className="ui-navigation-menu-viewport"/>
                </NavigationMenuPrimitive.Popup>
            </NavigationMenuPrimitive.Positioner>
        </NavigationMenuPrimitive.Portal>
    </NavigationMenuPrimitive.Root>;
}

export const NavigationMenuItem = NavigationMenuPrimitive.Item;

export function NavigationMenuTrigger({className, children, ...props}) {
    return <NavigationMenuPrimitive.Trigger className={cn("ui-navigation-menu-trigger", className)} {...props}>
        {children}<NavigationMenuPrimitive.Icon className="ui-navigation-menu-icon">
            <ChevronDown size={14}/>
        </NavigationMenuPrimitive.Icon>
    </NavigationMenuPrimitive.Trigger>;
}

export function NavigationMenuContent({className, ...props}) {
    return <NavigationMenuPrimitive.Content className={cn("ui-navigation-menu-content", className)} {...props}/>;
}
