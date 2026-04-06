export default function FormSection({ title, subtitle = "", children }) {
  return (
    <section style={styles.section}>
      <div style={styles.header}>
        <h2 style={styles.title}>{title}</h2>
        {subtitle ? <p style={styles.subtitle}>{subtitle}</p> : null}
      </div>

      <div style={styles.grid}>{children}</div>
    </section>
  );
}

const styles = {
  section: {
    background: "rgba(255,255,255,0.88)",
    border: "1px solid rgba(255,255,255,0.9)",
    borderRadius: 24,
    padding: 22,
    boxShadow: "0 16px 40px rgba(15, 23, 42, 0.06)",
    marginBottom: 24,
    backdropFilter: "blur(10px)",
  },
  header: {
    marginBottom: 18,
  },
  title: {
    margin: 0,
    fontSize: 22,
    color: "#0f172a",
  },
  subtitle: {
    margin: "6px 0 0",
    fontSize: 13,
    color: "#64748b",
    lineHeight: 1.5,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 16,
  },
};