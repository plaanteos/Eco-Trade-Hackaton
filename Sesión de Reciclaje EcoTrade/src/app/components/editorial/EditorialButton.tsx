import React, { ButtonHTMLAttributes } from 'react';

interface EditorialButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const EditorialButton: React.FC<EditorialButtonProps> = ({ 
  variant = 'primary', 
  size = 'md',
  className = '',
  children,
  ...props 
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium uppercase tracking-wider transition-all border-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantStyles = {
    primary: 'bg-[#2D5016] text-[#F5F3ED] border-[#2D5016] hover:bg-[#1A1A1A] hover:border-[#1A1A1A]',
    secondary: 'bg-[#E8E6DD] text-[#1A1A1A] border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-[#F5F3ED]',
    outline: 'bg-transparent text-[#1A1A1A] border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-[#F5F3ED]',
  };

  const sizeStyles = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
