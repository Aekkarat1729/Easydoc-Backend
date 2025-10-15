"use client";

import React from "react";
import { Table, TableProps } from "antd";
import type { TablePaginationConfig } from "antd";
import TableSkeleton from "../Skeleton/TableSkeleton";
import { useSearchParams,useRouter, usePathname } from "next/navigation";
import { updateQuery } from "@/utils/updateQuety";

interface TableStyleProps<T> {
  columns: TableProps<T>["columns"];
  dataSource: T[];
  loading?: boolean; 
  pagination?: boolean | TablePaginationConfig;
  onChange?: TableProps<T>["onChange"];
  onRow?: TableProps<T>["onRow"];
  rowKey?: string;
  className?: string;
  skeletonRows?: number; 
}

function TableStyle<T extends object>({
  columns,
  dataSource,
  loading = false,
  pagination = true,
  onChange,
  rowKey = "id",
  className = "cursor-default",
  onRow,
  skeletonRows = 15,
}: TableStyleProps<T>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const currentPage = Number(searchParams.get("page") || 1);

  const handleTableChange: TableProps<T>["onChange"] = (
    paginationConfig,
    filters,
    sorter,
    extra
  ) => {
    const page = paginationConfig.current || 1;
    updateQuery(router, pathname, searchParams, { page: page.toString() });

    if (onChange) {
      onChange(paginationConfig, filters, sorter, extra);
    }
  };

  const wrappedColumns = columns?.map((col) => {
    if (!col) return col;

    return {
      ...col,
      render: (text: unknown, record: T, index: number) => {
        const content = col.render
          ? (col.render(text, record, index) as React.ReactNode)
          : (text as React.ReactNode);

        const displayContent =
          content === null || content === undefined || content === "" ? "-" : content;

        return <span className="block max-w-56 truncate">{displayContent}</span>;
      },
    };
  });

  // 👇 ถ้า loading ให้แสดง skeleton
  if (loading) {
    return <TableSkeleton rows={skeletonRows} columns={columns?.map(item => {
      return { key: item?.key?.toString() || '', title: item?.title?.toString() || '' }
    })} />
  }

  return (
    <div className={`${className} overflow-x-auto`}>
      <div className="min-w-[1200px] ">
        <Table<T>
          columns={wrappedColumns}
          dataSource={dataSource}
          loading={false}
          pagination={
            pagination === true
              ? { pageSize: 5, current: currentPage }
              : { ...pagination, current: currentPage }
          }
          onChange={handleTableChange}
          onRow={onRow}
          rowKey={rowKey}
          bordered={false}
          size="middle"
          className="border-custom overflow-x-auto"
        />
      </div>
    </div>
  );
}

export default TableStyle;