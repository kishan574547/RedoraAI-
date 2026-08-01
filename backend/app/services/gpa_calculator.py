from typing import List, Dict, Any, Union


GRADE_POINT_MAP_10 = {
    "O": 10.0, "S": 10.0, "A+": 10.0, "A": 9.0, "B+": 8.0, 
    "B": 7.0, "C+": 6.5, "C": 6.0, "D": 5.0, "E": 4.0, "F": 0.0
}

GRADE_POINT_MAP_4 = {
    "A+": 4.0, "A": 4.0, "A-": 3.7, "B+": 3.3, "B": 3.0, 
    "B-": 2.7, "C+": 2.3, "C": 2.0, "C-": 1.7, "D+": 1.3, 
    "D": 1.0, "F": 0.0
}


def resolve_grade_point(val: Union[str, float, int], scale: float = 10.0) -> float:
    """Converts string grade or numeric value to float grade_point bounded by scale."""
    if isinstance(val, (int, float)):
        return min(max(0.0, float(val)), scale)
    
    val_str = str(val).strip().upper()
    try:
        num = float(val_str)
        return min(max(0.0, num), scale)
    except ValueError:
        pass

    if scale <= 4.0:
        return GRADE_POINT_MAP_4.get(val_str, 0.0)
    else:
        return GRADE_POINT_MAP_10.get(val_str, 0.0)


def calculate_gpa(subjects: List[Dict[str, Any]], scale: float = 10.0) -> Dict[str, Any]:
    """
    Takes a list of subjects: [{name, credits, grade_point/grade}] and scale (10.0 or 4.0).
    Returns calculated weighted GPA and total credits.
    Formula: sum(credits * grade_point) / sum(credits)
    """
    total_credits = 0.0
    total_grade_points = 0.0
    processed_subjects = []

    for sub in subjects:
        credits = float(sub.get("credits", 0.0))
        raw_gp = sub.get("grade_point") if sub.get("grade_point") is not None else sub.get("grade", 0.0)
        grade_point = resolve_grade_point(raw_gp, scale=scale)
        name = str(sub.get("name", "Subject")).strip()

        if credits > 0:
            total_credits += credits
            total_grade_points += credits * grade_point

        processed_subjects.append({
            "name": name,
            "credits": credits,
            "grade_point": grade_point
        })

    if total_credits == 0:
        gpa = 0.0
    else:
        gpa = round(total_grade_points / total_credits, 2)

    return {
        "calculated_gpa": gpa,
        "total_credits": round(total_credits, 2),
        "scale": scale,
        "subjects": processed_subjects
    }
