"use client"

import { useState } from "react";
import InputStyle from "../Form/InputStyle";
import BtnStyle from "../Form/Btn/BtnStyle";
import { t } from "@/i18n";
import Link from "next/link";
import TextTitleColor from "../Title/TextTitleColor";
import FrameworkLogin from "./FrameworkLogin";

export default function Register() {

  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  const handleSubmit = () => {
    console.log("test")
  }

  return (
    <FrameworkLogin
    >
      <TextTitleColor text={t('register.title')} />
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-3 mb-8">
          <InputStyle
            label={t('register.firstName')}
            type="text"
            value={firstName}
            setValue={setFirstName}
            placeholder={t('register.firstName')}
          />
          <InputStyle
            label={t('register.lastName')}
            type="text"
            value={lastName}
            setValue={setLastName}
            placeholder={t('register.lastName')}
          />
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
          <InputStyle
            label={t('register.confirmPassword')}
            type="password"
            value={confirmPassword}
            setValue={setConfirmPassword}
            placeholder={t('register.placeholderConfirmPassword')}
          />
        </div>

        <BtnStyle text={t('register.loginButton')} className="mb-6" btn />
      </form>

      <p className="text-center text-gray-600">
        {t('register.haveAccount')} <Link href="/" className="text-custom-color-main hover:underline">{t('register.login')}</Link>
      </p>
    </FrameworkLogin>
  );
}