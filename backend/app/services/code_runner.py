import sys
import os
import tempfile
import subprocess
import httpx
from typing import List, Dict, Any
from app.core.logging import logger

PISTON_URL = "https://emkc.org/api/v2/piston/execute"
JUDGE0_URL = "https://ce.judge0.com/submissions?wait=true"
TIMEOUT_SECONDS = 12.0

LANGUAGE_MAP_JUDGE0 = {
    "python": {"id": 71, "name": "Python 3", "version": "3.8.1"},
    "py": {"id": 71, "name": "Python 3", "version": "3.8.1"},
    "cpp": {"id": 54, "name": "C++", "version": "GCC 9.2.0"},
    "c++": {"id": 54, "name": "C++", "version": "GCC 9.2.0"},
    "c": {"id": 50, "name": "C", "version": "GCC 9.2.0"},
    "java": {"id": 62, "name": "Java", "version": "OpenJDK 13.0.1"},
}

PISTON_LANG_MAP = {
    "python": {"lang": "python", "file": "main.py", "name": "Python 3", "version": "3.10.0"},
    "py": {"lang": "python", "file": "main.py", "name": "Python 3", "version": "3.10.0"},
    "cpp": {"lang": "cpp", "file": "main.cpp", "name": "C++", "version": "GCC 10.2.0"},
    "c++": {"lang": "cpp", "file": "main.cpp", "name": "C++", "version": "GCC 10.2.0"},
    "c": {"lang": "c", "file": "main.c", "name": "C", "version": "GCC 10.2.0"},
    "java": {"lang": "java", "file": "Main.java", "name": "Java", "version": "OpenJDK 15.0.2"},
}


async def get_supported_runtimes() -> List[Dict[str, Any]]:
    """Return the 4 supported languages: Python, Java, C, and C++."""
    return [
        {"language": "Python", "version": "3.10.0", "aliases": ["py"]},
        {"language": "C++", "version": "GCC 10.2.0", "aliases": ["cpp"]},
        {"language": "C", "version": "GCC 10.2.0", "aliases": []},
        {"language": "Java", "version": "OpenJDK 15.0.2", "aliases": []},
    ]


async def run_code_piston(lang_info: Dict[str, Any], source_code: str, stdin: str) -> Dict[str, Any]:
    """Try executing via Piston API."""
    payload = {
        "language": lang_info["lang"],
        "version": "*",
        "files": [{"name": lang_info["file"], "content": source_code}],
        "stdin": stdin or ""
    }
    async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
        resp = await client.post(PISTON_URL, json=payload)
        if resp.status_code == 200:
            data = resp.json()
            run_stage = data.get("run", {})
            compile_stage = data.get("compile", {})

            stdout = run_stage.get("stdout") or ""
            stderr = run_stage.get("stderr") or ""
            compile_stderr = compile_stage.get("stderr") or compile_stage.get("output") or ""

            if compile_stderr and not stderr:
                stderr = compile_stderr
            elif compile_stderr and stderr:
                stderr = f"{compile_stderr}\n{stderr}"

            exit_code = run_stage.get("code")
            if exit_code is None and compile_stage.get("code") is not None:
                exit_code = compile_stage.get("code")

            return {
                "language": lang_info["name"],
                "version": lang_info["version"],
                "stdout": stdout,
                "stderr": stderr,
                "exit_code": exit_code if exit_code is not None else 0,
                "status_description": "Executed via Piston"
            }
        else:
            raise RuntimeError(f"Piston error HTTP {resp.status_code}")


async def run_code_judge0(lang_key: str, source_code: str, stdin: str) -> Dict[str, Any]:
    """Try executing via Judge0 API."""
    lang_info = LANGUAGE_MAP_JUDGE0.get(lang_key)
    if not lang_info:
        raise ValueError(f"Language '{lang_key}' unsupported for Judge0")

    payload = {
        "source_code": source_code,
        "language_id": lang_info["id"],
        "stdin": stdin or ""
    }
    async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
        resp = await client.post(JUDGE0_URL, json=payload)
        if resp.status_code in (200, 201):
            data = resp.json()
            stdout = data.get("stdout") or ""
            stderr = data.get("stderr") or ""
            compile_output = data.get("compile_output") or ""
            if compile_output and not stderr:
                stderr = compile_output
            elif compile_output and stderr:
                stderr = f"{compile_output}\n{stderr}"

            status_info = data.get("status", {})
            status_id = status_info.get("id", 3)
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
            raise RuntimeError(f"Judge0 error HTTP {resp.status_code}")


