import Image from 'next/image'
import React from 'react'

interface LogoProps {
    className?: string
}
function Logo({ className = 'w-64' }: LogoProps) {
    return (
        <Image
            src={"/image/logo-full.png"}
            width={1000}
            height={1000}
            alt="logo"
            priority
            className={`${className}`}
        />
    )
}

export default Logo
