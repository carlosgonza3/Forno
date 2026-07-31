import {forwardRef} from "react";
import {cn} from "../../lib/utils";

export function InputGroup({className, onMouseDown, ...props}) {
    function focusControl(event) {
        onMouseDown?.(event);
        if (event.defaultPrevented || event.target.closest("button")) return;
        event.currentTarget.querySelector("[data-slot='input-group-control']")?.focus();
    }

    return <div data-slot="input-group" className={cn("ui-input-group", className)}
        onMouseDown={focusControl} {...props}/>;
}

export const InputGroupInput = forwardRef(function InputGroupInput({className, ...props}, ref) {
    return <input ref={ref} data-slot="input-group-control"
        className={cn("ui-input-group-input", className)} {...props}/>;
});

export function InputGroupAddon({className, align = "inline-start", interactive = false, ...props}) {
    return <div data-slot="input-group-addon" data-align={align}
        data-interactive={interactive ? "" : undefined}
        className={cn("ui-input-group-addon", className)} {...props}/>;
}
