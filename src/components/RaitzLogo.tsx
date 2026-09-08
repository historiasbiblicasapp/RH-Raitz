import React from 'react';

interface RaitzLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  rounded?: string;
  alt?: string;
}

export const RaitzLogo: React.FC<RaitzLogoProps> = ({
  className = '',
  size = 'md',
  rounded = 'rounded-xl',
  alt = 'Logo Raitz'
}) => {
  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20 sm:w-24 sm:h-24'
  }[size];

  return (
    <img
      src="/raitz-logo.jpg"
      alt={alt}
      referrerPolicy="no-referrer"
      className={`${sizeClasses} ${rounded} object-cover shadow-xs shrink-0 ${className}`}
    />
  );
};
