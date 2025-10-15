'use client';

import React, { useState } from 'react';
import TableStyle from '@/components/Table/TableStyle';
import { useRouter } from 'next/navigation';
import {
  CalendarOutlined,
  FileTextOutlined,
  TagOutlined,
} from '@ant-design/icons';

//store
import { useDocumentStore } from '@/stores/useDocumentStore';
import SearchFilterBar from '@/components/Filter/SearchFilterBar';
import { SentDocStatusTag } from '@/components/Tag/SentDocStatusTag';

import { DocumentRow } from '@/types/documentType';

//config
import { getDocumentNameById } from '@/utils/document';
import ProfileDisplay from '@/components/Display/ProfileDisplay/ProfileDisplay';
import { PATHS } from '@/const/paths';

function InboxPage() {

  const router = useRouter();

  //store 
  const { documents } = useDocumentStore();

  //filter 
  const [optionsFilter, setOptionsFilter] = useState<DocumentRow[] | null>(documents);

  const columns = [
    {
      title: 'อีเมลผู้ส่ง',
      key: 'sender',
      render: (_: unknown, record: DocumentRow) => (
        <ProfileDisplay profileImage={record.profileImage || ''} name={`${record.firstName} ${record.lastName}`} email={record.email} />
      ),
    },
    {
      title: 'หมายเลขเอกสาร',
      dataIndex: 'number',
      key: 'number',
      render: (text: string) => (
        <div className="flex items-center gap-2 text-custom-color-main font-medium">
          <TagOutlined />
          {text}
        </div>
      ),
    },
    {
      title: 'ชื่อเรื่อง',
      dataIndex: 'title',
      key: 'title',
      render: (title: string) => (
        <div className="flex items-center gap-2 text-gray-700 custom-text-ellipsis">
          <FileTextOutlined />
          <p className='custom-text-ellipsis'>{title}</p>
        </div>
      ),
    },
    {
      title: 'รายละเอียด',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'ประเภทเอกสาร',
      dataIndex: 'type',
      key: 'type',
      render: (type: number) => (
        <p>{getDocumentNameById(type)}</p>
      ),
    },
    {
      title: 'วันที่ได้รับ',
      dataIndex: 'date',
      key: 'date',
      render: (_: unknown, record: DocumentRow) => (
        <div className="flex items-center gap-2 text-gray-600 custom-text-ellipsis">
          <CalendarOutlined />
          <p className='custom-text-ellipsis'>{record.date}</p>
        </div>
      ),
    },
    {
      title: 'สถานะ',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <SentDocStatusTag code={parseInt(status)} />,
    },
    {
      title: 'หมายเหตุ',
      dataIndex: 'note',
      key: 'note',

      render: (_: unknown, record: DocumentRow) => (
        <div className="custom-text-ellipsis">
          <p className='custom-text-ellipsis'>{record.note}</p>
        </div>
      ),
    },
  ];

  return (
    <div className="">
      <SearchFilterBar
        className=''
        placeholder='ค้นหาชื่อผู้ส่ง, ชื่อเรื่อง'
        dataValues={documents || []}
        setNewData={setOptionsFilter}
      />

      <div className='mt-5'>
        <TableStyle<DocumentRow>
          columns={columns}
          dataSource={optionsFilter ? optionsFilter : []}
          pagination={{ pageSize: 10 }}
          loading={documents ? false : true}
          onRow={(record) => ({
            onClick: () => {
              router.push(`/${PATHS.ED}/${PATHS.INBOX}/doc?id=${record.id}`);
            },
          })}
          className='cursor-pointer'
        />
      </div>
    </div>
  );
}

export default InboxPage;