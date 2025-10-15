import React from "react"
import FileIcon from "./FileIcon"
import Link from "next/link"
import { CloseOutlined } from "@ant-design/icons"

type Props = {
    files: File[] | undefined
    className?: string
    removable?: boolean
    onRemove?: (index: number) => void
}

const formatSize = (size: number) => {
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

const FileList = ({ files, className, removable = false, onRemove }: Props) => {
    return (
        <div className={`${className} flex flex-col gap-2`}>
            {files?.map((file, index) => {
                const ext = file.name.split(".").pop() || ""
                const size = formatSize(file.size)

                // ตั้งค่าสีพื้นหลังและสีตัวอักษรให้สอดคล้องกับไฟล์
                let bgColor = "bg-gray-100"
                let textColor = "text-gray-700"

                if (ext.toLowerCase() === "pdf") {
                    bgColor = "bg-red-50"
                    textColor = "text-red-600"
                }
                if (["xlsx", "xls"].includes(ext.toLowerCase())) {
                    bgColor = "bg-green-50"
                    textColor = "text-green-600"
                }
                if (["jpg", "jpeg", "png", "gif"].includes(ext.toLowerCase())) {
                    bgColor = "bg-blue-50"
                    textColor = "text-blue-600"
                }
                if (["doc", "docx"].includes(ext.toLowerCase())) {
                    bgColor = "bg-indigo-50"
                    textColor = "text-indigo-600"
                }

                const content = (
                    <>
                        <div className="flex items-center gap-2">
                            <FileIcon ext={ext} />
                            <span className="truncate text-sm font-medium">{file.name}</span>
                        </div>
                        <span className="text-xs">{size}</span>
                    </>
                )

                const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
                    "url" in file && file.url ? (
                        <Link
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex flex-1 items-center justify-between rounded-md border border-gray-200 p-2 shadow-sm hover:shadow-md transition ${bgColor} ${textColor}`}
                        >
                            {children}
                        </Link>
                    ) : (
                        <div
                            className={`flex flex-1 items-center justify-between rounded-md border border-gray-200 p-2 shadow-sm ${bgColor} ${textColor}`}
                        >
                            {children}
                        </div>
                    )

                return (
                    <div key={index} className="flex items-center gap-2">
                        <Wrapper>{content}</Wrapper>

                        {removable && (
                            <button
                                type="button"
                                onClick={() => onRemove?.(index)}
                                className="ml-2 rounded-full p-1 hover:bg-gray-200"
                            >
                                <CloseOutlined className="text-gray-500" />
                            </button>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

export default FileList