import { UserOutlined } from '@ant-design/icons'
import { Avatar } from 'antd'
import React from 'react'

interface ProfileDisplayProps{
    profileImage: string,
    name: string,
    email: string
}
function ProfileDisplay({profileImage, name, email} : ProfileDisplayProps) {
    return (
        <div className='flex justify-start gap-2 items-center '>
            <Avatar size={40} src={profileImage || null} icon={<UserOutlined />} 
            className='flex-shrink-0'
            />
            <div className='flex flex-col items-start custom-text-ellipsis'>
                <p className='text-gray-800 font-medium custom-text-ellipsis w-full flex justify-start'>{name}</p>
                <p className='text-gray-500 text-xs custom-text-ellipsis w-full flex justify-start'>{email}</p>
            </div>
        </div>
    )
}

export default ProfileDisplay
