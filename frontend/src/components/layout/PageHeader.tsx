type Props = {
  title: string
  actions?: React.ReactNode
}

export default function PageHeader({ title, actions }: Props) {
  return (
    <div className="page-header">

      <div className="page-title">
        {title}
      </div>

      <div className="page-actions">
        {actions}
      </div>

    </div>
  )
}