import { useLocation, useNavigate, Link } from "react-router-dom"
import "./Report.css"

const LEVEL_COLOR = { Faible: "faible", Moyen: "moyen", Bon: "bon" }

export default function Report() {
  const { state } = useLocation()
  const navigate = useNavigate()

  // Guard  if someone lands here directly with no data
  if (!state?.report) {
    return (
      <div className="page" style={{ alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--muted)", marginBottom: 16 }}>No report found.</p>
        <Link to="/" className="btn btn-primary">Go home</Link>
      </div>
    )
  }

  const { report, studentName } = state
  const { summary, classifications, recommendations, weekly_plan, warning, motivation } = report

  const avg =
    classifications.reduce((s, c) => s + c.grade, 0) / classifications.length

  return (
    <div className="page report-page">
      <nav className="nav">
        <div className="container nav-inner">
          <a className="nav-logo" href="/">
            <span></span>
            Student Performance Assistant
          </a>
          <button className="btn btn-ghost" onClick={() => navigate("/quiz")}>
            New analysis
          </button>
        </div>
      </nav>

      <main className="container report-main">

        {/* Header */}
        <div className="report-header fade-up">
          <p className="report-eyebrow">Performance report</p>
          <h1>{studentName}'s Report</h1>
          <p className="report-summary">{summary}</p>
        </div>

        {/* Warning */}
        {warning && (
          <div className="report-warning fade-up" style={{ animationDelay: "0.05s" }}>
            <span>⚠️</span>
            <p>{warning}</p>
          </div>
        )}

        {/* Average + Classifications */}
        <section className="report-section fade-up" style={{ animationDelay: "0.1s" }}>
          <div className="section-header">
            <h2>Subject overview</h2>
            <div className="avg-badge">
              Avg <strong>{avg.toFixed(1)}</strong> / 20
            </div>
          </div>

          <div className="classifications-grid">
            {classifications.map((c) => (
              <div className="subject-card card" key={c.subject}>
                <div className="subject-top">
                  <span className="subject-name">{c.subject}</span>
                  <span className={`badge badge-${LEVEL_COLOR[c.level]}`}>{c.level}</span>
                </div>
                <div className="subject-grade">{c.grade} / 20</div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${(c.grade / 20) * 100}%`,
                      background:
                        c.level === "Faible" ? "var(--faible)" :
                        c.level === "Moyen"  ? "var(--moyen)"  : "var(--bon)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recommendations */}
        <section className="report-section fade-up" style={{ animationDelay: "0.15s" }}>
          <div className="section-header">
            <h2>Recommendations</h2>
          </div>
          <div className="recs-list">
            {recommendations.map((rec, i) => (
              <div className="rec-item card" key={i}>
                <div className="rec-number">{i + 1}</div>
                <p>{rec}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Weekly Plan */}
        <section className="report-section fade-up" style={{ animationDelay: "0.2s" }}>
          <div className="section-header">
            <h2>Weekly revision plan</h2>
          </div>
          <div className="plan-table card">
            {weekly_plan.map((day, i) => (
              <div className={`plan-row ${i % 2 === 0 ? "plan-row-alt" : ""}`} key={day.day}>
                <div className="plan-day">{day.day}</div>
                <div className="plan-subject">{day.subject}</div>
                <div className="plan-objective">{day.objective}</div>
                {day.priority_level !== "All" && (
                  <span className={`badge badge-${LEVEL_COLOR[day.priority_level] || "bon"}`}>
                    {day.priority_level}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Motivation */}
        <div className="report-motivation fade-up" style={{ animationDelay: "0.25s" }}>
          <p>{motivation}</p>
        </div>

        <div className="report-actions fade-up" style={{ animationDelay: "0.3s" }}>
          <button className="btn btn-primary" onClick={() => navigate("/quiz")}>
            Run a new analysis
          </button>
        </div>

      </main>
    </div>
  )
}