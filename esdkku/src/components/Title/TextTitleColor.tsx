import React from 'react'

interface TextTitleProps {
    text: string,
    className?: string
}
function TextTitle({text, className = "mb-6 text-center"}: TextTitleProps) {
    return (
        <p className={`${className} text-2xl font-medium text-custom-color-main`}>{text}</p>
    )
}

export default TextTitle
