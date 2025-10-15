import { SentDocStatus } from "@/const/enum";
import { FilterList } from "@/const/enum";
import { StatusCode } from "@/const/enum";

export const filterListOfficerMail = {
  [FilterList.STATUS]: [
    { key: StatusCode.WAITING_REPLY, value: SentDocStatus.WAITING_REPLY },
    { key: StatusCode.SENT_REPLY, value: SentDocStatus.SENT_REPLY },
  ],
};

export const filterListUserMail = {
  [FilterList.STATUS]: [
    { key: StatusCode.WAITING_REPLY, value: SentDocStatus.WAITING_REPLY },
    { key: StatusCode.SENT_REPLY, value: SentDocStatus.SENT_REPLY },
    { key: StatusCode.SENT_FORWARD, value: SentDocStatus.SENT_FORWARD },
  ],
};