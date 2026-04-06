import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  fetchCandidateProfileById,
  analyzeCandidateProfile,
} from "../db/candidateProfileDB";

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function toDisplayText(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === "") return [];
  return [value];
}

function toTextArray(value) {
  return toArray(value).map((item) => toDisplayText(item));
}

function normalizeRequiredDocuments(value) {
  const items = toArray(value);

  return items.map((item) => {
    if (isObject(item)) {
      return {
        document_name: toDisplayText(
          item.document_name || item.name || item.title || "Supporting Document"
        ),
        description: toDisplayText(
          item.description || item.details || item.summary || "No description provided."
        ),
        tie_to_candidate_profile: toDisplayText(
          item.tie_to_candidate_profile ||
            item.tie_to_profile ||
            item.tie_to_candidate ||
            item.relevance ||
            "No candidate-specific tie provided."
        ),
      };
    }

    return {
      document_name: "Supporting Document",
      description: toDisplayText(item),
      tie_to_candidate_profile: "No candidate-specific tie provided.",
    };
  });
}

function normalizePolicyContext(value) {
  const items = toArray(value);

  return items.map((item) => {
    if (typeof item === "string") {
      return item.trim();
    }

    if (isObject(item)) {
      if (typeof item.text === "string") return item.text.trim();
      if (typeof item.content === "string") return item.content.trim();
      if (typeof item.chunk === "string") return item.chunk.trim();
    }

    return toDisplayText(item).trim();
  });
}

function normalizeAnalysisResponse(result) {
  const safeResult = isObject(result) ? result : {};
  const rawAnalysis = isObject(safeResult.analysis) ? safeResult.analysis : {};
  const rawOverview = isObject(rawAnalysis.analysis_overview)
    ? rawAnalysis.analysis_overview
    : {};

  const readinessScore = Number(rawOverview.readiness_score);
  const normalizedScore = Number.isFinite(readinessScore) ? readinessScore : 0;

  return {
    ...safeResult,
    analysis: {
      ...rawAnalysis,
      analysis_overview: {
        ...rawOverview,
        readiness_score: normalizedScore,
        strengths: toTextArray(rawOverview.strengths),
        gaps: toTextArray(rawOverview.gaps),
      },
      required_documents: normalizeRequiredDocuments(rawAnalysis.required_documents),
      detailed_summary: toDisplayText(rawAnalysis.detailed_summary),
    },
    retrieved_context: normalizePolicyContext(safeResult.retrieved_context),
  };
}

