import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "default" | "primary" | "ghost" | "danger";
type Size    = "sm" | "md";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?:    Size;
  icon?:    ReactNode;
};

export default function Button({
  variant = "default", size = "md", icon, className = "", children, ...rest
}: Props) {
  const cls = [
    "btn",
    variant !== "default" && `btn--${variant}`,
    size === "sm" && "btn--sm",
    className,
  ].filter(Boolean).join(" ");
  return (
    <button className={cls} {...rest}>
      {icon}
      {children}
    </button>
  );
}
