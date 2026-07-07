import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'nav' | 'ghost';

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
      <Component className={`relative flex items-center justify-center overflow-hidden rounded-[10px] border border-[#161616] bg-[linear-gradient(342.29deg,#070707_12.1%,#2F2E31_87.9%)] font-medium text-white shadow-velora-dark transition-transform hover:scale-[1.02] active:scale-[0.98] ${className}`} {...linkProps} {...(href ? {} : props)}>
        <i className="absolute -right-3 top-0 z-0 h-3 w-28 rotate-[125deg] rounded-full bg-white/10 blur-[3px]" />
        <span className="relative z-10 flex items-center gap-2">{children}</span>
      </Component>
    );
  }

  if (variant === 'secondary') {
    return (
      <Component className={`relative flex items-center justify-center overflow-hidden rounded-[10px] bg-[#f9f9f9] px-6 py-3 font-medium text-[#525252] shadow-[0_4px_10px_rgba(0,0,0,.06),inset_0_1px_rgba(255,255,255,.48),inset_0_-2px_#edecec] transition-transform hover:scale-[1.02] active:scale-[0.98] ${className}`} {...linkProps} {...(href ? {} : props)}>
        <i className="absolute left-6 top-0 h-3 w-28 -rotate-[125deg] rounded-full bg-[#eaeaea]/60 blur-[3px]" />
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
    <Component className={`rounded-lg px-4 py-2 font-medium ${className}`} {...linkProps} {...(href ? {} : props)}>
      {children}
    </Component>
  );
}
