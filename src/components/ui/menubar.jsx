import {Menubar as MenubarPrimitive} from "@base-ui/react/menubar";
import {Menu} from "@base-ui/react/menu";
import {Check, ChevronDown} from "lucide-react";
import {cn} from "../../lib/utils";

export function Menubar({className, ...props}) {
    return <MenubarPrimitive className={cn("ui-menubar", className)} {...props}/>;
}

export const MenubarMenu = Menu.Root;

export function MenubarTrigger({className, children, ...props}) {
    return <Menu.Trigger className={cn("ui-menubar-trigger", className)} {...props}>
        {children}<ChevronDown size={13}/>
    </Menu.Trigger>;
}

export function MenubarContent({className, align = "start", sideOffset = 6, ...props}) {
    return <Menu.Portal><Menu.Positioner align={align} sideOffset={sideOffset} className="ui-menubar-positioner">
        <Menu.Popup className={cn("ui-menubar-content", className)} {...props}/>
    </Menu.Positioner></Menu.Portal>;
}

export const MenubarGroup = Menu.Group;
export const MenubarRadioGroup = Menu.RadioGroup;

export function MenubarLabel({className, ...props}) {
    return <div className={cn("ui-menubar-label", className)} {...props}/>;
}

export function MenubarItem({className, ...props}) {
    return <Menu.Item className={cn("ui-menubar-item", className)} {...props}/>;
}

export function MenubarRadioItem({className, children, ...props}) {
    return <Menu.RadioItem className={cn("ui-menubar-item", className)} {...props}>
        <Menu.RadioItemIndicator className="ui-menubar-indicator"><Check size={13}/></Menu.RadioItemIndicator>
        {children}
    </Menu.RadioItem>;
}

export function MenubarCheckboxItem({className, children, ...props}) {
    return <Menu.CheckboxItem className={cn("ui-menubar-item", className)} {...props}>
        <Menu.CheckboxItemIndicator className="ui-menubar-indicator"><Check size={13}/></Menu.CheckboxItemIndicator>
        {children}
    </Menu.CheckboxItem>;
}

export function MenubarSeparator({className, ...props}) {
    return <div role="separator" className={cn("ui-menubar-separator", className)} {...props}/>;
}
