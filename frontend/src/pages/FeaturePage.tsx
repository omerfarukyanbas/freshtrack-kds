type FeaturePageProps = {
  title: string;
  description: string;
};

export function FeaturePage({ title, description }: FeaturePageProps) {
  return (
    <section className="feature-card">
      <div className="feature-card__badge">Soon</div>
      <h2 className="feature-card__title">{title}</h2>
      <p className="feature-card__desc">{description}</p>
    </section>
  );
}
