import { HourglassOutlined, CheckCircleOutlined, MailOutlined } from "@ant-design/icons";
import { SentDocStatus } from "@/const/enum";
import { StatusCode } from "@/const/enum";

type StatusProps = {
  code: number;
};

const statusMap: Record<
  number,
  { label: SentDocStatus; icon: React.ReactNode; className: string }
> = {
  [StatusCode.SENT_REPLY]: {
    label: SentDocStatus.SENT_REPLY,
    icon: <CheckCircleOutlined />,
    className: "text-green-600",
  },
  [StatusCode.ALREADY_SENT]: {
    label: SentDocStatus.ALREADY_SENT,
    icon: <MailOutlined />,
    className: "text-green-600",
  },
  [StatusCode.WAITING_REPLY]: {
    label: SentDocStatus.WAITING_REPLY,
    icon: <HourglassOutlined />,
    className: "text-yellow-600",
  },
  [StatusCode.SENT_FORWARD]: {
    label: SentDocStatus.SENT_FORWARD,
    icon: <CheckCircleOutlined />,
    className: "text-green-600",
  },
};

export const SentDocStatusTag = ({ code }: StatusProps) => {
  const status = statusMap[code];

  if (!status) return null;

  return (
    <span className={`${status.className} flex items-center gap-1`}>
      {status.icon} {status.label}
    </span>
  );
};