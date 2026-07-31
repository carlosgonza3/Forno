import {cva} from "class-variance-authority";
import {cn} from "../../lib/utils";

const badgeVariants = cva("ui-badge", {
  variants: {
    variant: {
      default: "ui-badge-default",
      critical: "ui-badge-critical",
      low: "ui-badge-low",
      outline: "ui-badge-outline",
      selected: "ui-badge-selected",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export function Badge({className, variant, ...props}) {
  return <span className={cn(badgeVariants({variant}), className)} {...props}/>;
}
