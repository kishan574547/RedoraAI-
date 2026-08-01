from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.services.gpa_calculator import calculate_gpa
from app.db.models.gpa_record import GpaRecord
from app.db.models.activity_log import ActivityLog


def calculate_gpa_action(subjects: List[Dict[str, Any]], scale: float = 10.0) -> Dict[str, Any]:
    """
    Calculate weighted GPA for given subjects list without saving.
    subjects format: [{"name": "Math", "credits": 4.0, "grade_point": 9.0, "grade": "A"}]
    """
    if not subjects:
        return {
            "success": False,
            "message": "No subjects provided for GPA calculation."
        }

    try:
        res = calculate_gpa(subjects, scale=scale)
        subject_summary = ", ".join([f"{s['name']} ({s['credits']} cr, GP: {s['grade_point']})" for s in res["subjects"]])
        return {
            "success": True,
            "calculated_gpa": res["calculated_gpa"],
            "total_credits": res["total_credits"],
            "scale": res["scale"],
            "message": f"Calculated GPA: {res['calculated_gpa']} / {res['scale']} across {res['total_credits']} total credits. ({subject_summary})",
            "subjects": res["subjects"]
        }
    except Exception as e:
        return {"success": False, "message": f"Failed to calculate GPA: {str(e)}"}


def save_semester_action(db: Session, user_id: int, semester_label: str, subjects: List[Dict[str, Any]], scale: float = 10.0) -> Dict[str, Any]:
    """
    Save semester GPA record for user.
    """
    if not subjects:
        return {"success": False, "message": "No subjects provided to save semester GPA."}

    try:
        res = calculate_gpa(subjects, scale=scale)
        record = GpaRecord(
            user_id=user_id,
            semester_label=semester_label.strip() or "Semester",
            subjects=res["subjects"],
            calculated_gpa=res["calculated_gpa"],
            total_credits=res["total_credits"],
            scale=scale
        )
        db.add(record)
        db.commit()
        db.refresh(record)

        log = ActivityLog(
            user_id=user_id,
            agent_name="Study Agent",
            action_description=f"Saved GPA record for '{record.semester_label}' (GPA: {record.calculated_gpa})."
        )
        db.add(log)
        db.commit()

        return {
            "success": True,
            "record_id": record.id,
            "semester_label": record.semester_label,
            "calculated_gpa": record.calculated_gpa,
            "total_credits": record.total_credits,
            "message": f"Successfully saved GPA record for '{record.semester_label}' (GPA: {record.calculated_gpa})."
        }
    except Exception as e:
        db.rollback()
        return {"success": False, "message": f"Failed to save semester GPA: {str(e)}"}


def get_gpa_history_action(db: Session, user_id: int) -> Dict[str, Any]:
    """
    Retrieve user's saved semester GPA history and cumulative CGPA.
    """
    records = db.query(GpaRecord).filter(
        GpaRecord.user_id == user_id
    ).order_by(GpaRecord.created_at.desc()).all()

    if not records:
        return {
            "success": True,
            "overall_cgpa": 0.0,
            "total_credits": 0.0,
            "records": [],
            "message": "You don't have any saved GPA records yet."
        }

    total_weighted_points = 0.0
    total_credits = 0.0
    rec_list = []

    for r in records:
        rec_list.append({
            "id": r.id,
            "semester_label": r.semester_label,
            "calculated_gpa": r.calculated_gpa,
            "total_credits": r.total_credits,
            "scale": r.scale,
            "created_at": str(r.created_at)
        })
        if r.total_credits > 0:
            total_weighted_points += r.calculated_gpa * r.total_credits
            total_credits += r.total_credits

    overall_cgpa = round(total_weighted_points / total_credits, 2) if total_credits > 0 else 0.0
    history_summary = "\n".join([f"- {r['semester_label']}: GPA {r['calculated_gpa']} ({r['total_credits']} credits)" for r in rec_list])

    return {
        "success": True,
        "overall_cgpa": overall_cgpa,
        "total_credits": round(total_credits, 2),
        "records": rec_list,
        "message": f"📊 **GPA History & CGPA**\n- **Overall CGPA**: **{overall_cgpa}** (Total Credits: {round(total_credits, 2)})\n\n**Saved Semesters:**\n{history_summary}"
    }
