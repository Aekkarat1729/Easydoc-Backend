import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'

// สร้าง instance ของ Axios
const api: AxiosInstance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000', // ตั้งค่า base URL
    headers: {
        'Content-Type': 'application/json',
    },
})

// เพิ่ม interceptor เพื่อใส่ token อัตโนมัติ
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const local = localStorage.getItem('esd-kku')
        if (local && config.headers) {
            try {
                const parsed = JSON.parse(local);
                if (parsed.token) {
                    config.headers['Authorization'] = `Bearer ${parsed.token}`;
                }
            } catch (e) {
                console.error("Invalid token format in localStorage", e);
            }
        }
        return config
    },
    (error) => Promise.reject(error)
)

// POST
export const post = <T, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>
) => api.post<T>(url, data, config).then((res: AxiosResponse<T>) => res.data)

// PATCH
export const patch = <T, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>
) => api.patch<T>(url, data, config).then((res: AxiosResponse<T>) => res.data)

// PUT
export const put = <T, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>
) => api.put<T>(url, data, config).then((res: AxiosResponse<T>) => res.data)

// GET
export const get = <T>(url: string, config?: AxiosRequestConfig) =>
    api.get<T>(url, config).then((res: AxiosResponse<T>) => res.data)

// DELETE
export const del = <T>(url: string, config?: AxiosRequestConfig) =>
    api.delete<T>(url, config).then((res: AxiosResponse<T>) => res.data)

// ส่ง default instance เผื่ออยากใช้งานตรงๆ
export default api