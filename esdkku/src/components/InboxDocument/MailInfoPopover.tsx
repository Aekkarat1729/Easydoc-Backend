import React from "react";
import { Popover } from "antd";
import { DownOutlined } from "@ant-design/icons";

type UserInfo = {
  label: string;
  value: string;
};

type MailInfoPopoverProps = {
  senderName: string;
  senderEmail: string;
  receiverName?: string;
  receiverEmail?: string;
  sentAt?: string;
  subject?: string;
  title: string
};

const MailInfoPopover: React.FC<MailInfoPopoverProps> = ({
  senderName,
  senderEmail,
  receiverName,
  receiverEmail,
  sentAt,
  subject,
  title
}) => {
  const infoList: UserInfo[] = [
    { label: "จาก", value: `${senderName} <${senderEmail}>` },
    { label: "ถึง", value: `${receiverName || "-"} <${receiverEmail || "-"}>` },
    { label: "วันที่ส่ง", value: sentAt || "-" },
    { label: "เรื่อง", value: subject || "-" },
  ];

  return (
    <Popover
      placement="bottomLeft"
      trigger="click"
      content={
        <div className="grid grid-cols-[max-content_1fr] gap-x-2 text-xs">
          {infoList.map((item, idx) => (
            <React.Fragment key={idx}>
              <div className=" text-gray-600 text-right">{item.label}:</div>
              <div className="text-gray-800 ml-2">{item.value}</div>
            </React.Fragment>
          ))}
        </div>
      }
      className="text-start cursor-pointer"
    >
      <button className="flex items-center gap-1 text-gray-500 text-xs hover:text-gray-700">
        ถึง {title}
        <DownOutlined className="text-[10px]" />
      </button>
    </Popover>
  );
};

export default MailInfoPopover;