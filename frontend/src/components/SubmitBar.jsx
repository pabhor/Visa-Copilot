export default function SubmitBar({
  onSaveDraft,
  onSubmit,
  statusMessage,
  submitting = false,
}) {
  return (
    <div style={styles.wrap}>
      <div style={styles.status}>{statusMessage}</div>

      <div style={styles.actions}>
        <button
          type="button"
          onClick={onSaveDraft}
          style={styles.secondaryBtn}
        >
          Save Draft
        </button>

        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          style={{
            ...styles.primaryBtn,
            opacity: submitting ? 0.7 : 1,
            cursor: submitting ? "not-allowed" : "pointer",
          }}
        >
          {submitting ? "Submitting..." : "Submit Candidate"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    position: "sticky",
    bottom: 16,
    zIndex: 10,
    marginTop: 20,
    padding: 16,
    background: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(12px)",
    borderRadius: 20,
    border: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 16px 32px rgba(15, 23, 42, 0.08)",
  },
  status: {
    color: "#475569",
    fontSize: 14,
  },
  actions: {
    display: "flex",
    gap: 12,
  },
  secondaryBtn: {
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#0f172a",
    borderRadius: 14,
    padding: "12px 16px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  primaryBtn: {
    border: "none",
    background: "linear-gradient(90deg, #2563eb 0%, #4f46e5 100%)",
    color: "#fff",
    borderRadius: 14,
    padding: "12px 18px",
    fontSize: 14,
    fontWeight: 800,
  },
};