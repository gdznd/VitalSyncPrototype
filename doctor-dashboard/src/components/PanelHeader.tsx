export interface PanelHeaderProps {
  title: string
  subtitle: string
  action?: string
  onAction?: () => void
}

export function PanelHeader({ title, subtitle, action, onAction }: PanelHeaderProps) {
  return (
    <div className="panel-heading">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {action && (
        <button className="text-button" onClick={onAction}>
          {action} <span>→</span>
        </button>
      )}
    </div>
  )
}
