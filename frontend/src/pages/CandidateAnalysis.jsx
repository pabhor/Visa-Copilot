import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  analyzeCandidateProfile,
  fetchCandidateAnalysisHistory,
  fetchCandidateProfileById,
} from "../db/candidateProfileDB";

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === "") return [];
  return [value];
}

function toText(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatParagraphs(text) {
  if (!text) return [];
  return text
    .split(/\n\s*\n/)
    .map((x) => x.replace(/\n/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function normalizeResult(result) {
  const analysis = isObject(result?.analysis) ? result.analysis : {};
  const overview = isObject(analysis?.analysis_overview) ? analysis.analysis_overview : {};
  const evaluation = isObject(result?.evaluation) ? result.evaluation : {};
  const feedback = isObject(evaluation?.feedback) ? evaluation.feedback : {};

  return {
    analysis: {
      analysis_overview: {
        readiness_score: Number(overview.readiness_score || 0),
        case_assessment: toText(overview.case_assessment || ""),
        strengths: toArray(overview.strengths).map(toText).filter(Boolean),
        gaps: toArray(overview.gaps).map(toText).filter(Boolean),
        key_risks: toArray(overview.key_risks).map(toText).filter(Boolean),
      },
      candidate_profile_summary: toText(analysis?.candidate_profile_summary || ""),
      required_documents: toArray(analysis.required_documents),
      criterion_breakdown: toArray(analysis.criterion_breakdown),
      strategic_next_steps: toArray(analysis.strategic_next_steps).map(toText).filter(Boolean),
      detailed_summary: toText(analysis.detailed_summary || ""),
    },
    evaluation: {
      overall_score: Number(evaluation.overall_score || 0),
      policy_alignment: Number(evaluation.policy_alignment || 0),
      factual_grounding: Number(evaluation.factual_grounding || 0),
      completeness: Number(evaluation.completeness || 0),
      structure_quality: Number(evaluation.structure_quality || 0),
      feedback: {
        strengths: toArray(feedback.strengths).map(toText).filter(Boolean),
        issues: toArray(feedback.issues).map(toText).filter(Boolean),
        missing_points: toArray(feedback.missing_points).map(toText).filter(Boolean),
        refinement_instructions: toArray(feedback.refinement_instructions).map(toText).filter(Boolean),
      },
    },
    analysis_meta: isObject(result?.analysis_meta) ? result.analysis_meta : {},
    retrieved_context: toArray(result?.retrieved_context).map(toText),
    run_history: toArray(result?.run_history),
  };
}

export default function CandidateAnalysis() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");
        const profileData = await fetchCandidateProfileById(id);
        setProfile(profileData);

        try {
          const historyData = await fetchCandidateAnalysisHistory(id);
          setHistory(Array.isArray(historyData?.runs) ? historyData.runs : []);
        } catch {
          setHistory([]);
        }
      } catch (err) {
        setError(err?.message || "Failed to load candidate profile");
      } finally {
        setLoading(false);
      }
    }

    if (id) load();
  }, [id]);

  async function handleRunAnalysis() {
    try {
      setAnalysisLoading(true);
      setError("");
      const data = await analyzeCandidateProfile(id);
      const normalized = normalizeResult(data);
      setResult(normalized);

      const historyData = await fetchCandidateAnalysisHistory(id);
      setHistory(Array.isArray(historyData?.runs) ? historyData.runs : []);
    } catch (err) {
      setError(err?.message || "Failed to analyze candidate");
    } finally {
      setAnalysisLoading(false);
    }
  }

  const payload = isObject(profile?.payload) ? profile.payload : {};
  const candidate = isObject(payload?.candidate) ? payload.candidate : {};
  const employer = isObject(payload?.employer_context) ? payload.employer_context : {};
  const achievements = isObject(payload?.achievements) ? payload.achievements : {};

  const analysis = result?.analysis || {};
  const overview = analysis?.analysis_overview || {};
  const evaluation = result?.evaluation || {};
  const feedback = evaluation?.feedback || {};

  const score = Math.max(0, Math.min(100, Number(overview?.readiness_score || 0)));

  const scoreTheme = useMemo(() => {
    if (score >= 75) return { label: "Strong O-1 Potential", bg: "#dcfce7", color: "#166534" };
    if (score >= 50) return { label: "Moderate Potential", bg: "#fef3c7", color: "#92400e" };
    return { label: "Needs More Evidence", bg: "#fee2e2", color: "#991b1b" };
  }, [score]);

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.top}>
          <div>
            <button onClick={() => navigate("/saved-candidates")} style={styles.backBtn}>
              ← Back to All Applications
            </button>
            <h1 style={styles.title}>
              {profile?.candidate_name || candidate?.full_name || "Candidate Analysis"}
            </h1>
            <p style={styles.subtitle}>O-1 analysis with Ollama generation and Gemini evaluation</p>
          </div>

          <button
            onClick={handleRunAnalysis}
            disabled={analysisLoading || !id}
            style={styles.runBtn}
          >
            {analysisLoading ? "Running Analysis..." : "Run Analysis"}
          </button>
        </div>

        {loading && <div style={styles.info}>Loading profile...</div>}
        {error && <div style={styles.error}>{error}</div>}

        {!loading && profile && (
          <>
            <div style={styles.grid3}>
              <Card title="Candidate">
                <KeyValue label="Email" value={profile?.candidate_email || candidate?.email} />
                <KeyValue label="Role" value={profile?.current_role || candidate?.current_role} />
                <KeyValue label="Company" value={candidate?.current_company} />
                <KeyValue label="Location" value={candidate?.current_location} />
                <KeyValue label="Citizenship" value={candidate?.country_of_citizenship} />
              </Card>

              <Card title="Employer Context">
                <KeyValue label="Employer" value={profile?.employer_name || employer?.company_name} />
                <KeyValue label="Company Stage" value={employer?.company_stage} />
                <KeyValue label="Offered Role" value={employer?.offered_role} />
                <KeyValue label="Salary" value={toText(employer?.offered_salary_usd)} />
                <KeyValue label="Work Mode" value={employer?.remote_or_onsite} />
              </Card>

              <Card title="Evidence Metrics">
                <KeyValue label="Publications" value={toText(achievements?.publications_count || 0)} />
                <KeyValue label="Patents" value={toText(achievements?.patents_count || 0)} />
                <KeyValue label="Awards" value={toText(achievements?.awards_count || 0)} />
                <KeyValue label="Reco Letters" value={toText(achievements?.recommendation_letters_count || 0)} />
                <KeyValue label="Speaking" value={toText(achievements?.speaking_engagements_count || 0)} />
                <KeyValue label="Media" value={toText(achievements?.media_mentions_count || 0)} />
              </Card>
            </div>

            <div style={styles.grid2}>
              <Card title="Final Analysis Overview">
                <div style={{ ...styles.badge, background: scoreTheme.bg, color: scoreTheme.color }}>
                  {scoreTheme.label}
                </div>
                <div style={styles.score}>{score}/100</div>
                <p style={styles.paragraph}>
                  {overview?.case_assessment || "Run analysis to generate overview."}
                </p>
              </Card>

              <Card title="Gemini Evaluation Summary">
                <Metric label="Overall Score" value={evaluation?.overall_score || 0} />
                <Metric label="Policy Alignment" value={evaluation?.policy_alignment || 0} />
                <Metric label="Factual Grounding" value={evaluation?.factual_grounding || 0} />
                <Metric label="Completeness" value={evaluation?.completeness || 0} />
                <Metric label="Structure Quality" value={evaluation?.structure_quality || 0} />
              </Card>
            </div>

            <Card title="Candidate Profile Summary">
              {analysis?.candidate_profile_summary ? (
                formatParagraphs(analysis.candidate_profile_summary).map((p, i) => (
                  <p key={i} style={styles.paragraph}>{p}</p>
                ))
              ) : (
                <Empty text="Run analysis to generate candidate summary." />
              )}
            </Card>

            <div style={styles.grid2}>
              <ListCard title="Strengths" items={overview?.strengths || []} />
              <ListCard title="Gaps" items={overview?.gaps || []} />
            </div>

            <div style={styles.grid2}>
              <ListCard title="Key Risks" items={overview?.key_risks || []} />
              <ListCard title="Strategic Next Steps" items={analysis?.strategic_next_steps || []} />
            </div>

            <Card title="Required Documents">
              {Array.isArray(analysis?.required_documents) && analysis.required_documents.length ? (
                analysis.required_documents.map((doc, idx) => (
                  <div key={idx} style={styles.docCard}>
                    <div style={styles.docTitle}>
                      {idx + 1}. {toText(doc?.document_name || "Supporting Document")}
                    </div>
                    <div style={styles.docMeta}>Priority: {toText(doc?.priority || "medium")}</div>
                    <p style={styles.paragraph}>{toText(doc?.description)}</p>
                    <p style={styles.paragraph}><strong>Why this matters:</strong> {toText(doc?.tie_to_candidate_profile)}</p>
                  </div>
                ))
              ) : (
                <Empty text="Run analysis to generate required documents." />
              )}
            </Card>

            <Card title="Criterion Breakdown">
              {Array.isArray(analysis?.criterion_breakdown) && analysis.criterion_breakdown.length ? (
                analysis.criterion_breakdown.map((item, idx) => (
                  <div key={idx} style={styles.criteriaCard}>
                    <div style={styles.criteriaTop}>
                      <strong>{toText(item?.criterion)}</strong>
                      <span style={styles.smallBadge}>{toText(item?.status || "insufficient")}</span>
                    </div>
                    <p style={styles.paragraph}><strong>Evidence Found:</strong> {toText(item?.evidence_found)}</p>
                    <p style={styles.paragraph}><strong>Why It Matters:</strong> {toText(item?.why_it_matters)}</p>
                    <p style={styles.paragraph}><strong>Improvement Steps:</strong> {toText(item?.improvement_steps)}</p>
                  </div>
                ))
              ) : (
                <Empty text="Run analysis to generate criterion breakdown." />
              )}
            </Card>

            <Card title="Detailed Summary">
              {analysis?.detailed_summary ? (
                formatParagraphs(analysis.detailed_summary).map((p, i) => (
                  <p key={i} style={styles.paragraph}>{p}</p>
                ))
              ) : (
                <Empty text="Run analysis to generate detailed summary." />
              )}
            </Card>

            <div style={styles.grid2}>
              <ListCard title="Gemini Feedback Strengths" items={feedback?.strengths || []} />
              <ListCard title="Gemini Feedback Issues" items={feedback?.issues || []} />
            </div>

            <div style={styles.grid2}>
              <ListCard title="Missing Points" items={feedback?.missing_points || []} />
              <ListCard title="Refinement Instructions Used" items={feedback?.refinement_instructions || []} />
            </div>

            <Card title="Run History">
              {history.length ? (
                history.map((run) => (
                  <div key={run.analysis_run_id} style={styles.historyCard}>
                    <div style={styles.historyHeader}>
                      <div>
                        <strong>{run.run_type}</strong> · {run.generator_model} · {run.prompt_version}
                      </div>
                      <div>{run.selected_final ? "FINAL" : "NOT FINAL"}</div>
                    </div>
                    {Array.isArray(run.evaluations) && run.evaluations.length ? (
                      run.evaluations.map((ev) => (
                        <div key={ev.evaluation_run_id} style={styles.evalRow}>
                          Overall: {ev.overall_score} | Policy: {ev.policy_alignment} | Grounding: {ev.factual_grounding} | Completeness: {ev.completeness} | Structure: {ev.structure_quality}
                        </div>
                      ))
                    ) : (
                      <div style={styles.muted}>No evaluation stored.</div>
                    )}
                  </div>
                ))
              ) : (
                <Empty text="No analysis history yet." />
              )}
            </Card>

            <Card title="Retrieved Policy Context">
              {Array.isArray(result?.retrieved_context) && result.retrieved_context.length ? (
                result.retrieved_context.map((chunk, idx) => (
                  <div key={idx} style={styles.contextCard}>
                    <div style={styles.docTitle}>Context {idx + 1}</div>
                    <p style={styles.paragraph}>{chunk}</p>
                  </div>
                ))
              ) : (
                <Empty text="Run analysis to view retrieved context." />
              )}
            </Card>

            <div style={{ marginTop: 24 }}>
              <Link to="/saved-candidates" style={styles.linkBtn}>
                Back to Saved Candidates
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div style={styles.card}>
      <h2 style={styles.cardTitle}>{title}</h2>
      {children}
    </div>
  );
}

