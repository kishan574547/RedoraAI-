import httpx
from typing import List, Dict, Any
from app.core.logging import logger

JUDGE0_URL = "https://ce.judge0.com/submissions?wait=true"
TIMEOUT_SECONDS = 12.0

LANGUAGE_MAP = {
    "python": {"id": 71, "name": "Python 3", "version": "3.8.1"},
    "py": {"id": 71, "name": "Python 3", "version": "3.8.1"},
    "cpp": {"id": 54, "name": "C++", "version": "GCC 9.2.0"},
    "c++": {"id": 54, "name": "C++", "version": "GCC 9.2.0"},
    "c": {"id": 50, "name": "C", "version": "GCC 9.2.0"},
    "java": {"id": 62, "name": "Java", "version": "OpenJDK 13.0.1"},
}


async def get_supported_runtimes() -> List[Dict[str, Any]]:
    """Return the 4 supported languages: Python, Java, C, and C++."""
    return [
        {"language": "Python", "version": "3.8.1", "aliases": ["py"]},
        {"language": "C++", "version": "GCC 9.2.0", "aliases": ["cpp"]},
        {"language": "C", "version": "GCC 9.2.0", "aliases": []},
        {"language": "Java", "version": "OpenJDK 13.0.1", "aliases": []},
    ]


async def run_code(language: str, version: str = "*", source_code: str = "", stdin: str = "") -> Dict[str, Any]:
    """Execute code in Python, Java, C, or C++ using free open execution engine."""
    if not source_code.strip():
        raise ValueError("Source code cannot be empty.")

    lang_key = language.lower().strip()
    lang_info = LANGUAGE_MAP.get(lang_key)

    if not lang_info:
        raise ValueError(f"Language '{language}' is not supported. Supported languages are: Python, Java, C, and C++.")

    payload = {
        "source_code": source_code,
        "language_id": lang_info["id"],
        "stdin": stdin or ""
    }

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
            resp = await client.post(JUDGE0_URL, json=payload)
            
            if resp.status_code == 200 or resp.status_code == 201:
                data = resp.json()
                stdout = data.get("stdout") or ""
                stderr = data.get("stderr") or ""
                compile_output = data.get("compile_output") or ""
                status_info = data.get("status", {})
                
                # Combine compile_output into stderr if present (for C/C++/Java compilation errors)
                if compile_output and not stderr:
                    stderr = compile_output
                elif compile_output and stderr:
                    stderr = f"{compile_output}\n{stderr}"

                status_id = status_info.get("id", 3)
                # status_id 3 is Accepted (Exit Code 0)
                exit_code = 0 if status_id == 3 else 1

                return {
                    "language": lang_info["name"],
                    "version": lang_info["version"],
                    "stdout": stdout,
                    "stderr": stderr,
                    "exit_code": exit_code,
                    "status_description": status_info.get("description", "Executed")
                }
            else:
                logger.error(f"Execution engine error {resp.status_code}: {resp.text}")
                raise RuntimeError(f"Execution service error (HTTP {resp.status_code}): {resp.text}")
    except httpx.TimeoutException:
        raise TimeoutError("Execution timed out (12s limit). Make sure your code does not contain infinite loops.")
    except Exception as e:
        logger.error(f"Code execution error: {str(e)}")
        raise e
