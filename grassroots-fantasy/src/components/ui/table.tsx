"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface TableProps extends React.HTMLAttributes<HTMLDivElement> {
  striped?: boolean;
  compact?: boolean;
}

export interface TableHeaderProps
  extends React.HTMLAttributes<HTMLTableSectionElement> {}

export interface TableBodyProps
  extends React.HTMLAttributes<HTMLTableSectionElement> {}

export interface TableRowProps
  extends React.HTMLAttributes<HTMLTableRowElement> {
  active?: boolean;
}

export interface TableCellProps
  extends React.TdHTMLAttributes<HTMLTableCellElement> {
  align?: "left" | "center" | "right";
}

/* ─── Root ─── */
const TableRoot = React.forwardRef<HTMLDivElement, TableProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "w-full overflow-x-auto rounded-xl border border-surface-700/50",
        className
      )}
      {...props}
    >
      <table className="w-full caption-bottom text-sm">{children}</table>
    </div>
  )
);
TableRoot.displayName = "Table";

/* ─── Header ─── */
const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  TableHeaderProps
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      "border-b border-surface-700/50 bg-surface-800/50",
      className
    )}
    {...props}
  />
));
TableHeader.displayName = "Table.Header";

/* ─── Body ─── */
const TableBody = React.forwardRef<HTMLTableSectionElement, TableBodyProps>(
  ({ className, ...props }, ref) => (
    <tbody
      ref={ref}
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
);
TableBody.displayName = "Table.Body";

/* ─── Row ─── */
const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, active = false, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "border-b border-surface-700/30 transition-colors duration-150",
        "hover:bg-surface-700/30",
        active && "bg-brand-500/10",
        className
      )}
      {...props}
    />
  )
);
TableRow.displayName = "Table.Row";

/* ─── Head Cell ─── */
const TableHeadCell = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400",
      className
    )}
    {...props}
  />
));
TableHeadCell.displayName = "Table.HeadCell";

/* ─── Cell ─── */
const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, align = "left", ...props }, ref) => (
    <td
      ref={ref}
      className={cn(
        "px-4 py-3 text-surface-300",
        align === "center" && "text-center",
        align === "right" && "text-right",
        className
      )}
      {...props}
    />
  )
);
TableCell.displayName = "Table.Cell";

/* ─── Caption ─── */
const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("px-4 py-3 text-xs text-surface-500", className)}
    {...props}
  />
));
TableCaption.displayName = "Table.Caption";

/* ─── Compound Export ─── */
export const Table = Object.assign(TableRoot, {
  Header: TableHeader,
  Body: TableBody,
  Row: TableRow,
  HeadCell: TableHeadCell,
  Cell: TableCell,
  Caption: TableCaption,
});
