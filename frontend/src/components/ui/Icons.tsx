import type { SVGProps } from "react";

const base: SVGProps<SVGSVGElement> = {
  width: 16, height: 16, viewBox: "0 0 24 24",
  fill: "none", stroke: "currentColor", strokeWidth: 1.75,
  strokeLinecap: "round", strokeLinejoin: "round",
};

type P = { size?: number; className?: string };

const wrap = (children: React.ReactNode) => (props: P) => (
  <svg {...base} width={props.size ?? 16} height={props.size ?? 16} className={props.className}>
    {children}
  </svg>
);

export const IconDashboard   = wrap(<><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></>);
export const IconStocks      = wrap(<><polyline points="3 17 9 11 13 15 21 7"/><polyline points="14 7 21 7 21 14"/></>);
export const IconTools       = wrap(<><path d="M14.7 6.3a4 4 0 1 0 5 5L21 12l-2 2-7-7 2-2Z"/><path d="m9 11-6 6 4 4 6-6"/></>);
export const IconPerformance = wrap(<><path d="M3 3v18h18"/><path d="m7 14 4-4 4 4 5-6"/></>);
export const IconNews        = wrap(<><path d="M4 4h13a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4Z"/><path d="M8 8h7M8 12h7M8 16h4"/></>);
export const IconSettings    = wrap(<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1A2 2 0 1 1 4.3 17l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1A2 2 0 1 1 7 4.3l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1A2 2 0 1 1 19.7 7l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></>);
export const IconAbout       = wrap(<><circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/></>);
export const IconSearch      = wrap(<><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></>);
export const IconSun         = wrap(<><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></>);
export const IconMoon        = wrap(<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>);
export const IconBell        = wrap(<><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></>);
export const IconPlus        = wrap(<><path d="M12 5v14M5 12h14"/></>);
export const IconClose       = wrap(<><path d="M18 6 6 18M6 6l12 12"/></>);
export const IconCheck       = wrap(<polyline points="20 6 9 17 4 12"/>);
export const IconChevron     = wrap(<polyline points="9 18 15 12 9 6"/>);
export const IconRefresh     = wrap(<><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15"/></>);
export const IconPlay        = wrap(<polygon points="6 3 20 12 6 21 6 3"/>);
export const IconPause       = wrap(<><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></>);
export const IconGrip        = wrap(<><circle cx="9" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="18" r="1"/></>);
export const IconMenu        = wrap(<><path d="M3 6h18M3 12h18M3 18h18"/></>);
export const IconBolt        = wrap(<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>);
export const IconFilter      = wrap(<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>);
