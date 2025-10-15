export const formatThaiDateTime = (iso: string) => {
  if (!iso) return "-";

  const date = new Date(iso);

  const day = date.getDate();
  const monthNames = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();

  const pad = (n: number) => n.toString().padStart(2, "0");
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${day} ${month} ${year}, ${hours}:${minutes}`;
};