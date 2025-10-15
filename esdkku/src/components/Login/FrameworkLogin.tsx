import React from 'react';
import LogoMain from '../Display/Logo/LogoMain';

interface FrameworkLoginProps {
  children: React.ReactNode;
}

function FrameworkLogin({ children }: FrameworkLoginProps) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md my-7">
        <div className="flex justify-center mb-6">
          <LogoMain />
        </div>
        {children}
      </div>
    </div>
  );
}

export default FrameworkLogin;