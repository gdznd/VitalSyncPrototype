export interface MetricCardProps {
  icon: string
  color: string
  label: string
  value: string
  detail: string
}

export function MetricCard({ icon, color, label, value, detail }: MetricCardProps) {
  return (
    <article className="summary-card">
      <span className={`card-icon ${color}`}>{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </article>
  )
}
