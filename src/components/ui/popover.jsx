import {Popover as PopoverPrimitive} from "@base-ui/react/popover";
import {cn} from "../../lib/utils";

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverClose = PopoverPrimitive.Close;

export function PopoverContent({className, align = "start", sideOffset = 7, ...props}) {
    return <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner align={align} sideOffset={sideOffset}
            className="ui-popover-positioner">
            <PopoverPrimitive.Popup className={cn("ui-popover-content", className)} {...props}/>
        </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>;
}
