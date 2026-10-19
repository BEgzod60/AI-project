import type { ReactNode, SVGProps } from 'react';

/** Oddiy chiziqli SVG ikonkalar (tashqi kutubxona o'rnatmasdan). Rang — currentColor. */
function Svg({ children, className = 'h-5 w-5', ...rest }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden className={className} {...rest}>
      {children}
    </svg>
  );
}

type IconProps = { className?: string };

export const HomeIcon = (p: IconProps) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5" />
  </Svg>
);

export const MosqueIcon = (p: IconProps) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 21h16M6 21v-7a6 6 0 0 1 12 0v7M12 3c1.5 1.5 2 2.7 2 4h-4c0-1.3.5-2.5 2-4Zm0 0V2m0 5v0" />
  </Svg>
);

export const ClockIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path strokeLinecap="round" d="M12 7v5l3 3" />
  </Svg>
);

export const BookIcon = (p: IconProps) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 19.5V5.5A2.5 2.5 0 0 1 6.5 3H12v18H6.5A2.5 2.5 0 0 1 4 18.5Zm8-14.5h5.5A2.5 2.5 0 0 1 20 5.5v14a2.5 2.5 0 0 1-2.5 2.5H12" />
  </Svg>
);

export const CrescentIcon = (p: IconProps) => (
  <Svg {...p}>
    <path strokeLinejoin="round" d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />
    <path strokeLinejoin="round" d="m17 3 .7 1.6 1.6.7-1.6.7L17 7.6l-.7-1.6-1.6-.7 1.6-.7L17 3Z" />
  </Svg>
);

export const CoinsIcon = (p: IconProps) => (
  <Svg {...p}>
    <ellipse cx="9" cy="7" rx="5" ry="2.5" />
    <path d="M4 7v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V7" />
    <path strokeLinecap="round" d="M14 13.2c3 .2 6 1.2 6 2.8v3c0 1.4-2.7 2.5-6 2.5s-6-1.1-6-2.5v-3.5" />
    <path d="M8 16c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5" />
  </Svg>
);

export const GraduateIcon = (p: IconProps) => (
  <Svg {...p}>
    <path strokeLinejoin="round" d="m2 9 10-5 10 5-10 5L2 9Z" />
    <path strokeLinecap="round" d="M6 11.5V17c0 1.5 3 3 6 3s6-1.5 6-3v-5.5" />
  </Svg>
);

export const CompassIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path strokeLinejoin="round" d="m15.5 8.5-2.2 5-5 2.2 2.2-5 5-2.2Z" />
  </Svg>
);

export const SurahIcon = (p: IconProps) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15.5H6.5A2.5 2.5 0 0 0 4 21V5.5Z" />
  </Svg>
);

export const InfoIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path strokeLinecap="round" d="M12 11v5M12 8v.5" />
  </Svg>
);

export const CodeIcon = (p: IconProps) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14" />
  </Svg>
);

export const MenuIcon = (p: IconProps) => (
  <Svg {...p}>
    <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h10" />
  </Svg>
);

export const CloseIcon = (p: IconProps) => (
  <Svg {...p}>
    <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
  </Svg>
);

export const SearchIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path strokeLinecap="round" d="m20 20-3.5-3.5" />
  </Svg>
);

export const ArrowRightIcon = (p: IconProps) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-5-5 5 5-5 5" />
  </Svg>
);

export const QuoteIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={p.className ?? 'h-5 w-5'}>
    <path d="M9.5 6C6.5 7 4.5 9.6 4.5 13v5h6v-6H7.6c.2-1.9 1.3-3.3 2.9-4L9.5 6Zm10 0c-3 1-5 3.6-5 7v5h6v-6h-2.9c.2-1.9 1.3-3.3 2.9-4l-1-2Z" />
  </svg>
);
