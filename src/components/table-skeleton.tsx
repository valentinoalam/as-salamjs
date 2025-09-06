import { Skeleton } from "./ui/skeleton";

type componentProps = { children: React.ReactNode; className?: string }

export const Table = ({ children, className = "" }: componentProps) => (
  <table className={`w-full caption-bottom text-sm ${className}`}>
    {children}
  </table>
);

export const TableHeader = ({ children, className = "" }: componentProps) => (
  <thead className={`[&_tr]:border-b ${className}`}>
    {children}
  </thead>
);

export const TableBody = ({ children, className = "" }: componentProps) => (
  <tbody className={`[&_tr:last-child]:border-0 ${className}`}>
    {children}
  </tbody>
);

export const TableRow = ({ children, className = "" }: componentProps) => (
  <tr className={`border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted ${className}`}>
    {children}
  </tr>
);

export const TableHead = ({ children, className = "" }: componentProps) => (
  <th className={`h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 ${className}`}>
    {children}
  </th>
);

export const TableCell = ({ children, className = "" }: componentProps) => (
  <td className={`p-4 align-middle [&:has([role=checkbox])]:pr-0 ${className}`}>
    {children}
  </td>
);

// Skeleton component for individual table rows
export const TableRowSkeleton = ({ columns = 4 }) => (
  <TableRow>
    {Array.from({ length: columns }).map((_, index) => (
      <TableCell key={index} className="py-4">
        <Skeleton className="h-4 w-full" />
      </TableCell>
    ))}
  </TableRow>
);

// Skeleton component for table header
export const TableHeaderSkeleton = ({ columns = 4 }) => (
  <TableHeader>
    <TableRow>
      {Array.from({ length: columns }).map((_, index) => (
        <TableHead key={index} className="py-4">
          <Skeleton className="h-4 w-20" />
        </TableHead>
      ))}
    </TableRow>
  </TableHeader>
);

// Main table skeleton component
export const TableSkeleton = ({ rows = 5, columns = 4, showHeader = true }) => (
  <div className="rounded-md border">
    <Table>
      {showHeader && <TableHeaderSkeleton columns={columns} />}
      <TableBody>
        {Array.from({ length: rows }).map((_, index) => (
          <TableRowSkeleton key={index} columns={columns} />
        ))}
      </TableBody>
    </Table>
  </div>
);