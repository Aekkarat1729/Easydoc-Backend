import React from 'react';

interface BtnStyleProps {
  text: string;
  icon?: React.ElementType; // รับ Component เช่น DownloadOutlined
  onClick?: (e: React.MouseEvent<HTMLButtonElement | HTMLDivElement>) => void;
  className?: string;
  bgBtn?: string;
  btn?: boolean;
  type?: "submit" | "reset" | "button";
}

const BtnStyle: React.FC<BtnStyleProps> = ({
  text,
  icon: Icon, // ตั้งชื่อไว้ใช้ render
  onClick,
  className = 'mt-5 w-full',
  bgBtn = 'bg-custom-color-main',
  btn = false,
  type = 'submit',
}) => {
  const commonClass = ` py-2 px-4 text-md rounded-md font-medium ${bgBtn} ${className} text-center flex items-center justify-center gap-2 text-white`;

  const content = (
    <>
      {Icon && <Icon />}
      {text}
    </>
  );

  return btn ? (
    <button
      type={type}
      onClick={onClick}
      className={`${commonClass} cursor-pointer`}
    >
      {content}
    </button>
  ) : (
    <div
      onClick={onClick}
      className={`${commonClass} cursor-pointer`}
    >
      {content}
    </div>
  );
};

export default BtnStyle;