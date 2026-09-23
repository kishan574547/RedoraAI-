import sys
import os
from fastapi.testclient import TestClient

# Ensure backend directory in path
sys.path.insert(0, os.path.dirname(__file__))

from app.main import app

client = TestClient(app)

def test_unauthenticated_endpoints_rejected():
    print("\n--- 1. Testing Unauthenticated Request Rejections ---")
    protected_urls = [
        ("GET", "/api/v1/tasks/"),
        ("POST", "/api/v1/tasks/"),
        ("GET", "/api/v1/goals/"),
        ("POST", "/api/v1/goals/"),
        ("GET", "/api/v1/memory/"),
        ("POST", "/api/v1/chat/message"),
        ("GET", "/api/v1/chat-sessions/"),
        ("GET", "/api/v1/activity/"),
        ("GET", "/api/v1/habits/"),
        ("GET", "/api/v1/suggestions/"),
        ("POST", "/api/v1/tools/pdf/split"),
        ("POST", "/api/v1/tools/sandbox/run"),
        ("POST", "/api/v1/tools/resume-ats/check"),
        ("POST", "/api/v1/tools/speaking-practice/respond"),
        ("POST", "/api/v1/tools/mock-interview/start"),
        ("POST", "/api/v1/tools/cover-letter/generate"),
        ("POST", "/api/v1/tools/linkedin/optimize"),
        ("GET", "/api/v1/tools/flashcards/decks"),
        ("POST", "/api/v1/tools/quiz/generate"),
        ("POST", "/api/v1/tools/youtube/summarize"),
    ]

    all_passed = True
    for method, url in protected_urls:
        if method == "GET":
            res = client.get(url)
        else:
            res = client.post(url)
        
        is_rejected = res.status_code in (401, 403)
        status_str = "PASS [401/403]" if is_rejected else f"FAIL [{res.status_code}]"
        print(f"  [{method}] {url:40} -> {status_str}")
        if not is_rejected:
            all_passed = False

    assert all_passed, "Some protected endpoints did not reject unauthenticated requests!"
    print("  -> ALL protected endpoints successfully rejected unauthenticated requests.")


