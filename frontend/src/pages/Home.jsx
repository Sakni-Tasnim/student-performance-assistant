import { Link } from "react-router-dom"
import "../index.css"
import "./Home.css"

export default function Home() {
  return (
    <div className="page">
      <nav className="nav">
        <div className="container nav-inner">
          <a className="nav-logo" href="/">
            <span></span>
            Student Performance Assistant
          </a>
        </div>
      </nav>

      <main className="home-main container">
        <div className="home-hero fade-up">
          <p className="home-eyebrow">AI-powered academic coaching</p>
          <h1 className="home-title">
            Know exactly what to<br />
            <em>study next.</em>
          </h1>
          <p className="home-subtitle">
            Enter your grades and study habits. Get a personalized weakness
            analysis, targeted recommendations, and a ready-made weekly revision plan.
          </p>
          <Link to="/quiz" className="btn btn-amber">
            Start my analysis
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>

        <div className="home-features fade-up" style={{ animationDelay: "0.1s" }}>
          {[
            { icon: "📊", title: "Performance analysis", desc: "Every subject classified by level; Faible, Moyen, or Bon." },
            { icon: "🎯", title: "Smart recommendations", desc: "Concrete action steps based on your weakest areas and study habits." },
            { icon: "📅", title: "Weekly plan", desc: "A balanced 7-day revision schedule, automatically prioritized." },
          ].map((f) => (
            <div className="feature-card card" key={f.title}>
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}