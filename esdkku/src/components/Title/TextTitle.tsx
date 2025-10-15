import React from 'react'

interface TextTitleSubProps {
    title: string;
    subTitle?: string;
}

function TextTitleSub({title, subTitle}: TextTitleSubProps) {
    return (
        <div className='flex flex-col gap-1'>
            <p className='font-bold text-lg'>{title}</p>
            <p className='text-gray-400'>{subTitle}</p>
        </div>
    )
}

export default TextTitleSub
