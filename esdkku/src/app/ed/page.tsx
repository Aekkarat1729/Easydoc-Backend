// "use client";

// import React, { useState } from 'react';
// import SearchFilterBar from '@/components/Filter/SearchFilterBar';
// import TableStyle from '@/components/Table/TableStyle';
// import {
//   FileTextOutlined,
//   MailOutlined,
//   ClockCircleOutlined,
//   CalendarOutlined,
//   TagOutlined,
// } from '@ant-design/icons';

// //store
// import { DocumentRow, useDocumentStore } from '@/stores/useDocumentStore';
// import { DocumentStatus } from '@/const/enum';
// import StatusTag from '@/components/Tag/StatusTag';
// import { ColumnType } from 'antd/es/table';
// import { Tooltip } from 'antd';

// function Page() {
//   const [searchTerm, setSearchTerm] = useState('');
//   const [filterValues, setFilterValues] = useState<Record<string, string | number>>({});

//   //store
//   const { documents } = useDocumentStore()

//   // filter list
//   const filterOptions = {
//     สถานะเอกสาร: [
//       { key: DocumentStatus.WAITING_REPLY, value: DocumentStatus.WAITING_REPLY },
//       { key: DocumentStatus.REPLIED, value: DocumentStatus.REPLIED },
//       { key: DocumentStatus.SENT_REPLY, value: DocumentStatus.SENT_REPLY },
//       { key: DocumentStatus.NOT_REPLIED, value: DocumentStatus.NOT_REPLIED },
//     ],
//   };

//   const handleFilterChange = (key: string, value: string | number) => {
//     setFilterValues(prev => ({ ...prev, [key]: value }));
//   };

//   const columns = [
//     {
//       title: 'หมายเลขเอกสาร',
//       dataIndex: 'id',
//       key: 'id',
//       render: (text: string) => (
//         <Tooltip title={text} className="flex items-center gap-2 font-medium text-custom-color-main">
//           <TagOutlined />
//           {text}
//         </Tooltip>
//       ),
//     },
//     {
//       title: 'ชื่อเรื่อง',
//       dataIndex: 'title',
//       key: 'title',
//       render: (text: string) => (
//         <Tooltip title={text} className="flex items-center gap-2">
//           <FileTextOutlined className="text-blue-500" />
//           <span>{text}</span>
//         </Tooltip>
//       ),
//     },
//     {
//       title: 'ประเภทเอกสาร',
//       dataIndex: 'type',
//       key: 'type',
//     },
//     {
//       title: 'อีเมล',
//       dataIndex: 'email',
//       key: 'email',
//       render: (text: string) => (
//         <Tooltip title={text} className="flex items-center gap-2 text-gray-600">
//           <MailOutlined />
//           <span>{text}</span>
//         </Tooltip>
//       ),
//     },
//     {
//       title: 'วันที่',
//       dataIndex: 'date',
//       key: 'date',
//       render: (text: string) => (
//         <Tooltip title={text} className="flex items-center gap-2 text-gray-600">
//           <CalendarOutlined />
//           {text}
//         </Tooltip>
//       ),
//     },
//     {
//       title: 'เวลา',
//       dataIndex: 'time',
//       key: 'time',
//       render: (text: string) => (
//         <Tooltip title={text} className="flex items-center gap-2 text-gray-600">
//           <ClockCircleOutlined />
//           {text}
//         </Tooltip>
//       ),
//     },
//     {
//       title: 'สถานะ',
//       dataIndex: 'status',
//       key: 'status',
//       render: (status: DocumentStatus) => <StatusTag status={status} />,
//     }, ,
//   ];

//   return (
//     <div>
//       <SearchFilterBar
//         filterOptions={filterOptions}
//         setSearch={setSearchTerm}
//         searchValue={searchTerm}
//         onFilterChange={handleFilterChange}
//         filterValues={filterValues}
//         className=""
//       />
//       <div className="mt-5">
//         <TableStyle<DocumentRow>
//           columns={columns.filter(Boolean) as ColumnType<DocumentRow>[]}
//           dataSource={documents}
//           pagination={{ pageSize: 5 }}
//         />
//       </div>
//     </div>
//   );
// }

// export default Page;

"use client";

import React from "react";
import { Card, Col, Row, Table, Tag } from "antd";
import { Pie } from "@ant-design/plots";
import {
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ForwardOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { PATHS } from "@/const/paths";

const Dashboard = () => {
  const documentStats = [
    { title: "รอตอบกลับ", count: 5, icon: <ClockCircleOutlined />, color: "bg-yellow-100 text-yellow-600" },
    { title: "ตอบแล้ว", count: 12, icon: <CheckCircleOutlined />, color: "bg-green-100 text-green-600" },
    { title: "ส่งต่อแล้ว", count: 3, icon: <ForwardOutlined />, color: "bg-blue-100 text-blue-600" },
    { title: "รอตอบจากผู้อื่น", count: 2, icon: <FileTextOutlined />, color: "bg-gray-100 text-gray-600" },
  ];

  const recentDocs = [
    { key: 1, title: "ขอใช้พื้นที่เซิฟเวอร์", from: "เจ้าหน้าที่ A", status: "รอตอบกลับ", date: "27 ก.ค. 2025" },
    { key: 2, title: "ขอสิทธิ์เข้าถึงระบบ", from: "เจ้าหน้าที่ B", status: "ส่งต่อแล้ว", date: "25 ก.ค. 2025" },
    { key: 3, title: "ขออนุมัติรายงาน", from: "เจ้าหน้าที่ C", status: "ตอบแล้ว", date: "24 ก.ค. 2025" },
  ];

  const columns = [
    { title: "หัวข้อเอกสาร", dataIndex: "title" },
    { title: "จาก", dataIndex: "from" },
    {
      title: "สถานะ", dataIndex: "status", render: (status: string) => {
        const color =
          status === "รอตอบกลับ" ? "orange" :
            status === "ตอบแล้ว" ? "green" :
              status === "ส่งต่อแล้ว" ? "blue" : "gray";
        return <Tag color={color}>{status}</Tag>;
      }
    },
    { title: "วันที่", dataIndex: "date" },
  ];

  const data = [
    { type: "รอตอบกลับ", value: 5 },
    { type: "ตอบแล้ว", value: 12 },
    { type: "ส่งต่อแล้ว", value: 3 },
    { type: "รอตอบจากผู้อื่น", value: 2 },
  ];

  const total = data.reduce((sum, d) => sum + d.value, 0);

  const pieConfig = {
    data,
    angleField: "value",
    colorField: "type",
    radius: 1,
    label: {
      text: (datum: { value: number }) => `${((datum.value / total) * 100).toFixed(1)}%`,
      style: { fontSize: 14 },
    },

    legend: { position: "bottom" },
  };

  return (
    <div className="space-y-6">
      {/* สรุปสถานะ */}
      <Row gutter={16}>
        {documentStats.map((stat, idx) => (
          <Col span={6} key={idx}>
            <Card className="shadow-md">
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-full ${stat.color}`}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-gray-500">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.count}</p>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* กราฟ */}
      <Card title="สัดส่วนเอกสาร">
        <Pie {...pieConfig} />
      </Card>

      {/* เอกสารล่าสุด */}
      <Card
        title="เอกสารล่าสุด"
        extra={<Link href={`/${PATHS.ED}/${PATHS.INBOX}`} type="link" >ดูทั้งหมด</Link>}
        style={{ marginTop: 16 }}
      >
        <Table dataSource={recentDocs} columns={columns} pagination={false} />
      </Card>
    </div>
  );
};

export default Dashboard;