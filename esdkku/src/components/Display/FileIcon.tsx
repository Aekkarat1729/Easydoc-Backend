import React from 'react'
import {
  FilePdfOutlined,
  FileExcelOutlined,
  FileImageOutlined,
  FileWordOutlined,
  FileOutlined,
} from '@ant-design/icons'

type Props = {
  ext: string
}

const FileIcon = ({ ext }: Props) => {
  const type = ext.toLowerCase()

  if (type === 'pdf') {
    return <FilePdfOutlined className="text-red-500 text-xl mr-3" />
  }

  if (['xlsx', 'xls'].includes(type)) {
    return <FileExcelOutlined className="text-green-500 text-xl mr-3" />
  }

  if (['jpg', 'jpeg', 'png', 'gif'].includes(type)) {
    return <FileImageOutlined className="text-blue-500 text-xl mr-3" />
  }

  if (['doc', 'docx'].includes(type)) {
    return <FileWordOutlined className="text-blue-600 text-xl mr-3" />
  }

  return <FileOutlined className="text-gray-500 text-xl mr-3" />
}

export default FileIcon