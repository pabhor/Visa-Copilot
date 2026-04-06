export default function CheckboxGroup({ items = [], values = {}, onChange }) {
  return (
    <div style={styles.grid}>
      {items.map((item) => (
        <label key={item.key} style={styles.item}>
          <input
            type="checkbox"
            checked={Boolean(values[item.key])}
            onChange={(e) => onChange(item.key, e.target.checked)}
          />
          <span style={styles.label}>{item.label}</span>
        </label>
      ))}
    </div>
  );
}

const styles = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 14px",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    background: "#fff",
  },
  label: {
    fontSize: 14,
    color: "#334155",
  },
};