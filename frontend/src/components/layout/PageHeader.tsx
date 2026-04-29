import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
};

export default function PageHeader({ title, subtitle, actions }: Props) {
  return (
    <div className="page-header">
      <div>
        <div className="page-header__title">{title}</div>
        {subtitle && <div className="page-header__sub">{subtitle}</div>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </div>
  );
}