function KeyValue({ label, value }) {
  return (
    <div style={styles.kv}>
      <div style={styles.kvLabel}>{label}</div>
      <div style={styles.kvValue}>{toText(value) || "N/A"}</div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div style={styles.metric}>
      <div style={styles.metricLabel}>{label}</div>
      <div style={styles.metricValue}>{Number(value || 0).toFixed(1)}</div>
    </div>
  );
}

function ListCard({ title, items }) {
  return (
    <Card title={title}>
      {Array.isArray(items) && items.length ? (
        <ul style={styles.list}>
          {items.map((item, idx) => (
            <li key={idx} style={styles.listItem}>{toText(item)}</li>
          ))}
        </ul>
      ) : (
        <Empty text={`No ${title.toLowerCase()} yet.`} />
      )}
    </Card>
  );
}

function Empty({ text }) {
  return <div style={styles.empty}>{text}</div>;
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f4f7fb",
    padding: 24,
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  container: {
    maxWidth: 1400,
    margin: "0 auto",
  },
  top: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "flex-start",
    marginBottom: 20,
    flexWrap: "wrap",
  },
  backBtn: {
    marginBottom: 12,
    border: "1px solid #cbd5e1",
    background: "#fff",
    borderRadius: 12,
    padding: "10px 14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  title: {
    margin: 0,
    fontSize: 36,
    color: "#0f172a",
  },
  subtitle: {
    color: "#64748b",
    marginTop: 8,
  },
  runBtn: {
    border: "none",
    background: "linear-gradient(90deg, #2563eb 0%, #4f46e5 100%)",
    color: "#fff",
    borderRadius: 14,
    padding: "14px 18px",
    fontWeight: 800,
    cursor: "pointer",
  },
  info: {
    background: "#fff",
    borderRadius: 16,
    padding: 16,
    border: "1px solid #dbe3ef",
    marginBottom: 16,
  },
  error: {
    background: "#fff1f2",
    color: "#be123c",
    borderRadius: 16,
    padding: 16,
    border: "1px solid #fecdd3",
    marginBottom: 16,
  },
  grid3: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 16,
    marginBottom: 16,
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 16,
    marginBottom: 16,
  },
  card: {
    background: "#fff",
    borderRadius: 20,
    padding: 20,
    border: "1px solid #e2e8f0",
    boxShadow: "0 10px 30px rgba(15,23,42,0.05)",
    marginBottom: 16,
  },
  cardTitle: {
    marginTop: 0,
    marginBottom: 16,
    color: "#0f172a",
  },
  kv: {
    display: "grid",
    gridTemplateColumns: "140px 1fr",
    gap: 12,
    padding: "10px 0",
    borderBottom: "1px solid #eff4fa",
  },
  kvLabel: {
    fontWeight: 800,
    color: "#64748b",
    fontSize: 13,
    textTransform: "uppercase",
  },
  kvValue: {
    color: "#0f172a",
    fontWeight: 600,
    wordBreak: "break-word",
  },
  badge: {
    display: "inline-block",
    padding: "6px 12px",
    borderRadius: 999,
    fontWeight: 800,
    marginBottom: 12,
  },
  score: {
    fontSize: 44,
    fontWeight: 900,
    color: "#0f172a",
    marginBottom: 8,
  },
  paragraph: {
    color: "#334155",
    lineHeight: 1.8,
  },
  metric: {
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 0",
    borderBottom: "1px solid #eff4fa",
  },
  metricLabel: {
    color: "#64748b",
    fontWeight: 700,
  },
  metricValue: {
    color: "#0f172a",
    fontWeight: 900,
  },
  list: {
    margin: 0,
    paddingLeft: 20,
  },
  listItem: {
    marginBottom: 10,
    lineHeight: 1.7,
    color: "#334155",
  },
  empty: {
    border: "1px dashed #cbd5e1",
    borderRadius: 14,
    padding: 14,
    color: "#64748b",
    background: "#f8fbff",
  },
  docCard: {
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    background: "#f9fbff",
  },
  docTitle: {
    fontWeight: 900,
    color: "#0f172a",
    marginBottom: 8,
  },
  docMeta: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: 800,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  criteriaCard: {
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    background: "#f9fbff",
  },
  criteriaTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
  },
  smallBadge: {
    borderRadius: 999,
    background: "#eef2ff",
    color: "#3730a3",
    padding: "6px 10px",
    fontWeight: 800,
    textTransform: "capitalize",
    fontSize: 12,
  },
  historyCard: {
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    background: "#f9fbff",
  },
  historyHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
    fontWeight: 800,
    color: "#0f172a",
    flexWrap: "wrap",
  },
  evalRow: {
    color: "#334155",
    lineHeight: 1.8,
    marginBottom: 6,
  },
  muted: {
    color: "#64748b",
  },
  contextCard: {
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    background: "#f9fbff",
  },
  linkBtn: {
    textDecoration: "none",
    display: "inline-block",
    background: "#fff",
    color: "#0f172a",
    border: "1px solid #cbd5e1",
    borderRadius: 12,
    padding: "12px 16px",
    fontWeight: 700,
  },
};