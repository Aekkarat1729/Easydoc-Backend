'use client'

import React, { useEffect } from 'react'
import { List } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import FileIcon from '@/components/Display/FileIcon'
import BtnStyle from '@/components/Form/Btn/BtnStyle'

import { useDefaultFile } from '@/stores/useDefaultFile'
import DefaultFileSkeleton from '@/components/Skeleton/DefaultFileSkeleton'
import Link from 'next/link'

function Page() {

  const { defaultFile, fetchDefaultFile } = useDefaultFile()

  useEffect(() => {
    console.log('📄 Download page mounted, fetching default files...');
    fetchDefaultFile();
  }, [fetchDefaultFile]);

  return (
    <div className="border-custom p-5 mx-auto rounded shadow bg-white">
      <h2 className="text-2xl font-semibold text-gray-800 mb-5">ไฟล์เริ่มต้น</h2>
      {defaultFile === null ? (
        <DefaultFileSkeleton count={10} />
      ) : defaultFile.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-500 text-lg">ไม่พบไฟล์เริ่มต้น</p>
          <p className="text-gray-400 text-sm mt-2">กรุณาติดต่อผู้ดูแลระบบเพื่อเพิ่มไฟล์เริ่มต้น</p>
        </div>
      ) : (
        <List
          className="mt-3"
          itemLayout="horizontal"
          dataSource={defaultFile}
          renderItem={(item) => {
            const ext = item.fileType || ''
            return (
              <List.Item
                className="hover:bg-gray-50 rounded-md px-2"
                actions={[
                  <a href={item.url} download key="download">
                    <BtnStyle text='ดาวน์โหลด' icon={DownloadOutlined} />
                  </a>,
                ]}
              >
                <List.Item.Meta
                  className='cursor-pointer'
                  avatar={<FileIcon ext={ext} />}
                  title={
                    <Link href={item.url} target='_blank' className="text-base font-medium text-gray-800">
                      {item.fileName}
                    </Link>
                  }
                  description={
                    <div className="text-sm text-gray-500">
                      <div>ขนาด: {item.size}</div>
                      <div>ประเภท: {item.fileType}</div>
                    </div>
                  }
                />
              </List.Item>
            )
          }}
        />
      )}
    </div>
  )
}

export default Page