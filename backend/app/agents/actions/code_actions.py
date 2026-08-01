from typing import Dict, Any, Optional
from app.services.code_runner import run_code


async def run_code_action(language: str, code: str, stdin: Optional[str] = "") -> Dict[str, Any]:
    """
    Execute code in Piston/Judge0 sandbox for Python, Java, C, or C++.
    """
    if not code or not code.strip():
        return {
            "success": False,
            "message": "No code provided to execute."
        }

    lang = (language or "python").strip().lower()
    try:
        res = await run_code(language=lang, version="*", source_code=code, stdin=stdin or "")
        stdout = res.get("stdout", "").strip()
        stderr = res.get("stderr", "").strip()
        exit_code = res.get("exit_code", 0)

        output_str = stdout if stdout else (f"Error:\n{stderr}" if stderr else "(No output returned)")
        status_msg = "Execution Successful" if exit_code == 0 else f"Execution Failed (Exit Code {exit_code})"

        return {
            "success": exit_code == 0,
            "language": res.get("language", lang),
            "stdout": stdout,
            "stderr": stderr,
            "exit_code": exit_code,
            "message": f"💻 **Code Execution Results ({res.get('language', lang)})**\n- **Status**: {status_msg}\n\n```text\n{output_str}\n```"
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Code sandbox execution failed: {str(e)}"
        }
