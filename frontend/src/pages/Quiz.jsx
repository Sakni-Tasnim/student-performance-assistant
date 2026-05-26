import { useState } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import "./Quiz.css"

const HABIT_QUESTIONS = [
  {
    id: "h1",
    text: "How many hours do you study per day on average?",
    options: ["Less than 1h", "1–2 hours", "2–4 hours", "More than 4h"],
  },
  {
    id: "h2",
    text: "When do you usually revise?",
    options: ["Only before exams", "Once a week", "A few times a week", "Every day"],
  },
  {
    id: "h3",
    text: "How would you describe your sleep schedule?",
    options: ["Irregular, often < 6h", "Around 6h", "7–8h regularly", "Very regular"],
  },
  {
    id: "h4",
    text: "Which study technique do you mainly use?",
    options: ["I just re-read my notes", "Summaries / mind maps", "Practice exercises", "Flashcards / active recall"],
  },
  {
    id: "h5",
    text: "How stressed do you feel about your academic performance?",
    options: ["Very stressed", "Somewhat stressed", "Manageable", "Not stressed at all"],
  },
]

const STEPS = ["Your name", "Your grades", "Study habits", "Analyzing..."]

export default function Quiz() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Step 0  name
  const [name, setName] = useState("")

  // Step 1 grades
  const [subjects, setSubjects] = useState([
    { subject: "", grade: "" },
    { subject: "", grade: "" },
    { subject: "", grade: "" },
  ])

  // Step 2  habits
  const [habits, setHabits] = useState({})

  // ---- helpers ----
  const addSubject = () =>
    setSubjects((prev) => [...prev, { subject: "", grade: "" }])

  const removeSubject = (i) =>
    setSubjects((prev) => prev.filter((_, idx) => idx !== i))

  const updateSubject = (i, field, val) =>
    setSubjects((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, [field]: val } : s))
    )

  const selectHabit = (qid, answer) =>
    setHabits((prev) => ({ ...prev, [qid]: answer }))

  // ---- validation ----
  const canProceedStep0 = name.trim().length >= 2

  const canProceedStep1 =
    subjects.length >= 1 &&
    subjects.every(
      (s) =>
        s.subject.trim() !== "" &&
        s.grade !== "" &&
        !isNaN(Number(s.grade)) &&
        Number(s.grade) >= 0 &&
        Number(s.grade) <= 20
    )

  const canProceedStep2 =
    HABIT_QUESTIONS.every((q) => habits[q.id])

  // ---- submit ----
  const handleSubmit = async () => {
    setStep(3)
    setLoading(true)
    setError("")
    try {
      const payload = {
        student_name: name.trim(),
        grades: subjects.map((s) => ({
          subject: s.subject.trim(),
          grade: parseFloat(s.grade),
        })),
        habit_answers: HABIT_QUESTIONS.map((q) => ({
          question_id: q.id,
          question_text: q.text,
          answer: habits[q.id],
        })),
      }

      const res = await axios.post("http://localhost:8000/analyze", payload)
      navigate("/report", { state: { report: res.data, studentName: name } })
    } catch (err) {
      const msg =
        err?.response?.data?.detail || "Something went wrong. Is the backend running?"
      setError(msg)
      setStep(2)
    } finally {
      setLoading(false)
    }
  }

  // ---- render ----
  return (
    <div className="page quiz-page">
      <nav className="nav">
        <div className="container nav-inner">
          <a className="nav-logo" href="/">
            <span></span>
            Student Performance Assistant
          </a>
          <span className="step-label">Step {Math.min(step + 1, 3)} of 3</span>
        </div>
      </nav>

      {/* Progress */}
      <div className="quiz-progress">
        <div
          className="quiz-progress-fill"
          style={{ width: `${((Math.min(step, 2) + 1) / 3) * 100}%` }}
        />
      </div>

      <main className="container quiz-main">

        {/* Step 0 — Name */}
        {step === 0 && (
          <div className="quiz-step fade-up">
            <h2>Let's start with your name</h2>
            <p className="quiz-hint">This helps personalize your report.</p>
            <input
              className="quiz-input"
              type="text"
              placeholder="e.g. Tasnim"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && canProceedStep0 && setStep(1)}
              autoFocus
            />
            <div className="quiz-actions">
              <button
                className="btn btn-amber"
                disabled={!canProceedStep0}
                onClick={() => setStep(1)}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 1 Grades */}
        {step === 1 && (
          <div className="quiz-step fade-up">
            <h2>Enter your grades</h2>
            <p className="quiz-hint">All grades out of 20. Add as many subjects as you like.</p>

            <div className="grades-list">
              {subjects.map((s, i) => (
                <div className="grade-row" key={i}>
                  <input
                    className="quiz-input grade-subject"
                    type="text"
                    placeholder="Subject name"
                    value={s.subject}
                    onChange={(e) => updateSubject(i, "subject", e.target.value)}
                  />
                  <input
                    className="quiz-input grade-score"
                    type="number"
                    placeholder="/ 20"
                    min="0"
                    max="20"
                    step="0.5"
                    value={s.grade}
                    onChange={(e) => updateSubject(i, "grade", e.target.value)}
                  />
                  {subjects.length > 1 && (
                    <button className="remove-btn" onClick={() => removeSubject(i)} title="Remove">
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button className="btn btn-ghost add-btn" onClick={addSubject}>
              + Add subject
            </button>

            <div className="quiz-actions">
              <button className="btn btn-ghost" onClick={() => setStep(0)}>Back</button>
              <button
                className="btn btn-amber"
                disabled={!canProceedStep1}
                onClick={() => setStep(2)}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 2 Habits */}
        {step === 2 && (
          <div className="quiz-step fade-up">
            <h2>Your study habits</h2>
            <p className="quiz-hint">Be honest, this helps us give better advice.</p>

            {error && <div className="quiz-error">{error}</div>}

            <div className="habits-list">
              {HABIT_QUESTIONS.map((q) => (
                <div className="habit-group" key={q.id}>
                  <p className="habit-question">{q.text}</p>
                  <div className="habit-options">
                    {q.options.map((opt) => (
                      <button
                        key={opt}
                        className={`habit-option ${habits[q.id] === opt ? "selected" : ""}`}
                        onClick={() => selectHabit(q.id, opt)}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="quiz-actions">
              <button className="btn btn-ghost" onClick={() => setStep(1)}>Back</button>
              <button
                className="btn btn-amber"
                disabled={!canProceedStep2}
                onClick={handleSubmit}
              >
                Analyze my performance
              </button>
            </div>
          </div>
        )}

        {/* Step 3  Loading */}
        {step === 3 && (
          <div className="quiz-loading fade-in">
            <div className="loader-ring" />
            <h2>Analyzing your performance…</h2>
            <p>Classifying subjects, building your plan, writing your report.</p>
          </div>
        )}

      </main>
    </div>
  )
}