'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftOutlined } from '@ant-design/icons';

interface BackButtonProps {
  label?: string;
  className?: string;
  href?: string;
}

const BtnBack: React.FC<BackButtonProps> = ({ label = 'ย้อนกลับ', className = '', href = '' }) => {
  const router = useRouter();

  return (
    <button
      onClick={() => href ? router.push(href): router.back()}
      className={`mb-6 flex items-center justify-start gap-2 cursor-pointer transition border px-3 py-1.5 rounded-md border-gray-300 bg-gray-100 hover:bg-gray-200 text-sm ${className}`}
    >
      <ArrowLeftOutlined />
      <span>{label}</span>
    </button>
  );
};

export default BtnBack;