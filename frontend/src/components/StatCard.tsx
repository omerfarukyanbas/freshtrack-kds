type StatCardProps = {
  title: string;
  value: string | number;
  hint?: string;
  variant?: "default" | "danger" | "success" | "accent";
};

export function StatCard({ title, value, hint, variant = "default" }: StatCardProps) {
  return (
    <div className={"stat-card stat-card--" + variant}>
      <div className="stat-card__title">{title}</div>
      <div className="stat-card__value">{value}</div>
      {hint ? <div className="stat-card__hint">{hint}</div> : null}
    </div>
  );
}
