import React from 'react'

interface TextErrorProps {
  text: string
  className?: string
}
function TextError({ text, className }: TextErrorProps) {
  return (
    <p className={`text-red-400 ${className} text-xs`}>* {text}</p>
  )
}

export default TextError
