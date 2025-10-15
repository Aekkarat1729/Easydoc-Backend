import React from 'react';

interface TextareaStyleProps {
  label?: string;
  value: string;
  setValue: (value: string) => void;
  className?: string;
  placeholder?: string;
  rows?: number;
  isRequired?: boolean;
}

const TextareaStyle: React.FC<TextareaStyleProps> = ({
  label,
  value,
  setValue,
  className = 'w-full',
  placeholder = '',
  rows = 4,
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
      <textarea
        value={value ?? ''}
        placeholder={placeholder}
        rows={rows}
        className={`custom-input-style rounded-md ring-custom-color-main ${className}`}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
};

export default TextareaStyle;