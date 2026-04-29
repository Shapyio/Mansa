import type { ReactNode } from "react";

type Tone =
  | "default" | "accent" | "up" | "down" | "warn"
  | "pending" | "running" | "done" | "failed" | "paused";

type Props = { tone?: Tone; children: ReactNode; dot?: boolean };

export default function Badge({ tone = "default", children, dot }: Props) {
  const cls = ["badge", tone !== "default" && `badge--${tone}`].filter(Boolean).join(" ");
  return (
    <span className={cls}>
      {dot && <span className="dot" style={{ background: "currentColor" }} />}
      {children}
    </span>
  );
}
