import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'nav' | 'ghost' | 'dark';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  href?: string;
}

export function Button({ variant = 'primary', className = '', children, href, ...props }: ButtonProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Component: any = href ? 'a' : 'button';
  const linkProps = href ? { href } : {};

  if (variant === 'primary') {
    return (
      <Component className={`flex flex-row items-center justify-center px-6 py-3 gap-[10px] rounded-[8px] bg-[#070707] bg-[linear-gradient(342.29deg,#070707_12.1%,#2F2E31_87.9%)] shadow-[0px_0px_0px_0.8px_#161616,0px_6.8656px_6.8656px_-2.33333px_rgba(0,0,0,0.16),0px_13.6468px_13.6468px_-2.91667px_rgba(0,0,0,0.16),0px_30px_30px_-3.5px_rgba(0,0,0,0.08),inset_0px_0.8px_0px_rgba(255,255,255,0.16)] font-urbanist font-medium text-[16px] leading-[24px] text-white ${className}`} {...linkProps} {...(href ? {} : props)}>
        {children}
      </Component>
    );
  }

  if (variant === 'secondary') {
    return (
      <Component className={`relative flex flex-row items-center justify-center overflow-hidden px-4 py-3 gap-[10px] rounded-[10px] bg-[#F5F4F4] shadow-[0px_3px_3px_rgba(0,0,0,0.08),0px_22px_16px_rgba(0,0,0,0.06),0px_12px_10px_rgba(0,0,0,0.06),0px_6px_5px_rgba(0,0,0,0.06),inset_0px_1px_0px_rgba(255,255,255,0.48),inset_0px_-2px_0px_#EDECEC] font-urbanist font-[550] text-[20px] leading-[24px] text-[#848484] transition-transform hover:scale-[1.02] active:scale-[0.98] ${className}`} {...linkProps} {...(href ? {} : props)}>
        <i className="absolute -right-[15px] top-1/2 z-0 h-[12px] w-[120px] -translate-y-1/2 rotate-[125deg] rounded-full bg-[#EAEAEA] blur-[3px]" />
        <span className="relative z-10 flex items-center gap-2">{children}</span>
      </Component>
    );
  }

  if (variant === 'dark') {
    return (
      <Component className={`relative flex flex-row items-center justify-center overflow-hidden px-6 py-3 gap-[12px] rounded-[10px] bg-[#272727] shadow-[0px_2px_2px_rgba(0,0,0,0.1),0px_3px_3px_rgba(0,0,0,0.12),0px_40px_32px_rgba(0,0,0,0.12),0px_22px_16px_rgba(0,0,0,0.14),0px_12px_10px_rgba(0,0,0,0.13),0px_6px_5px_rgba(0,0,0,0.12),0px_2px_3px_rgba(0,0,0,0.12),inset_0px_1px_0px_rgba(255,255,255,0.18),inset_0px_-2px_0px_#191919] font-urbanist font-[550] text-[16px] leading-[24px] text-white transition-transform hover:scale-[1.02] active:scale-[0.98] ${className}`} {...linkProps} {...(href ? {} : props)}>
        <i className="absolute left-[20%] top-1/2 z-0 h-[12px] w-[120px] -translate-x-1/2 -translate-y-1/2 rotate-[125deg] rounded-full bg-[rgba(255,255,255,0.12)] blur-[3px]" />
        <i className="absolute right-[20%] top-1/2 z-0 h-[12px] w-[120px] translate-x-1/2 -translate-y-1/2 rotate-[125deg] rounded-full bg-[rgba(255,255,255,0.12)] blur-[3px]" />
        <span className="relative z-10 flex items-center gap-2">{children}</span>
      </Component>
    );
  }

  if (variant === 'nav') {
    return (
      <button className={`flex h-12 w-12 items-center justify-center rounded-full bg-[#FAFAFA] shadow-[0_1px_6px_#000000,inset_0_1px_0_#FFFFFF] transition-colors hover:bg-white active:scale-95 ${className}`} {...props}>
        {children}
      </button>
    );
  }

  return (
    <Component className={`rounded-[10px] px-4 py-2 font-medium ${className}`} {...linkProps} {...(href ? {} : props)}>
      {children}
    </Component>
  );
}
