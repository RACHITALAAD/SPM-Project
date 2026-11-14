export default function Stat({ label, value }) {
  return (
    <article className="card stat">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
    </article>
  );
}
