import React from 'react';

export interface TableContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const TableContainer: React.FC<TableContainerProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`w-full overflow-x-auto rounded-2xl border border-[#1E293B] bg-[#131B2E] shadow-sm scrollbar-thin ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  className?: string;
}

export const Table: React.FC<TableProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <table
      className={`w-full text-left text-sm text-gray-200 border-collapse ${className}`}
      {...props}
    >
      {children}
    </table>
  );
};

export interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  sticky?: boolean;
  className?: string;
}

export const TableHeader: React.FC<TableHeaderProps> = ({
  children,
  sticky = false,
  className = '',
  ...props
}) => {
  return (
    <thead
      className={`bg-[#0B0F19]/95 text-gray-300 font-semibold text-xs uppercase tracking-wider border-b border-[#1E293B] ${
        sticky ? 'sticky top-0 z-10 backdrop-blur-md' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </thead>
  );
};

export interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  className?: string;
}

export const TableBody: React.FC<TableBodyProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <tbody className={`divide-y divide-[#1E293B]/60 ${className}`} {...props}>
      {children}
    </tbody>
  );
};

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  striped?: boolean;
  hoverable?: boolean;
  className?: string;
}

export const TableRow: React.FC<TableRowProps> = ({
  children,
  striped = false,
  hoverable = true,
  className = '',
  ...props
}) => {
  return (
    <tr
      className={`transition-colors duration-150 ${
        striped ? 'odd:bg-transparent even:bg-[#0B0F19]/40' : ''
      } ${hoverable ? 'hover:bg-gray-800/40' : ''} ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
};

export interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  className?: string;
}

export const TableHead: React.FC<TableHeadProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <th
      scope="col"
      className={`px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-300 ${className}`}
      {...props}
    >
      {children}
    </th>
  );
};

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  className?: string;
}

export const TableCell: React.FC<TableCellProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <td className={`px-4 py-3.5 text-sm text-gray-200 align-middle ${className}`} {...props}>
      {children}
    </td>
  );
};
