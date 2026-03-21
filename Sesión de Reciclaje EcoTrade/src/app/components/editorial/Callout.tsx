import React, { ReactNode } from 'react';

interface CalloutProps {
  title: string;
  children: ReactNode;
  variant?: 'info' | 'warning' | 'success';
}

export const Callout: React.FC<CalloutProps> = ({ title, children, variant = 'info' }) => {
  const variantStyles = {
    info: 'border-[#1A1A1A] bg-white',
    warning: 'border-[#92400E] bg-[#FEF3C7]',
    success: 'border-[#2D5016] bg-[#E8F4E3]',
  };

  return (
    <div className={`border-2 ${variantStyles[variant]} p-6`}>
      <h4 className="mb-3 pb-2 border-b border-current uppercase tracking-wider text-sm">
        {title}
      </h4>
      <div className="text-sm leading-relaxed">
        {children}
      </div>
    </div>
  );
};