def test_cross_account_idor_isolation():
    print("\n--- 2. Testing Cross-Account Authorization & IDOR Isolation ---")
    import uuid
    email1 = f"user1_{uuid.uuid4().hex[:6]}@test.com"
    email2 = f"user2_{uuid.uuid4().hex[:6]}@test.com"
    pwd = "TestPassword123!"

    # Register user 1
    r1 = client.post("/api/v1/auth/register", json={"email": email1, "password": pwd})
    assert r1.status_code == 200, f"Register user 1 failed: {r1.text}"
    token1 = r1.json()["access_token"]
    headers1 = {"Authorization": f"Bearer {token1}"}

    # Register user 2
    r2 = client.post("/api/v1/auth/register", json={"email": email2, "password": pwd})
    assert r2.status_code == 200, f"Register user 2 failed: {r2.text}"
    token2 = r2.json()["access_token"]
    headers2 = {"Authorization": f"Bearer {token2}"}

    # User 1 creates a Task
    task_res = client.post(
        "/api/v1/tasks/",
        json={"title": "User 1 Secret Task", "status": "pending"},
        headers=headers1
    )
    assert task_res.status_code == 201, f"Create task failed: {task_res.text}"
    user1_task_id = task_res.json()["id"]

    # User 1 creates a Goal
    goal_res = client.post(
        "/api/v1/goals/",
        json={"title": "User 1 Secret Goal", "status": "not_started"},
        headers=headers1
    )
    assert goal_res.status_code == 201, f"Create goal failed: {goal_res.text}"
    user1_goal_id = goal_res.json()["id"]

    # User 1 creates a Habit
    habit_res = client.post(
        "/api/v1/habits/",
        json={"name": "User 1 Habit", "frequency": "daily"},
        headers=headers1
    )
    assert habit_res.status_code == 201
    user1_habit_id = habit_res.json()["id"]

    print("  Created resources under User 1.")

    # User 2 attempts to UPDATE User 1's task
    u2_task_update = client.put(
        f"/api/v1/tasks/{user1_task_id}",
        json={"title": "Hacked by User 2"},
        headers=headers2
    )
    print(f"  User 2 PUT /tasks/{user1_task_id} -> {u2_task_update.status_code} (Expected 404)")
    assert u2_task_update.status_code == 404

    # User 2 attempts to DELETE User 1's task
    u2_task_del = client.delete(
        f"/api/v1/tasks/{user1_task_id}",
        headers=headers2
    )
    print(f"  User 2 DELETE /tasks/{user1_task_id} -> {u2_task_del.status_code} (Expected 404)")
    assert u2_task_del.status_code == 404

    # User 2 attempts to UPDATE User 1's goal
    u2_goal_update = client.put(
        f"/api/v1/goals/{user1_goal_id}",
        json={"title": "Hacked Goal by User 2"},
        headers=headers2
    )
    print(f"  User 2 PUT /goals/{user1_goal_id} -> {u2_goal_update.status_code} (Expected 404)")
    assert u2_goal_update.status_code == 404

    # User 2 attempts to DELETE User 1's goal
    u2_goal_del = client.delete(
        f"/api/v1/goals/{user1_goal_id}",
        headers=headers2
    )
    print(f"  User 2 DELETE /goals/{user1_goal_id} -> {u2_goal_del.status_code} (Expected 404)")
    assert u2_goal_del.status_code == 404

    # User 2 attempts to complete User 1's habit
    u2_habit_complete = client.post(
        f"/api/v1/habits/{user1_habit_id}/complete",
        headers=headers2
    )
    print(f"  User 2 POST /habits/{user1_habit_id}/complete -> {u2_habit_complete.status_code} (Expected 404)")
    assert u2_habit_complete.status_code == 404

    # User 2 fetches their own tasks list -> must NOT contain User 1's task
    u2_tasks = client.get("/api/v1/tasks/", headers=headers2)
    assert not any(t["id"] == user1_task_id for t in u2_tasks.json())

    print("  -> IDOR Authorization isolation confirmed between separate accounts.")


def test_security_headers():
    print("\n--- 3. Testing Security Headers ---")
    res = client.get("/")
    assert res.status_code == 200
    headers = res.headers
    
    expected = {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
        "Referrer-Policy": "strict-origin-when-cross-origin",
    }
    
    for h, val in expected.items():
        assert h in headers, f"Missing header: {h}"
        assert headers[h] == val, f"Header {h} value mismatch: got '{headers[h]}', expected '{val}'"
        print(f"  [Header Verified] {h}: {headers[h]}")
    
    assert "Content-Security-Policy" in headers
    print("  [Header Verified] Content-Security-Policy is present.")


def test_rate_limiting():
    print("\n--- 4. Testing Rate Limiting on Auth Endpoint ---")
    hit_429 = False
    for i in range(15):
        res = client.post(
            "/api/v1/auth/login",
            json={"email": f"ratetest_{i}@test.com", "password": "wrongpassword"}
        )
        if res.status_code == 429:
            hit_429 = True
            print(f"  Request #{i+1} triggered HTTP 429 Too Many Requests (Retry-After: {res.headers.get('Retry-After')})")
            break

    assert hit_429, "Rate limiting was not triggered after rapid requests!"
    print("  -> Auth Rate Limiting verified successfully.")


if __name__ == "__main__":
    try:
        test_unauthenticated_endpoints_rejected()
        test_cross_account_idor_isolation()
        test_security_headers()
        test_rate_limiting()
        print("\n==========================================")
        print("ALL PRE-LAUNCH SECURITY AUDIT TESTS PASSED!")
        print("==========================================")
    except Exception as e:
        print(f"\nTEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
