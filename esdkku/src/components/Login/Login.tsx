"use client"

import { useState } from "react";
import InputStyle from "../Form/InputStyle";
import BtnStyle from "../Form/Btn/BtnStyle";
import { t } from "@/i18n";
// import Link from "next/link";
import TextTitleColor from "../Title/TextTitleColor";
import FrameworkLogin from "./FrameworkLogin";

//store
import { useUserStore } from "@/stores/useUserStore";
import { useRouter } from "next/navigation";
import TextError from "../Text/TextError";
import { PATHS, ROLE_HOME_PATH } from "@/const/paths";

export default function Login() {

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');

  const router = useRouter()

  //store
  const { login } = useUserStore()

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {

      const userData = await login(email, password)
      // mapping role → default path
      const roleDefaultPath: Record<number, string> = {
        1: ROLE_HOME_PATH[1],
        2: ROLE_HOME_PATH[2],
        3: ROLE_HOME_PATH[3]
      }
      setError('')
      // redirect ตาม role
      router.replace(roleDefaultPath[userData.role || 0] || `/${PATHS.ED}`)
    } catch (error) {
      console.error("Login failed:", error);
      let message = 'เข้าสู่ระบบไม่สำเร็จ';
      if (error instanceof Error) {
        message = error.message;
      }
      setError(message);
    }
  }

  return (
    <FrameworkLogin>
      <TextTitleColor text={t('login.title')} />
      <form onSubmit={handleLogin}>
        <div className="flex flex-col gap-4 mb-2">
          <InputStyle
            label={t('login.email')}
            type="email"
            value={email}
            setValue={setEmail}
            placeholder="example@email.com"
          />
          <InputStyle
            label={t('login.password')}
            type="password"
            value={password}
            setValue={setPassword}
            placeholder={t('login.placeholderPassword')}
          />
        </div>
        {error && (
          <TextError text={error} />
        )}
        {/* <div className="text-right mb-6">
          <Link href="#" className="text-sm text-custom-color-main hover:underline">{t('login.forgotPassword')}</Link>
        </div> */}
        <BtnStyle text={t('login.loginButton')} className="mb-6 mt-10 w-full" btn />
      </form>

      {/* <p className="text-center text-gray-600">
        {t('login.noAccount')} <Link href="/sign-up" className="text-custom-color-main hover:underline">{t('login.register')}</Link>
      </p> */}
    </FrameworkLogin>
  );
}