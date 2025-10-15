import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { menuItem } from '@/config/menu'
import { PATHS, ROLE_HOME_PATH } from './const/paths'

const roleDefaultPath: Record<number, string> = {
    1: ROLE_HOME_PATH[1],
    2: ROLE_HOME_PATH[2],
    3: ROLE_HOME_PATH[3]
}

export function middleware(req: NextRequest) {
    const cookieRaw = req.cookies.get('esd-kku')?.value
    let token: string | null = null
    let role: number | null = null

    if (cookieRaw) {
        try {
            const decoded = decodeURIComponent(cookieRaw)
            const parsed = JSON.parse(decoded)
            token = parsed.token
            role = parsed.role
        } catch (e) {
            console.error('Invalid cookie format:', e)
        }
    }

    const url = req.nextUrl
    const pathname = url.pathname

    // ยังไม่ login
    if (!token) {
        if (pathname !== '/') {
            return NextResponse.redirect(new URL('/', req.url))
        }
        return NextResponse.next()
    }

    // login แล้ว
    if (token && process.env.NEXT_PUBLIC_IS_PRODUCTION !== 'false') {
        // อยู่หน้า root → redirect ไป default page ของ role
        if (pathname === '/') {
            const target = roleDefaultPath[role!] || PATHS.ED
            return NextResponse.redirect(new URL(target, req.url))
        }

        // ตรวจสอบสิทธิ์เข้าถึงหน้า /ed/*
        if (pathname.startsWith(`/${PATHS.ED}`)) {
            const regex = new RegExp(`^/${PATHS.ED}/?`);
            const menuPath = pathname.replace(regex, '');
            const allowedItem = menuItem.find(mi => mi.path === menuPath);

            if (allowedItem && allowedItem.roles.length > 0 && !allowedItem.roles.includes(role!)) {
                const target = roleDefaultPath[role!] || `/${PATHS.ED}`
                return NextResponse.redirect(new URL(target, req.url))
            }
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/', `/ed/:path*`],
}