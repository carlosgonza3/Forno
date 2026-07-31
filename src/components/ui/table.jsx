import {cn} from "../../lib/utils";

export function Table({className, ...props}) {
  return <div className="ui-table-container"><table className={cn("ui-table", className)} {...props}/></div>;
}

export function TableHeader({className, ...props}) {
  return <thead className={cn("ui-table-header", className)} {...props}/>;
}

export function TableBody({className, ...props}) {
  return <tbody className={cn("ui-table-body", className)} {...props}/>;
}

export function TableRow({className, ...props}) {
  return <tr className={cn("ui-table-row", className)} {...props}/>;
}

export function TableHead({className, ...props}) {
  return <th className={cn("ui-table-head", className)} {...props}/>;
}

export function TableCell({className, ...props}) {
  return <td className={cn("ui-table-cell", className)} {...props}/>;
}
