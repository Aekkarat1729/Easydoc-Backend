import { Skeleton } from "antd";

type TableSkeletonProps = {
  rows?: number;       
  columns?: { key: string; title: string }[];   
  className?: string;
};

const TableSkeleton = ({ rows = 5, columns = [], className }: TableSkeletonProps) => {
  return (
    <div className={`overflow-x-auto border-custom ${className}`}>
      {/* Header (ใช้ title จริง ไม่ต้อง skeleton) */}
      <div className="grid bg-gray-50" style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}>
        {columns.map((col) => (
          <div
            key={col.key}
            className="p-3 border-b font-medium text-gray-700 text-sm"
            style={{ borderColor: "var(--border-gray-custiom)" }}
          >
            {col.title}
          </div>
        ))}
      </div>

      {/* Body skeleton */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="grid border-b"
          style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)`, borderColor: "var(--border-gray-custiom)" }}
        >
          {columns.map((col) => (
            <div key={col.key} className="p-3">
              <Skeleton.Input active size="small" className="w-full" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default TableSkeleton;