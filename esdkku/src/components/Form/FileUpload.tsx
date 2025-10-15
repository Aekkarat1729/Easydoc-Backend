import React, { ChangeEvent } from 'react';

interface FileUploadProps {
    label?: string;
    onAddFile: (file: File) => void;
    accept?: string;
    className?: string;
    isRequired?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({
    label = 'แนบไฟล์',
    onAddFile,
    accept = '.pdf,.doc,.docx,.jpg,.png',
    className = 'bg-gray-200 ',
    isRequired = false,
}) => {
    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onAddFile(file);
        }
        e.target.value = '';
    };

    return (
        <div className={` `}>
            {label && (
                <label className="block text-gray-700 font-medium mb-1">{label}&nbsp;
                    {isRequired && (
                        <span className='text-red-400 text-xs'>*</span>
                    )}
                </label>

            )}
            <input
                type="file"
                accept={accept}
                onChange={handleFileChange}
                className={`max-w-56 ${className}  px-4 py-2 rounded-md cursor-pointer shadow`}
            />
        </div>
    );
};

export default FileUpload;