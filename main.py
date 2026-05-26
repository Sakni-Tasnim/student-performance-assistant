# Student Performance Assistant — FastAPI Backend
# Same stack as VitalBuddy: FastAPI + OpenRouter (GPT-3.5)
# New additions: classification engine, planning generator, habit analysis

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
from typing import List, Optional
import os
import json
import requests
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Student Performance Assistant API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_key = os.getenv("OPENROUTER_API_KEY")
if not api_key:
    print("⚠️  Warning: OPENROUTER_API_KEY not found in .env file!")


# ---------------------------------------------------------------------------
# Pydantic Models
# ---------------------------------------------------------------------------

class SubjectGrade(BaseModel):
    """One subject with its average grade (out of 20)"""
    subject: str
    grade: float  # 0–20 scale

    @field_validator("grade")
    @classmethod
    def clamp_grade(cls, v):
        if not (0 <= v <= 20):
            raise ValueError("Grade must be between 0 and 20")
        return round(v, 2)


class HabitAnswer(BaseModel):
    """A single study-habit question-answer pair"""
    question_id: str
    question_text: str
    answer: str


class AnalysisRequest(BaseModel):
    """Full incoming request from the frontend"""
    student_name: str
    grades: List[SubjectGrade]           # list of subjects + grades
    habit_answers: List[HabitAnswer]     # quiz-style study habit answers


class SubjectClassification(BaseModel):
    subject: str
    grade: float
    level: str          # "Weak" | "Average" | "Good"
    priority: int       # 1 = highest priority for revision


class DayPlan(BaseModel):
    day: str
    subject: str
    objective: str
    priority_level: str


class PerformanceReport(BaseModel):
    """Full structured response sent back to the frontend"""
    summary: str
    classifications: List[SubjectClassification]
    recommendations: List[str]
    weekly_plan: List[DayPlan]
    warning: Optional[str] = None
    motivation: str


# ---------------------------------------------------------------------------
# Classification Engine  (rule-based, no LLM needed)
# ---------------------------------------------------------------------------

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def classify_subjects(grades: List[SubjectGrade]) -> List[SubjectClassification]:
    """
    Classify each subject into Weak / Average / Good based on grade thresholds.
    Priority: Weak=1, Average=2, Good=3
    """
    classifications = []
    for idx, sg in enumerate(sorted(grades, key=lambda x: x.grade)):  # sort ascending so weakest first
        if sg.grade < 10:
            level, priority = "Weak", 1
        elif sg.grade < 14:
            level, priority = "Average", 2
        else:
            level, priority = "Good", 3

        classifications.append(SubjectClassification(
            subject=sg.subject,
            grade=sg.grade,
            level=level,
            priority=priority,
        ))
    return classifications


def generate_planning(classifications: List[SubjectClassification]) -> List[DayPlan]:
    """
    Build a balanced 7-day revision plan.
    Rules:
      - Weak subjects get 2–3 days, spread across the week
      - Average subjects get 1–2 days
      - Good subjects get 1 consolidation day
      - Sunday is always a general review day
    """
    Weak = [c for c in classifications if c.level == "Weak"]
    Average  = [c for c in classifications if c.level == "Average"]
    Good   = [c for c in classifications if c.level == "Good"]

    # Build a slot list for Mon–Sat (6 workdays), then Sunday = review
    slots = []  # list of (subject, objective, priority_level)

    # Weak subjects fill first slots, repeated if few subjects
    for c in Weak:
        slots.append((c.subject, f"Targeted revision — focus on weakest chapters (Weak, priority 1)", "Weak"))
        if len(Weak) == 1:
            # Give this subject an extra day since it's the only weak one
            slots.append((c.subject, f"Practice exercises & quiz consolidation (Weak, priority 1)", "Weak"))

    for c in Average:
        slots.append((c.subject, f"Targeted exercises — reinforce medium chapters (Average, priority 2)", "Average"))

    for c in Good:
        slots.append((c.subject, f"Consolidation — advance to next chapter (Good, priority 3)", "Good"))

    # Fill to 6 days by cycling through Weak/Average again if slots < 6
    idx = 0
    while len(slots) < 6 and len(classifications) > 0:
        c = (Weak + Average + Good)[idx % len(classifications)]
        slots.append((c.subject, "Extra practice session", c.level))
        idx += 1

    slots = slots[:6]  # cap at 6 days

    plan = []
    for i, (subj, obj, lvl) in enumerate(slots):
        plan.append(DayPlan(
            day=DAYS[i],
            subject=subj,
            objective=obj,
            priority_level=lvl,
        ))

    # Sunday is always general review
    plan.append(DayPlan(
        day="Sunday",
        subject="General review",
        objective="Re-read notes, prepare flashcards, plan next week",
        priority_level="All",
    ))

    return plan


# ---------------------------------------------------------------------------
# Prompt Builder
# ---------------------------------------------------------------------------