function formatParagraphs(text) {
  if (!text) return [];

  return text
    .split(/\n\s*\n/)
    .map((part) => part.replace(/\n/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

export default function CandidateAnalysis() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        setError("");
        const data = await fetchCandidateProfileById(id);
        setProfile(data);
      } catch (err) {
        setError(err?.message || "Failed to load candidate profile");
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadProfile();
    }
  }, [id]);

  async function handleRunAnalysis() {
    try {
      setAnalysisLoading(true);
      setError("");

      const result = await analyzeCandidateProfile(id);
      const normalized = normalizeAnalysisResponse(result);

      setAnalysisResult(normalized);
    } catch (err) {
      console.error("Analysis error:", err);
      setError(err?.message || "Failed to analyze candidate profile");
    } finally {
      setAnalysisLoading(false);
    }
  }

  const payload = isObject(profile?.payload) ? profile.payload : {};
  const candidate = isObject(payload?.candidate) ? payload.candidate : {};
  const employer = isObject(payload?.employer_context) ? payload.employer_context : {};
  const achievements = isObject(payload?.achievements) ? payload.achievements : {};
  const meta = isObject(payload?.meta) ? payload.meta : {};

  const analysis = isObject(analysisResult?.analysis) ? analysisResult.analysis : {};
  const overview = isObject(analysis?.analysis_overview)
    ? analysis.analysis_overview
    : {};

  const strengths = Array.isArray(overview?.strengths) ? overview.strengths : [];
  const gaps = Array.isArray(overview?.gaps) ? overview.gaps : [];
  const requiredDocuments = Array.isArray(analysis?.required_documents)
    ? analysis.required_documents
    : [];
  const detailedSummary =
    typeof analysis?.detailed_summary === "string" ? analysis.detailed_summary : "";
  const retrievedContext = Array.isArray(analysisResult?.retrieved_context)
    ? analysisResult.retrieved_context
    : [];

  const candidateName =
    profile?.candidate_name || candidate?.full_name || "Candidate";

  const score = Number(overview?.readiness_score || 0);
  const clampedScore = Math.max(0, Math.min(100, score));
  const ringDegrees = Math.round((clampedScore / 100) * 360);

  const scoreTheme = useMemo(() => {
    if (clampedScore >= 75) {
      return {
        label: "Strong O-1 Potential",
        accent: "#2fb67c",
        soft: "#dff7ec",
      };
    }
    if (clampedScore >= 50) {
      return {
        label: "Moderate Potential",
        accent: "#f2b53d",
        soft: "#fff4d8",
      };
    }
    return {
      label: "Needs More Evidence",
      accent: "#e16b5d",
      soft: "#fde7e4",
    };
  }, [clampedScore]);

  const metrics = [
    { label: "Publications", value: achievements.publications_count ?? 0 },
    { label: "Patents", value: achievements.patents_count ?? 0 },
    { label: "Awards", value: achievements.awards_count ?? 0 },
    {
      label: "Reco Letters",
      value: achievements.recommendation_letters_count ?? 0,
    },
    { label: "Speaking", value: achievements.speaking_engagements_count ?? 0 },
    { label: "Media", value: achievements.media_mentions_count ?? 0 },
  ];

  const detailRows = [
    {
      label: "Email",
      value: profile?.candidate_email || candidate?.email || "N/A",
    },
    {
      label: "Current Role",
      value: profile?.current_role || candidate?.current_role || "N/A",
    },
    {
      label: "Current Company",
      value: candidate?.current_company || "N/A",
    },
    {
      label: "Current Location",
      value: candidate?.current_location || "N/A",
    },
    {
      label: "Citizenship",
      value: candidate?.country_of_citizenship || "N/A",
    },
    {
      label: "Experience",
      value: candidate?.years_of_experience ?? "N/A",
    },
    {
      label: "Visa Type",
      value: profile?.visa_type || meta?.visa_type || "N/A",
    },
    {
      label: "Employer",
      value: profile?.employer_name || employer?.company_name || "N/A",
    },
    {
      label: "Company Stage",
      value: employer?.company_stage || "N/A",
    },
    {
      label: "Offered Role",
      value: employer?.offered_role || "N/A",
    },
    {
      label: "Salary",
      value: employer?.offered_salary_usd ?? "N/A",
    },
    {
      label: "Remote / Onsite",
      value: employer?.remote_or_onsite || "N/A",
    },
  ];

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <aside style={styles.sidebar}>
          <div style={styles.brandBox}>
            <div style={styles.brandDot} />
            <div>
              <div style={styles.brandTitle}>VISA COPILOT</div>
              <div style={styles.brandSub}>O-1 Analysis</div>
            </div>
          </div>

          <div style={styles.sideSectionTitle}>Analysis Menu</div>

          <NavItem label="Overview" active />
          <NavItem label="Strengths" />
          <NavItem label="Gaps" />
          <NavItem label="Documents" />
          <NavItem label="Summary" />
          <NavItem label="Evidence Metrics" />

          <div style={styles.sideFooter}>
            <Link to="/saved-candidates" style={styles.backLink}>
              Back to Saved Candidates
            </Link>
          </div>
        </aside>

        <main style={styles.main}>
          <div style={styles.topbar}>
            <div style={styles.topbarLeft}>
              <button
                type="button"
                onClick={() => navigate("/saved-candidates")}
                style={styles.backButton}
              >
                ← Back to All Applications
              </button>

              <div>
                <div style={styles.pageEyebrow}>Candidate Analysis Dashboard</div>
                <h1 style={styles.pageTitle}>{candidateName}</h1>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRunAnalysis}
              disabled={analysisLoading || !id}
              style={{
                ...styles.runButton,
                opacity: analysisLoading ? 0.75 : 1,
                cursor: analysisLoading ? "not-allowed" : "pointer",
              }}
            >
              {analysisLoading ? "Running Analysis..." : "Run Analysis"}
            </button>
          </div>

          {loading ? (
            <div style={styles.infoBox}>Loading candidate profile...</div>
          ) : null}

          {error ? <div style={styles.errorBox}>{error}</div> : null}

          {!loading && profile ? (
            <>
              <div style={styles.kpiGrid}>
                <section style={styles.largeCard}>
                  <div style={styles.cardHeader}>
                    <h2 style={styles.cardTitle}>O-1 Readiness Score</h2>
                    <span
                      style={{
                        ...styles.statusBadge,
                        background: scoreTheme.soft,
                        color: scoreTheme.accent,
                      }}
                    >
                      {scoreTheme.label}
                    </span>
                  </div>

                  <div style={styles.scoreArea}>
                    <div
                      style={{
                        ...styles.ring,
                        background: `conic-gradient(${scoreTheme.accent} ${ringDegrees}deg, #e9eef5 ${ringDegrees}deg)`,
                      }}
                    >
                      <div style={styles.ringInner}>
                        <div style={styles.ringNumber}>{clampedScore}</div>
                        <div style={styles.ringText}>out of 100</div>
                      </div>
                    </div>

                    <div style={styles.scoreTextBlock}>
                      <div style={styles.scoreLabel}>Current Assessment</div>
                      <p style={styles.scoreDescription}>
                        This score reflects the current O-1 readiness based on
                        available profile evidence and retrieved USCIS-style
                        policy context.
                      </p>

                      <div style={styles.quickStats}>
                        <MiniStat label="Strengths" value={strengths.length} />
                        <MiniStat label="Gaps" value={gaps.length} />
                        <MiniStat
                          label="Documents"
                          value={requiredDocuments.length}
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <section style={styles.smallCard}>
                  <div style={styles.cardHeader}>
                    <h2 style={styles.cardTitle}>Candidate Snapshot</h2>
                  </div>

                  <div style={styles.snapshotGrid}>
                    {detailRows.slice(0, 6).map((row) => (
                      <SnapshotRow
                        key={row.label}
                        label={row.label}
                        value={row.value}
                      />
                    ))}
                  </div>
                </section>

                <section style={styles.smallCard}>
                  <div style={styles.cardHeader}>
                    <h2 style={styles.cardTitle}>Employer Context</h2>
                  </div>

                  <div style={styles.snapshotGrid}>
                    {detailRows.slice(6).map((row) => (
                      <SnapshotRow
                        key={row.label}
                        label={row.label}
                        value={row.value}
                      />
                    ))}
                  </div>
                </section>
              </div>

              <div style={styles.contentGrid}>
                <section style={styles.panel}>
                  <div style={styles.cardHeader}>
                    <h2 style={styles.cardTitle}>Analysis Overview</h2>
                  </div>

                  <div style={styles.twoColumnCards}>
                    <InsightCard
                      title="Strengths"
                      tone="green"
                      items={strengths}
                      emptyText="No strengths generated yet."
                    />
                    <InsightCard
                      title="Gaps"
                      tone="orange"
                      items={gaps}
                      emptyText="No gaps generated yet."
                    />
                  </div>
                </section>

                <section style={styles.panel}>
                  <div style={styles.cardHeader}>
                    <h2 style={styles.cardTitle}>Required Documents</h2>
                  </div>

                  {requiredDocuments.length ? (
                    <div style={styles.documentList}>
                      {requiredDocuments.map((doc, idx) => (
                        <div key={`${doc.document_name}-${idx}`} style={styles.documentCard}>
                          <div style={styles.documentTop}>
                            <div style={styles.documentNumber}>{idx + 1}</div>
                            <div>
                              <div style={styles.documentHeading}>
                                Supporting Document {idx + 1}
                              </div>
                              <div style={styles.documentName}>
                                {doc.document_name || "Supporting Document"}
                              </div>
                            </div>
                          </div>

                          <div style={styles.documentSection}>
                            <div style={styles.documentLabel}>Description</div>
                            <ul style={styles.documentBulletList}>
                              {formatParagraphs(doc.description).length ? (
                                formatParagraphs(doc.description).map((paragraph, pIdx) => (
                                  <li key={pIdx} style={styles.documentBulletItem}>
                                    {paragraph}
                                  </li>
                                ))
                              ) : (
                                <li style={styles.documentBulletItem}>
                                  No description provided.
                                </li>
                              )}
                            </ul>
                          </div>

                          <div style={styles.documentSection}>
                            <div style={styles.documentLabel}>Tie to Candidate Profile</div>
                            <ul style={styles.documentBulletList}>
                              {formatParagraphs(doc.tie_to_candidate_profile).length ? (
                                formatParagraphs(doc.tie_to_candidate_profile).map(
                                  (paragraph, pIdx) => (
                                    <li key={pIdx} style={styles.documentBulletItem}>
                                      {paragraph}
                                    </li>
                                  )
                                )
                              ) : (
                                <li style={styles.documentBulletItem}>
                                  No candidate-specific tie provided.
                                </li>
                              )}
                            </ul>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState text="Run analysis to generate the O-1 document checklist." />
                  )}
                </section>

                <section style={styles.panel}>
                  <div style={styles.cardHeader}>
                    <h2 style={styles.cardTitle}>Detailed Summary</h2>
                  </div>

                  {detailedSummary ? (
                    <div style={styles.summaryBox}>
                      {formatParagraphs(detailedSummary).map((paragraph, idx) => (
                        <p key={idx} style={styles.summaryParagraph}>
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <EmptyState text="Run analysis to generate a detailed O-1 summary." />
                  )}
                </section>

                <section style={styles.panel}>
                  <div style={styles.cardHeader}>
                    <h2 style={styles.cardTitle}>Evidence Metrics</h2>
                  </div>

                  <div style={styles.metricsGrid}>
                    {metrics.map((metric) => (
                      <div key={metric.label} style={styles.metricCard}>
                        <div style={styles.metricValue}>{metric.value}</div>
                        <div style={styles.metricLabel}>{metric.label}</div>
                      </div>
                    ))}
                  </div>
                </section>

                <section style={styles.panel}>
                  <div style={styles.cardHeader}>
                    <h2 style={styles.cardTitle}>Retrieved Policy Context</h2>
                  </div>

                  {retrievedContext.length ? (
                    <div style={styles.policyContextList}>
                      {retrievedContext.map((chunk, idx) => {
                        const paragraphs = formatParagraphs(chunk);

                        return (
                          <div key={`${idx}-${chunk.slice(0, 30)}`} style={styles.policyCard}>
                            <div style={styles.policyIndex}>{idx + 1}</div>
                            <div style={styles.policyBody}>
                              <div style={styles.policyTitle}>
                                Relevant USCIS Context {idx + 1}
                              </div>

                              <div style={styles.policyParagraphGroup}>
                                {paragraphs.length ? (
                                  paragraphs.map((paragraph, pIdx) => (
                                    <p key={pIdx} style={styles.policyParagraph}>
                                      {paragraph}
                                    </p>
                                  ))
                                ) : (
                                  <p style={styles.policyParagraph}>{chunk}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState text="Context snippets will appear after analysis." />
                  )}
                </section>
              </div>
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
}

function NavItem({ label, active = false }) {
  return (
    <div
      style={{
        ...styles.navItem,
        ...(active ? styles.navItemActive : {}),
      }}
    >
      <span style={styles.navDot} />
      <span>{label}</span>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div style={styles.miniStat}>
      <div style={styles.miniStatValue}>{value}</div>
      <div style={styles.miniStatLabel}>{label}</div>
    </div>
  );
}

function SnapshotRow({ label, value }) {
  return (
    <div style={styles.snapshotRow}>
      <div style={styles.snapshotLabel}>{label}</div>
      <div style={styles.snapshotValue}>{toDisplayText(value) || "N/A"}</div>
    </div>
  );
}

function InsightCard({ title, items, emptyText, tone }) {
  const safeItems = Array.isArray(items) ? items : [];

  const toneStyles =
    tone === "green"
      ? {
          badgeBg: "#dff7ec",
          badgeText: "#2fb67c",
          bullet: "#2fb67c",
        }
      : {
          badgeBg: "#fff1df",
          badgeText: "#d9861f",
          bullet: "#d9861f",
        };

  return (
    <div style={styles.insightCard}>
      <div
        style={{
          ...styles.insightBadge,
          background: toneStyles.badgeBg,
          color: toneStyles.badgeText,
        }}
      >
        {title}
      </div>

      {safeItems.length ? (
        <div style={styles.insightList}>
          {safeItems.map((item, idx) => (
            <div key={`${idx}-${item}`} style={styles.insightItem}>
              <div
                style={{
                  ...styles.insightBullet,
                  background: toneStyles.bullet,
                }}
              />
              <div style={styles.insightText}>{toDisplayText(item)}</div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState text={emptyText} compact />
      )}
    </div>
  );
}

function EmptyState({ text, compact = false }) {
  return (
    <div style={compact ? styles.emptyCompact : styles.emptyState}>
      {text}
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f3f6fb",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  shell: {
    display: "grid",
    gridTemplateColumns: "240px 1fr",
    minHeight: "100vh",
  },
  sidebar: {
    background: "#1f2937",
    color: "#dbe4f0",
    padding: 20,
    display: "flex",
    flexDirection: "column",
    borderRight: "1px solid rgba(255,255,255,0.05)",
  },
  brandBox: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    paddingBottom: 18,
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    marginBottom: 18,
  },
  brandDot: {
    width: 14,
    height: 14,
    borderRadius: "50%",
    background: "linear-gradient(180deg, #4f46e5 0%, #2fb67c 100%)",
  },
  brandTitle: {
    fontSize: 14,
    fontWeight: 800,
    color: "#ffffff",
    letterSpacing: 0.4,
  },
  brandSub: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },
  sideSectionTitle: {
    fontSize: 11,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "11px 12px",
    borderRadius: 10,
    color: "#cbd5e1",
    fontSize: 14,
    marginBottom: 4,
  },
  navItemActive: {
    background: "#111827",
    color: "#ffffff",
  },
  navDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#4f46e5",
    flexShrink: 0,
  },
  sideFooter: {
    marginTop: "auto",
    paddingTop: 18,
    borderTop: "1px solid rgba(255,255,255,0.08)",
  },
  backLink: {
    color: "#dbe4f0",
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 700,
  },
  main: {
    padding: 28,
  },
  topbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 20,
    marginBottom: 22,
    flexWrap: "wrap",
  },
  topbarLeft: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  backButton: {
    alignSelf: "flex-start",
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#0f172a",
    borderRadius: 12,
    padding: "10px 14px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(15,23,42,0.06)",
  },
  pageEyebrow: {
    fontSize: 12,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: 800,
    marginBottom: 8,
  },
  pageTitle: {
    fontSize: 40,
    lineHeight: 1.05,
    margin: 0,
    color: "#0f172a",
    fontWeight: 900,
  },
  runButton: {
    border: "none",
    background: "linear-gradient(90deg, #2563eb 0%, #4f46e5 100%)",
    color: "#fff",
    borderRadius: 12,
    padding: "13px 18px",
    fontSize: 14,
    fontWeight: 800,
    boxShadow: "0 8px 20px rgba(79,70,229,0.22)",
  },
  infoBox: {
    background: "#ffffff",
    border: "1px solid #dbe3ef",
    borderRadius: 14,
    padding: 16,
    color: "#334155",
    marginBottom: 18,
  },
  errorBox: {
    background: "#fff1f2",
    border: "1px solid #fecdd3",
    borderRadius: 14,
    padding: 16,
    color: "#be123c",
    marginBottom: 18,
    whiteSpace: "pre-wrap",
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "1.4fr 1fr 1fr",
    gap: 18,
    marginBottom: 18,
  },
  largeCard: {
    background: "#ffffff",
    border: "1px solid #dde6f0",
    borderRadius: 18,
    padding: 22,
    boxShadow: "0 8px 24px rgba(15,23,42,0.05)",
  },
  smallCard: {
    background: "#ffffff",
    border: "1px solid #dde6f0",
    borderRadius: 18,
    padding: 22,
    boxShadow: "0 8px 24px rgba(15,23,42,0.05)",
  },
  panel: {
    background: "#ffffff",
    border: "1px solid #dde6f0",
    borderRadius: 18,
    padding: 22,
    boxShadow: "0 8px 24px rgba(15,23,42,0.05)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  cardTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: 20,
    fontWeight: 800,
  },
  statusBadge: {
    borderRadius: 999,
    padding: "7px 11px",
    fontSize: 12,
    fontWeight: 800,
  },
  scoreArea: {
    display: "grid",
    gridTemplateColumns: "240px 1fr",
    gap: 22,
    alignItems: "center",
  },
  ring: {
    width: 200,
    height: 200,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    margin: "0 auto",
  },
  ringInner: {
    width: 146,
    height: 146,
    borderRadius: "50%",
    background: "#ffffff",
    display: "grid",
    placeItems: "center",
    boxShadow: "inset 0 0 0 1px #e5edf6",
    textAlign: "center",
  },
  ringNumber: {
    fontSize: 42,
    fontWeight: 900,
    color: "#0f172a",
    lineHeight: 1,
  },
  ringText: {
    marginTop: 6,
    fontSize: 13,
    color: "#64748b",
    fontWeight: 700,
  },
  scoreTextBlock: {
    minWidth: 0,
  },
  scoreLabel: {
    fontSize: 15,
    fontWeight: 800,
    color: "#0f172a",
    marginBottom: 8,
  },
  scoreDescription: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.8,
    color: "#475569",
    maxWidth: 540,
  },
  quickStats: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
    marginTop: 18,
  },
  miniStat: {
    background: "#f8fbff",
    border: "1px solid #e4edf7",
    borderRadius: 14,
    padding: 14,
  },
  miniStatValue: {
    fontSize: 24,
    fontWeight: 900,
    color: "#0f172a",
  },
  miniStatLabel: {
    marginTop: 4,
    fontSize: 12,
    color: "#64748b",
    fontWeight: 700,
  },
  snapshotGrid: {
    display: "grid",
    gap: 10,
  },
  snapshotRow: {
    display: "grid",
    gridTemplateColumns: "120px 1fr",
    gap: 10,
    alignItems: "start",
    paddingBottom: 10,
    borderBottom: "1px solid #eff4fa",
  },
  snapshotLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  snapshotValue: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: 700,
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
  },
  contentGrid: {
    display: "grid",
    gap: 18,
  },
  twoColumnCards: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 16,
  },
  insightCard: {
    background: "#f9fbfd",
    border: "1px solid #e6edf5",
    borderRadius: 16,
    padding: 16,
  },
  insightBadge: {
    display: "inline-block",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 800,
    marginBottom: 14,
  },
  insightList: {
    display: "grid",
    gap: 12,
  },
  insightItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
  },
  insightBullet: {
    width: 9,
    height: 9,
    borderRadius: "50%",
    marginTop: 7,
    flexShrink: 0,
  },
  insightText: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 1.7,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  documentList: {
    display: "grid",
    gap: 16,
  },
  documentCard: {
    background: "#f9fbfd",
    border: "1px solid #e6edf5",
    borderRadius: 18,
    padding: 18,
  },
  documentTop: {
    display: "flex",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: 16,
  },
  documentNumber: {
    width: 46,
    height: 46,
    borderRadius: 12,
    background: "#e7eefc",
    color: "#315bd8",
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
    fontSize: 16,
    flexShrink: 0,
  },
  documentHeading: {
    fontSize: 13,
    fontWeight: 800,
    color: "#64748b",
    marginBottom: 4,
  },
  documentName: {
    fontSize: 18,
    fontWeight: 800,
    color: "#0f172a",
    lineHeight: 1.35,
  },
  documentSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTop: "1px solid #e9eef5",
  },
  documentLabel: {
    fontSize: 13,
    fontWeight: 800,
    color: "#0f172a",
    marginBottom: 10,
  },
  documentBulletList: {
    margin: 0,
    paddingLeft: 20,
    display: "grid",
    gap: 8,
  },
  documentBulletItem: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 1.75,
  },
  summaryBox: {
    background: "#f9fbfd",
    border: "1px solid #e6edf5",
    borderRadius: 16,
    padding: 18,
    color: "#334155",
  },
  summaryParagraph: {
    margin: "0 0 14px 0",
    fontSize: 15,
    lineHeight: 1.9,
    color: "#334155",
    wordBreak: "break-word",
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
    gap: 12,
  },
  metricCard: {
    background: "#f9fbfd",
    border: "1px solid #e6edf5",
    borderRadius: 14,
    padding: 16,
    textAlign: "center",
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 900,
    color: "#0f172a",
    lineHeight: 1.1,
  },
  metricLabel: {
    marginTop: 6,
    fontSize: 12,
    color: "#64748b",
    fontWeight: 700,
  },
  policyContextList: {
    display: "grid",
    gap: 14,
  },
  policyCard: {
    display: "grid",
    gridTemplateColumns: "56px 1fr",
    gap: 14,
    alignItems: "start",
    border: "1px solid #e6edf5",
    background: "#f9fbfd",
    borderRadius: 16,
    padding: 16,
  },
  policyIndex: {
    width: 40,
    height: 40,
    borderRadius: 12,
    background: "#eef4ff",
    color: "#1d4ed8",
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
    fontSize: 16,
  },
  policyBody: {
    minWidth: 0,
  },
  policyTitle: {
    fontSize: 14,
    fontWeight: 800,
    color: "#0f172a",
    marginBottom: 10,
  },
  policyParagraphGroup: {
    display: "grid",
    gap: 10,
  },
  policyParagraph: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.9,
    color: "#475569",
    whiteSpace: "normal",
    wordBreak: "break-word",
    overflowWrap: "anywhere",
  },
  emptyState: {
    border: "1px dashed #cbd5e1",
    background: "#f8fbff",
    color: "#64748b",
    borderRadius: 14,
    padding: 18,
    fontSize: 14,
    lineHeight: 1.6,
  },
  emptyCompact: {
    border: "1px dashed #d7e0ea",
    background: "#fcfdff",
    color: "#64748b",
    borderRadius: 12,
    padding: 14,
    fontSize: 13,
    lineHeight: 1.6,
  },
};