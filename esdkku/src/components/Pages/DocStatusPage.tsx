'use client';

import React, { useState } from 'react';
import TableStyle from '@/components/Table/TableStyle';
import {
  CalendarOutlined,
  FileTextOutlined,
  TagOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';

//store
import { useDocumentStore } from '@/stores/useDocumentStore';
import SearchFilterBar from '@/components/Filter/SearchFilterBar';
import BtnStyle from '@/components/Form/Btn/BtnStyle';
import { SentDocStatusTag } from '@/components/Tag/SentDocStatusTag';

import { DocumentRow } from '@/types/documentType';

//config
import { getDocumentNameById } from '@/utils/document';
import ProfileDisplay from '@/components/Display/ProfileDisplay/ProfileDisplay';
import { PATHS } from '@/const/paths';

function DocStatusPage() {

  //store 
  const { officerMail } = useDocumentStore();

  //router
  const router = useRouter();

  //filter
  const [optionsFilter, setOptionsFilter] = useState<DocumentRow[] | null>(officerMail);

  const columns = [
    {
      title: 'ผู้รับ',
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
        <div className="flex items-center gap-2 text-gray-700">
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
      title: 'วันที่ส่ง',
      dataIndex: 'date',
      key: 'date',
      render: (_: unknown, record: DocumentRow) => (
        <div className="flex items-center gap-2 text-gray-600">
          <CalendarOutlined />
          {record.date}
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
        <div className="">
          {record.note}
        </div>
      ),
    },

  ];

  return (
    <div className="">
      <div className='mb-3 flex justify-end'>
        <BtnStyle
          text='ส่งเอกสาร'
          onClick={() => {
            router.push(`/${PATHS.ED}/${PATHS.SEND_DOCUMENT}`);
          }}
          className='w-full lg:w-32 '
        />
      </div>
        <SearchFilterBar
          className=''
          placeholder='ค้นหาชื่อผู้รับ, ชื่อเรื่อง'
          dataValues={officerMail || []}
          setNewData={setOptionsFilter}
        />

      <div className='mt-5'>
        <TableStyle<DocumentRow>
          columns={columns}
          dataSource={optionsFilter ? optionsFilter : []}
          loading={officerMail ? false : true}
          pagination={{ pageSize: 2 }}
          onRow={(record) => ({
            onClick: () => {
              router.push(`/${PATHS.ED}/${PATHS.DOCUMENT_STATUS}/track?id=${record.id}`);
            },
          })}
          className='cursor-pointer'
        />
      </div>
    </div>
  );
}

export default DocStatusPage;