import requests
import json
import sys

BASE_URL = "http://localhost:8010/api/v1"

def main():
    print("--- STARTING SECURITY ISOLATION & ID-GUESSING AUDIT TEST ---")
    
    # 1. Register / Login User A
    user_a_email = "user_a_audit@redora.ai"
    user_a_password = "Password123!"
    
    reg_a = requests.post(f"{BASE_URL}/auth/register", json={"email": user_a_email, "password": user_a_password})
    token_a = reg_a.json().get("access_token")
    if not token_a:
        login_a = requests.post(f"{BASE_URL}/auth/login", json={"email": user_a_email, "password": user_a_password})
        token_a = login_a.json().get("access_token")
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 2. Register / Login User B
    user_b_email = "user_b_audit@redora.ai"
    user_b_password = "Password123!"
    
    reg_b = requests.post(f"{BASE_URL}/auth/register", json={"email": user_b_email, "password": user_b_password})
    token_b = reg_b.json().get("access_token")
    if not token_b:
        login_b = requests.post(f"{BASE_URL}/auth/login", json={"email": user_b_email, "password": user_b_password})
        token_b = login_b.json().get("access_token")
    headers_b = {"Authorization": f"Bearer {token_b}"}

    assert token_a and token_b, f"Failed to authenticate test accounts: token_a={token_a}, token_b={token_b}"

    print("[SUCCESS] Authenticated User A and User B.")

    # 3. Create Resources as User B
    res_b_task = requests.post(f"{BASE_URL}/tasks/", json={"title": "User B Secret Task"}, headers=headers_b).json()
    b_task_id = res_b_task["id"]

    res_b_goal = requests.post(f"{BASE_URL}/goals/", json={"title": "User B Secret Goal"}, headers=headers_b).json()
    b_goal_id = res_b_goal["id"]

    res_b_chat = requests.post(f"{BASE_URL}/chat-sessions/", json={"title": "User B Secret Chat"}, headers=headers_b).json()
    b_chat_id = res_b_chat["id"]

    res_b_mock = requests.post(f"{BASE_URL}/tools/mock-interview/start", json={"job_description": "User B Secret Job"}, headers=headers_b).json()
    b_mock_id = res_b_mock["session_id"]

    res_b_gpa = requests.post(f"{BASE_URL}/tools/gpa/save", json={"semester_label": "User B Semester", "subjects": [{"name": "Math", "credits": 4, "grade_point": 9}]}, headers=headers_b).json()
    b_gpa_id = res_b_gpa["id"]

    res_b_mem = requests.post(f"{BASE_URL}/memory/store", json={"content": "User B Secret Memory"}, headers=headers_b).json()
    b_mem_id = res_b_mem["id"]

    print(f"[SUCCESS] Created User B resources: Task #{b_task_id}, Goal #{b_goal_id}, Chat #{b_chat_id}, MockInterview #{b_mock_id}, GPA #{b_gpa_id}, Memory #{b_mem_id}")

    test_results = []

    # 4. Attempt Cross-User Exploits from User A
    # Test 1: List Tasks as User A
    tasks_a = requests.get(f"{BASE_URL}/tasks/", headers=headers_a).json()
    task_ids_a = [t["id"] for t in tasks_a]
    pass_t1 = b_task_id not in task_ids_a
    test_results.append(("List Tasks Isolation", "PASS" if pass_t1 else "FAIL"))

    # Test 2: Update User B's Task as User A
    update_t_b = requests.put(f"{BASE_URL}/tasks/{b_task_id}", json={"title": "Hacked Task"}, headers=headers_a)
    pass_t2 = update_t_b.status_code in [401, 404]
    test_results.append(("Direct Task ID Guessing/Edit", "PASS" if pass_t2 else "FAIL"))

    # Test 3: List Goals as User A
    goals_a = requests.get(f"{BASE_URL}/goals/", headers=headers_a).json()
    goal_ids_a = [g["id"] for g in goals_a]
    pass_g1 = b_goal_id not in goal_ids_a
    test_results.append(("List Goals Isolation", "PASS" if pass_g1 else "FAIL"))

    # Test 4: Update User B's Goal as User A
    update_g_b = requests.put(f"{BASE_URL}/goals/{b_goal_id}", json={"title": "Hacked Goal"}, headers=headers_a)
    pass_g2 = update_g_b.status_code in [401, 404]
    test_results.append(("Direct Goal ID Guessing/Edit", "PASS" if pass_g2 else "FAIL"))

    # Test 5: Fetch User B's Chat Messages as User A
    chat_msgs_b = requests.get(f"{BASE_URL}/chat-sessions/{b_chat_id}/messages", headers=headers_a)
    pass_c1 = chat_msgs_b.status_code in [401, 404]
    test_results.append(("Read Chat Messages of Other User", "PASS" if pass_c1 else "FAIL"))

    # Test 6: Delete User B's Chat Session as User A
    del_chat_b = requests.delete(f"{BASE_URL}/chat-sessions/{b_chat_id}", headers=headers_a)
    pass_c2 = del_chat_b.status_code in [401, 404]
    test_results.append(("Delete Chat Session of Other User", "PASS" if pass_c2 else "FAIL"))

    # Test 7: Fetch User B's Mock Interview Detail as User A
    mock_detail_b = requests.get(f"{BASE_URL}/tools/mock-interview/{b_mock_id}", headers=headers_a)
    pass_m1 = mock_detail_b.status_code in [401, 404]
    test_results.append(("Read Mock Interview of Other User", "PASS" if pass_m1 else "FAIL"))

    # Test 8: Delete User B's GPA Record as User A
    del_gpa_b = requests.delete(f"{BASE_URL}/tools/gpa/{b_gpa_id}", headers=headers_a)
    pass_gpa1 = del_gpa_b.status_code in [401, 404]
    test_results.append(("Delete GPA Record of Other User", "PASS" if pass_gpa1 else "FAIL"))

    # Test 9: Delete User B's Memory as User A
    del_mem_b = requests.delete(f"{BASE_URL}/memory/{b_mem_id}", headers=headers_a)
    pass_mem1 = del_mem_b.status_code in [401, 404]
    test_results.append(("Delete Memory Item of Other User", "PASS" if pass_mem1 else "FAIL"))

    # Test 10: Unauthenticated Tool Access Attempts
    unauth_gpa = requests.post(f"{BASE_URL}/tools/gpa/calculate", json={"scale": 10, "subjects": []})
    unauth_code = requests.post(f"{BASE_URL}/tools/sandbox/run", json={"language": "python", "code": "print(1)"})
    unauth_ats = requests.post(f"{BASE_URL}/tools/resume-ats/custom-suggestion", json={"resume_text": "abc", "custom_instruction": "def"})
    unauth_kaggle = requests.get(f"{BASE_URL}/tools/kaggle/status")

    pass_unauth = (unauth_gpa.status_code == 401 and
                   unauth_code.status_code == 401 and
                   unauth_ats.status_code == 401 and
                   unauth_kaggle.status_code == 401)
    test_results.append(("Unauthenticated Tool Endpoints Blocked", "PASS" if pass_unauth else f"FAIL (GPA:{unauth_gpa.status_code}, Code:{unauth_code.status_code}, ATS:{unauth_ats.status_code}, Kaggle:{unauth_kaggle.status_code})"))

    print("\n=======================================================")
    print("FINAL SECURITY VERIFICATION MATRIX")
    print("=======================================================")
    for test_name, status in test_results:
        print(f"[{status}] {test_name}")
    print("=======================================================\n")

if __name__ == "__main__":
    main()
