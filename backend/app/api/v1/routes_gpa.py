from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models.user import User
from app.db.models.gpa_record import GpaRecord
from app.core.deps import get_current_user
from app.services.gpa_calculator import calculate_gpa
from app.core.logging import logger

router = APIRouter()


class SubjectItem(BaseModel):
    name: str = "Subject"
    credits: float = Field(..., gt=0)
    grade_point: Optional[float] = None
    grade: Optional[str] = None


class GpaCalculateRequest(BaseModel):
    scale: float = 10.0
    subjects: List[SubjectItem]


class GpaSaveRequest(BaseModel):
    semester_label: str = "Semester 1"
    scale: float = 10.0
    subjects: List[SubjectItem]


@router.post("/calculate")
async def api_calculate_gpa(
    req: GpaCalculateRequest,
    current_user: User = Depends(get_current_user)
):
    """Compute weighted GPA without saving to database."""
    try:
        subjects_dict = [s.dict() for s in req.subjects]
        result = calculate_gpa(subjects_dict, scale=req.scale)
        return result
    except Exception as e:
        logger.error(f"Error calculating GPA: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Invalid subjects data: {str(e)}")


@router.post("/save")
async def api_save_gpa(
    req: GpaSaveRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Compute and save a semester GpaRecord for the user."""
    try:
        subjects_dict = [s.dict() for s in req.subjects]
        calc_result = calculate_gpa(subjects_dict, scale=req.scale)

        record = GpaRecord(
            user_id=current_user.id,
            semester_label=req.semester_label.strip() or "Semester",
            subjects=calc_result["subjects"],
            calculated_gpa=calc_result["calculated_gpa"],
            total_credits=calc_result["total_credits"],
            scale=req.scale
        )
        db.add(record)
        db.commit()
        db.refresh(record)

        return {
            "id": record.id,
            "semester_label": record.semester_label,
            "calculated_gpa": record.calculated_gpa,
            "total_credits": record.total_credits,
            "scale": record.scale,
            "subjects": record.subjects,
            "created_at": record.created_at
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error saving GPA record: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to save GPA record: {str(e)}")


@router.get("/history")
async def api_get_gpa_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List saved GPA records for current user, along with overall weighted CGPA."""
    records = db.query(GpaRecord).filter(
        GpaRecord.user_id == current_user.id
    ).order_by(GpaRecord.created_at.desc()).all()

    # Calculate overall CGPA weighted across all saved semesters
    total_weighted_points = 0.0
    total_cumulative_credits = 0.0

    history_list = []
    for r in records:
        history_list.append({
            "id": r.id,
            "semester_label": r.semester_label,
            "calculated_gpa": r.calculated_gpa,
            "total_credits": r.total_credits,
            "scale": r.scale,
            "subjects": r.subjects,
            "created_at": r.created_at
        })
        if r.total_credits > 0:
            total_weighted_points += r.calculated_gpa * r.total_credits
            total_cumulative_credits += r.total_credits

    overall_cgpa = round(total_weighted_points / total_cumulative_credits, 2) if total_cumulative_credits > 0 else 0.0

    return {
        "overall_cgpa": overall_cgpa,
        "total_credits": round(total_cumulative_credits, 2),
        "records": history_list
    }


@router.delete("/{record_id}")
async def api_delete_gpa_record(
    record_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a saved GPA record."""
    record = db.query(GpaRecord).filter(
        GpaRecord.id == record_id,
        GpaRecord.user_id == current_user.id
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="GPA record not found")

    db.delete(record)
    db.commit()
    return {"message": "GPA record deleted successfully"}
