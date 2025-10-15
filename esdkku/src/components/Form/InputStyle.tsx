import React from 'react';

interface InputStyleProps {
  label?: string;
  type: string;
  value: string;
  setValue: (value: string) => void;
  className?: string;
  placeholder?: string;
  isRequired?: boolean;
}

const InputStyle: React.FC<InputStyleProps> = ({
  label,
  type,
  value,
  setValue,
  className = 'w-full',
  placeholder = '',
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
      <input
        type={type}
        value={value ?? ''}
        placeholder={placeholder}
        className={` custom-input-style rounded-md ring-custom-color-main ${className}`}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
};

export default InputStyle;