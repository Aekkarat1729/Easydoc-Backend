// components/Form/SelectStyle.tsx
import React from 'react';

interface Option {
  key: string | number;
  value: string;
}

interface SelectStyleProps {
  label?: string;
  options: Option[];
  value?: string | number;
  onChange: (value: string | number) => void;
  className?: string;
  placeholder?: string;
  isRequired?: boolean;
}

const SelectStyle: React.FC<SelectStyleProps> = ({
  label,
  options,
  value,
  onChange,
  className = 'w-full',
  placeholder = 'เลือก...',
  isRequired = false,
}) => {
  return (
    <div className="">
      {label && (
        <label className="block text-gray-700 font-medium mb-1">{label}&nbsp;
          {isRequired && (
            <span className='text-red-400 text-xs'>*</span>
          )}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`custom-input-style ring-custom-color-main ${className} cursor-pointer`}
      >
        <option value="">{placeholder}</option>
        {options.map((item) => (
          <option key={item.key} value={item.key}>
            {item.value}
          </option>
        ))}
      </select>
    </div>
  );
};

export default SelectStyle;