def run_code_local(lang_key: str, source_code: str, stdin: str) -> Dict[str, Any]:
    """Local fallback execution for Python (or local compilers if available)."""
    if lang_key in ("python", "py"):
        try:
            proc = subprocess.run(
                [sys.executable, "-c", source_code],
                input=stdin or "",
                capture_output=True,
                text=True,
                timeout=10
            )
            return {
                "language": "Python 3",
                "version": sys.version.split()[0],
                "stdout": proc.stdout,
                "stderr": proc.stderr,
                "exit_code": proc.returncode,
                "status_description": "Executed locally"
            }
        except subprocess.TimeoutExpired:
            raise TimeoutError("Execution timed out (10s limit).")
        except Exception as e:
            raise RuntimeError(f"Local Python execution failed: {str(e)}")

    # For C / C++ / Java local fallback attempt
    with tempfile.TemporaryDirectory() as tmpdir:
        if lang_key in ("c", "cpp", "c++"):
            is_cpp = "cpp" in lang_key or "c++" in lang_key
            compiler = "g++" if is_cpp else "gcc"
            ext = ".cpp" if is_cpp else ".c"
            src_path = os.path.join(tmpdir, f"main{ext}")
            exe_path = os.path.join(tmpdir, "main.exe" if os.name == "nt" else "main")

            with open(src_path, "w", encoding="utf-8") as f:
                f.write(source_code)

            comp = subprocess.run([compiler, src_path, "-o", exe_path], capture_output=True, text=True, timeout=10)
            if comp.returncode != 0:
                return {
                    "language": "C++" if is_cpp else "C",
                    "version": "Local GCC",
                    "stdout": "",
                    "stderr": f"Compilation Error:\n{comp.stderr}",
                    "exit_code": comp.returncode,
                    "status_description": "Compilation Error"
                }

            run_proc = subprocess.run([exe_path], input=stdin or "", capture_output=True, text=True, timeout=10)
            return {
                "language": "C++" if is_cpp else "C",
                "version": "Local GCC",
                "stdout": run_proc.stdout,
                "stderr": run_proc.stderr,
                "exit_code": run_proc.returncode,
                "status_description": "Executed locally"
            }

        elif lang_key == "java":
            src_path = os.path.join(tmpdir, "Main.java")
            with open(src_path, "w", encoding="utf-8") as f:
                f.write(source_code)

            comp = subprocess.run(["javac", src_path], capture_output=True, text=True, timeout=10)
            if comp.returncode != 0:
                return {
                    "language": "Java",
                    "version": "Local OpenJDK",
                    "stdout": "",
                    "stderr": f"Compilation Error:\n{comp.stderr}",
                    "exit_code": comp.returncode,
                    "status_description": "Compilation Error"
                }

            run_proc = subprocess.run(["java", "-cp", tmpdir, "Main"], input=stdin or "", capture_output=True, text=True, timeout=10)
            return {
                "language": "Java",
                "version": "Local OpenJDK",
                "stdout": run_proc.stdout,
                "stderr": run_proc.stderr,
                "exit_code": run_proc.returncode,
                "status_description": "Executed locally"
            }

    raise ValueError(f"Language '{lang_key}' local execution unsupported.")


async def run_code(language: str, version: str = "*", source_code: str = "", stdin: str = "") -> Dict[str, Any]:
    """Execute code in Python, Java, C, or C++ with multi-tier fallback engine."""
    if not source_code.strip():
        raise ValueError("Source code cannot be empty.")

    lang_key = language.lower().strip()
    piston_info = PISTON_LANG_MAP.get(lang_key)

    if not piston_info:
        raise ValueError(f"Language '{language}' is not supported. Supported languages are: Python, Java, C, and C++.")

    # 1. Try Piston API first
    try:
        return await run_code_piston(piston_info, source_code, stdin)
    except Exception as p_err:
        logger.warn(f"Piston execution failed, trying Judge0 fallback: {p_err}")

    # 2. Try Judge0 API second
    try:
        return await run_code_judge0(lang_key, source_code, stdin)
    except Exception as j_err:
        logger.warn(f"Judge0 execution failed, trying local fallback: {j_err}")

    # 3. Local fallback execution
    try:
        return run_code_local(lang_key, source_code, stdin)
    except Exception as l_err:
        logger.error(f"All execution engines failed: {l_err}")
        raise RuntimeError(f"Code execution service unavailable: {str(l_err)}")

