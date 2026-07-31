import {Dialog} from "@base-ui/react/dialog";
import {X} from "lucide-react";
import {cn} from "../../lib/utils";

function Sheet(props) {
    return <Dialog.Root {...props}/>;
}

function SheetTrigger(props) {
    return <Dialog.Trigger {...props}/>;
}

function SheetClose(props) {
    return <Dialog.Close {...props}/>;
}

function SheetContent({className, children, side = "right", showCloseButton = true, ...props}) {
    return <Dialog.Portal>
        <Dialog.Backdrop className="sheet-overlay"/>
        <Dialog.Viewport className="sheet-viewport">
            <Dialog.Popup className={cn("sheet-content", `sheet-content-${side}`, className)} {...props}>
                {children}
                {showCloseButton && <Dialog.Close className="icon-btn sheet-close" aria-label="Cerrar">
                    <X size={18}/>
                </Dialog.Close>}
            </Dialog.Popup>
        </Dialog.Viewport>
    </Dialog.Portal>;
}

function SheetHeader({className, ...props}) {
    return <header className={cn("sheet-header", className)} {...props}/>;
}

function SheetFooter({className, ...props}) {
    return <footer className={cn("sheet-footer", className)} {...props}/>;
}

function SheetTitle({className, ...props}) {
    return <Dialog.Title className={cn("sheet-title", className)} {...props}/>;
}

function SheetDescription({className, ...props}) {
    return <Dialog.Description className={cn("sheet-description", className)} {...props}/>;
}

export {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
};
