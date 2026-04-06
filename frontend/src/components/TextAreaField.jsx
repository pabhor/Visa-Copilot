export default function TextAreaField({
  label,
  value,
  onChange,
  error = "",
  rows = 4,
  placeholder = "",
}) {
  return (
    <label style={styles.wrapper}>
      <span style={styles.label}>{label}</span>

      <textarea
        value={value}
        onChange={onChange}
        rows={rows}
        placeholder={placeholder || label}
        style={{
          ...styles.textarea,
          borderColor: error ? "#ef4444" : "#dbe2ea",
        }}
      />

      {error ? <span style={styles.error}>{error}</span> : null}
    </label>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: 600,
    color: "#1e293b",
  },
  textarea: {
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid #dbe2ea",
    background: "#fff",
    fontSize: 14,
    outline: "none",
    resize: "vertical",
    boxShadow: "inset 0 1px 2px rgba(15,23,42,0.03)",
  },
  error: {
    color: "#dc2626",
    fontSize: 12,
  },
};