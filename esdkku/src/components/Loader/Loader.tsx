"use client"

import React from 'react'
import { PulseLoader } from 'react-spinners'
import { appStore } from '@/stores/appStore'

function Loader() {

    const { loading } = appStore()
    if (loading) {
        return (
            <div className='z-[2000] border fixed flex justify-center items-center top-0 left-0 w-full h-full '>
                <PulseLoader
                    color="var(--mainColor)" 
                    size={12}                
                    margin={2}          
                />
            </div>
        )
    } else {
        return null
    }
}

export default Loader
