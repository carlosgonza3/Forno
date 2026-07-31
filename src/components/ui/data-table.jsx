import {flexRender, getCoreRowModel, useReactTable} from "@tanstack/react-table";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "./table";
import {cn} from "../../lib/utils";

export function DataTable({columns, data, className, emptyMessage = "No hay resultados."}) {
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    return <div className={cn("data-table", className)}>
        <Table>
            <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => <TableHead key={header.id}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>)}
                </TableRow>)}
            </TableHeader>
            <TableBody>
                {table.getRowModel().rows.length
                    ? table.getRowModel().rows.map((row) => <TableRow key={row.id}
                        data-state={row.original.active === false ? "inactive" : undefined}>
                        {row.getVisibleCells().map((cell) => <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>)}
                    </TableRow>)
                    : <TableRow><TableCell className="data-table-empty" colSpan={columns.length}>
                        {emptyMessage}
                    </TableCell></TableRow>}
            </TableBody>
        </Table>
    </div>;
}
