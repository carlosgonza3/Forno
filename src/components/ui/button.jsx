import {Slot} from "@radix-ui/react-slot";
import {cva} from "class-variance-authority";
import {cn} from "../../lib/utils";

const buttonVariants = cva("ui-button", {
  variants: {
    variant: {
      default: "ui-button-default",
      outline: "ui-button-outline",
      ghost: "ui-button-ghost",
      secondary: "ui-button-secondary",
    },
    size: {
      default: "ui-button-size-default",
      sm: "ui-button-size-sm",
      icon: "ui-button-size-icon",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

export function Button({className, variant, size, asChild = false, ...props}) {
  const Component = asChild ? Slot : "button";
  return <Component className={cn(buttonVariants({variant, size}), className)} {...props}/>;
}
