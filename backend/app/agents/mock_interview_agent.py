import json
from typing import Dict, Any, List
from app.agents.base_agent import call_llm
from app.core.logging import logger


class MockInterviewAgent:

    async def start_session(
        self,
        job_description: str,
        difficulty_level: str = "Mid-Level",
        interview_type: str = "Full Interview (Mixed)"
    ) -> Dict[str, Any]:
        """
        Generates an AI interviewer role/trait profile and the 1st question based on job description, difficulty, and interview type.
        """
        system_prompt = f"""You are an expert AI Interview Facilitator.
Target Interview Settings:
- Difficulty Level: {difficulty_level} (Junior = foundational/guided, Mid-Level = standard depth, Senior = probing/technical depth)
- Interview Type: {interview_type} (Technical Round = deep tech skills, HR Round = goals/culture fit, Behavioral Round = STAR framework, Full Interview = mixed blend)

Analyze the provided Job Description and generate a realistic interviewer role/title, professional traits, and the first interview question matching these exact settings.

OUTPUT STRUCTURE:
Output strictly valid JSON matching this exact structure:
```json
{{
  "persona_role": "Interviewer Role (e.g. Senior Full Stack Engineering Manager, Lead Talent Acquisition Partner)",
  "persona_trait": "Personality Trait (e.g. Analytical, collaborative, and solution-focused)",
  "first_question": "Your opening interview question tailored specifically to this job description, difficulty level ({difficulty_level}), and interview type ({interview_type})."
}}
```
Do NOT output any markdown text or commentary outside the JSON block.
"""
        messages = [{"role": "user", "content": f"JOB DESCRIPTION:\n{job_description[:3000]}"}]

        try:
            raw_output = await call_llm(messages=messages, system_prompt=system_prompt)
            logger.info(f"[MockInterviewAgent] Persona generation raw output: {raw_output[:200]}...")

            cleaned = raw_output.replace("```json", "").replace("```", "").strip()
            start = cleaned.find("{")
            end = cleaned.rfind("}")
            if start != -1 and end != -1:
                cleaned = cleaned[start:end + 1]
            parsed = json.loads(cleaned)

            return {
                "persona_name": "AI Interviewer",
                "persona_role": parsed.get("persona_role", "Senior Hiring Manager"),
                "persona_trait": parsed.get("persona_trait", "Empathetic, structured, and goal-oriented"),
                "first_question": parsed.get("first_question", "Welcome to the interview! Could you introduce yourself and explain what attracted you to this role?")
            }
        except Exception as e:
            logger.exception(f"[MockInterviewAgent] Failed to parse persona generation: {e}")
            return {
                "persona_name": "AI Interviewer",
                "persona_role": "Lead Hiring Manager",
                "persona_trait": "Professional and analytical",
                "first_question": "Welcome to our interview! To begin, please walk me through your key experience and why you are interested in this position."
            }

    async def generate_next_question(
        self,
        job_description: str,
        persona: Dict[str, str],
        qa_history: List[Dict[str, Any]],
        current_question_index: int,
        total_questions: int = 7,
        difficulty_level: str = "Mid-Level",
        interview_type: str = "Full Interview (Mixed)"
    ) -> Dict[str, Any]:
        """
        Generates the next role-relevant question based on difficulty level and interview type.
        """
        if current_question_index >= total_questions:
            return {
                "is_complete": True,
                "next_question": None,
                "acknowledgment": "Thank you for completing all questions in this mock interview session."
            }

        persona_role = persona.get("persona_role", "Hiring Manager")
        persona_trait = persona.get("persona_trait", "Professional")

        difficulty_guidance = (
            "Ask foundational questions, supportive phrasing, focusing on core concepts without high pressure."
            if difficulty_level in ["Junior", "Easy"]
            else "Ask probing, technical/strategic follow-up questions expecting deep reasoning and concrete architecture/scenario decisions."
            if difficulty_level in ["Senior", "Hard"]
            else "Ask standard depth questions expecting concrete examples and clear professional reasoning."
        )

        type_guidance = (
            "Focus specifically on code, algorithms, framework architecture, data models, or system design mentioned in the job description."
            if interview_type == "Technical Round"
            else "Focus on career trajectory, motivation, culture fit, communication, leadership, and long-term goals."
            if interview_type == "HR Round"
            else "Ask situational 'Tell me about a time when...' questions requiring the STAR method (Situation, Task, Action, Result)."
            if "Behavioral" in interview_type
            else "Maintain a balanced mix of technical, behavioral, and HR questions."
        )

        system_prompt = f"""You are roleplaying as an AI Interviewer ({persona_role}) with a {persona_trait} interview style.
You are conducting a professional job interview based on this Job Description.

INTERVIEW CONFIGURATION:
- Difficulty Level: {difficulty_level} ({difficulty_guidance})
- Interview Type: {interview_type} ({type_guidance})

INSTRUCTIONS:
1. Briefly acknowledge the candidate's last answer in 1 supportive sentence. Do NOT provide full feedback yet (feedback is given at the end).
2. Ask Question #{current_question_index + 1} of {total_questions}, matching the target difficulty level ({difficulty_level}) and interview type focus ({interview_type}).

OUTPUT STRUCTURE:
Output strictly valid JSON matching this exact structure:
```json
{{
  "is_complete": false,
  "acknowledgment": "Brief 1-sentence acknowledgment of their previous answer.",
  "next_question": "Your next tailored interview question."
}}
```
Do NOT output any text outside the JSON block.
"""
        history_str = json.dumps(qa_history, indent=2)
        messages = [
            {"role": "user", "content": f"JOB DESCRIPTION:\n{job_description[:2000]}\n\nQ&A HISTORY SO FAR:\n{history_str}\n\nAsk question #{current_question_index + 1} of {total_questions}."}
        ]

        try:
            raw_output = await call_llm(messages=messages, system_prompt=system_prompt)
            logger.info(f"[MockInterviewAgent] Next question raw output: {raw_output[:200]}...")

            cleaned = raw_output.replace("```json", "").replace("```", "").strip()
            start = cleaned.find("{")
            end = cleaned.rfind("}")
            if start != -1 and end != -1:
                cleaned = cleaned[start:end + 1]
            parsed = json.loads(cleaned)

            return {
                "is_complete": False,
                "acknowledgment": parsed.get("acknowledgment", "Thank you for sharing that perspective."),
                "next_question": parsed.get("next_question", f"Could you elaborate on how your experience aligns with the requirements of this role?")
            }
        except Exception as e:
            logger.exception(f"[MockInterviewAgent] Failed to generate next question: {e}")
            return {
                "is_complete": False,
                "acknowledgment": "Thank you for your response.",
                "next_question": "Can you describe a challenging scenario you encountered in a past project and how you resolved it?"
            }

    async def generate_summary(
        self,
        job_description: str,
        persona: Dict[str, str],
        qa_history: List[Dict[str, Any]],
        difficulty_level: str = "Mid-Level",
        interview_type: str = "Full Interview (Mixed)"
    ) -> Dict[str, Any]:
        """
        Generates end-of-interview feedback: strengths, improvement areas, readiness score, and overall note.
        Evaluates answers strictly relative to the selected difficulty level and interview type (e.g. STAR method check for Behavioral).
        """
        persona_role = persona.get("persona_role", "Hiring Manager")

        system_prompt = f"""You are an AI Interviewer ({persona_role}).
The candidate has completed the mock interview for the target job description.

EVALUATION CONTEXT:
- Target Difficulty Level: {difficulty_level} (Strictness: Senior level expects deep technical reasoning and metric-driven results; Junior level expects solid foundational understanding).
- Interview Type: {interview_type} (If Behavioral Round or mixed behavioral questions, explicitly evaluate whether candidate answers followed the STAR method: Situation, Task, Action, Result, and note STAR compliance in feedback).

OUTPUT STRUCTURE:
Output strictly valid JSON matching this exact structure:
```json
{{
  "strengths": [
    "Specific strength point 1 with context from candidate's answers",
    "Specific strength point 2",
    "Specific strength point 3"
  ],
  "improvement_areas": [
    "Specific actionable area for improvement 1 (evaluate relative to {difficulty_level} standard)",
    "Specific actionable area for improvement 2",
    "Specific actionable area for improvement 3"
  ],
  "readiness_score": "8.5 / 10",
  "readiness_note": "A clear 2-3 sentence executive summary of candidate readiness relative to {difficulty_level} expectations and STAR method compliance."
}}
```
Do NOT output any text outside the JSON block.
"""
        history_str = json.dumps(qa_history, indent=2)
        messages = [
            {"role": "user", "content": f"JOB DESCRIPTION:\n{job_description[:2000]}\n\nCOMPLETE INTERVIEW TRANSCRIPT:\n{history_str}"}
        ]

        try:
            raw_output = await call_llm(messages=messages, system_prompt=system_prompt)
            logger.info(f"[MockInterviewAgent] Summary feedback raw output: {raw_output[:200]}...")

            cleaned = raw_output.replace("```json", "").replace("```", "").strip()
            start = cleaned.find("{")
            end = cleaned.rfind("}")
            if start != -1 and end != -1:
                cleaned = cleaned[start:end + 1]
            parsed = json.loads(cleaned)

            return {
                "strengths": parsed.get("strengths") or ["Clear articulation of past technical achievements.", "Good alignment with role requirements."],
                "improvement_areas": parsed.get("improvement_areas") or ["Use the STAR method (Situation, Task, Action, Result) for behavioral answers.", "Quantify project outcomes with concrete metrics."],
                "readiness_score": parsed.get("readiness_score") or "8.0 / 10",
                "readiness_note": parsed.get("readiness_note") or "Overall strong candidate performance. With minor refinement in structuring behavioral answers, you are well prepared for real interviews."
            }
        except Exception as e:
            logger.exception(f"[MockInterviewAgent] Failed to generate summary feedback: {e}")
            return {
                "strengths": ["Demonstrated strong enthusiasm for the role.", "Good clarity in technical explanations."],
                "improvement_areas": ["Include more specific results in behavioral responses.", "Structure answers concisely."],
                "readiness_score": "8.0 / 10",
                "readiness_note": "Good performance overall. Keep practicing to refine your responses for senior interview rounds."
            }


mock_interview_agent = MockInterviewAgent()