def build_student_prompt(
    student_name: str,
    classifications: List[SubjectClassification],
    habit_answers: List[HabitAnswer],
    weekly_plan: List[DayPlan],
) -> str:
    """
    Build the LLM prompt. The classification & planning are already done
    rule-based — we pass them to the LLM so it can write natural, personalized
    text around them (summary, recommendations, warning, motivation).
    """

    classification_text = "\n".join([
        f"  - {c.subject}: {c.grade}/20 → {c.level} (priority {c.priority})"
        for c in classifications
    ])

    habits_text = "\n".join([
        f"  - {h.question_text}: {h.answer}"
        for h in habit_answers
    ])

    plan_text = "\n".join([
        f"  - {p.day}: {p.subject} — {p.objective}"
        for p in weekly_plan
    ])

    prompt = f"""
You are StudyBuddy AI 🎓, a supportive and intelligent academic coach.
Your role is to write personalized, encouraging, and actionable content for a student based on their performance data.

STUDENT NAME: {student_name}

ACADEMIC PERFORMANCE (already classified):
{classification_text}

STUDY HABITS (from quiz):
{habits_text}

WEEKLY REVISION PLAN (already generated):
{plan_text}

YOUR TASK:
Write the text sections of the student's performance report. The classification and planning are already done — your job is to make them feel personal, warm, and useful.

RULES:
1. Reference the student's actual subjects and grades — be specific, not generic.
2. Match tone to performance: if many subjects are Weak, be encouraging but honest. If mostly Good, be celebratory.
3. Recommendations must be concrete action items (start with verbs: "Revise", "Practice", "Schedule", "Try", "Focus on").
4. Generate exactly 4 recommendations: 2 for weak subjects, 1 for study habits, 1 meta/strategy tip.
5. Only include a warning if grades suggest a serious academic risk (average < 9) or if habit answers reveal a concerning pattern (e.g. student never sleeps, extreme stress). Otherwise set warning to null.
6. Use some emojis to keep it warm but don't overdo it (max 1–2 per field).

STRICT JSON RESPONSE FORMAT (no markdown, no backticks, raw JSON only):
{{
    "summary": "2–3 sentences greeting {student_name} warmly, acknowledging their specific situation based on their grades and habits. Be personal.",
    "recommendations": [
        "Recommendation 1 (weak subject focus)",
        "Recommendation 2 (weak subject focus)",
        "Recommendation 3 (study habit improvement)",
        "Recommendation 4 (strategy/meta tip)"
    ],
    "warning": "Gentle caution if academically at risk, otherwise null",
    "motivation": "One punchy closing sentence to energize them for the week ahead 💪"
}}
"""
    return prompt


# ---------------------------------------------------------------------------
# Main Endpoint
# ---------------------------------------------------------------------------

@app.post("/analyze", response_model=PerformanceReport)
async def analyze_student(data: AnalysisRequest):
    """
    Main endpoint. Steps:
    1. Classify subjects (rule-based)
    2. Generate weekly plan (rule-based)
    3. Call LLM for personalized text (summary, recommendations, warning, motivation)
    4. Return full PerformanceReport
    """
    try:
        # Step 1  classify
        classifications = classify_subjects(data.grades)

        # Step 2  generate plan
        weekly_plan = generate_planning(classifications)

        # Step 3  build prompt and call LLM
        prompt = build_student_prompt(
            student_name=data.student_name,
            classifications=classifications,
            habit_answers=data.habit_answers,
            weekly_plan=weekly_plan,
        )

        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:5173",
                "X-Title": "Student Performance Assistant",
            },
            json={
                "model": "openai/gpt-3.5-turbo",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.7,
            },
        )

        if response.status_code != 200:
            error_detail = response.text
            try:
                err = response.json()
                if "error" in err and "message" in err["error"]:
                    error_detail = err["error"]["message"]
            except Exception:
                pass
            raise Exception(f"OpenRouter API error {response.status_code}: {error_detail}")

        result = response.json()

        if "choices" not in result or not result["choices"]:
            raise Exception(f"Unexpected OpenRouter response format: {result}")

        raw_text = result["choices"][0]["message"]["content"].strip()
        print("🧠 LLM raw response:", raw_text[:300])

        # Strip markdown fences if present
        clean = raw_text
        if clean.startswith("```json"):
            clean = clean[7:]
        elif clean.startswith("```"):
            clean = clean[3:]
        if clean.endswith("```"):
            clean = clean[:-3]
        clean = clean.strip()

        ai_data = json.loads(clean)

        # Step 4 — assemble and return
        report = PerformanceReport(
            summary=ai_data.get("summary", f"Hi {data.student_name}! Here's your performance report."),
            classifications=classifications,
            recommendations=ai_data.get("recommendations", ["Keep revising consistently."]),
            weekly_plan=weekly_plan,
            warning=ai_data.get("warning"),
            motivation=ai_data.get("motivation", "You've got this! 💪"),
        )

        print(f"✅ Report generated for {data.student_name} — "
              f"{len(classifications)} subjects, {len(weekly_plan)} days planned")
        return report

    except json.JSONDecodeError as e:
        print(f"❌ JSON parse error: {e}")
        raise HTTPException(status_code=500, detail=f"LLM returned invalid JSON: {str(e)}")
    except Exception as e:
        print(f"❌ Error: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


# ---------------------------------------------------------------------------
# Utility Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "Student Performance Assistant",
        "ai_connected": bool(api_key),
    }


@app.get("/sample-request")
async def sample_request():
    """Returns an example request body so the frontend dev knows the shape"""
    return {
        "student_name": "Tasnim",
        "grades": [
            {"subject": "Algorithmique", "grade": 8.5},
            {"subject": "Réseaux", "grade": 11.0},
            {"subject": "Base de données", "grade": 15.5},
            {"subject": "Mathématiques", "grade": 9.0},
            {"subject": "Architecture systèmes", "grade": 13.0},
        ],
        "habit_answers": [
            {"question_id": "h1", "question_text": "How many hours do you study per day?", "answer": "1–2 hours"},
            {"question_id": "h2", "question_text": "Do you revise before exams only or regularly?", "answer": "Only before exams"},
            {"question_id": "h3", "question_text": "How is your sleep schedule?", "answer": "Irregular, often less than 6h"},
            {"question_id": "h4", "question_text": "Do you use any study techniques (flashcards, summaries)?", "answer": "No, I just re-read my notes"},
        ],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)