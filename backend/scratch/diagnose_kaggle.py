import requests
import json
import os

BASE_URL = "http://localhost:8000/api/v1"

def main():
    print("--- DIAGNOSING KAGGLE ENDPOINTS ---")
    
    # Authenticate User
    email = "kaggle_test_user@redora.ai"
    password = "Password123!"
    
    requests.post(f"{BASE_URL}/auth/register", json={"email": email, "password": password})
    login_res = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
    token = login_res.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    print(f"Auth token obtained: {token[:20]}...")

    # 1. /tools/kaggle/status
    res_status = requests.get(f"{BASE_URL}/tools/kaggle/status", headers=headers)
    print(f"\n1. GET /tools/kaggle/status -> HTTP {res_status.status_code}")
    print(f"Response: {res_status.text}")

    # 2. /tools/kaggle/datasets/search?search=python
    res_search = requests.get(f"{BASE_URL}/tools/kaggle/datasets/search?search=python", headers=headers)
    print(f"\n2. GET /tools/kaggle/datasets/search?search=python -> HTTP {res_search.status_code}")
    print(f"Response (first 300 chars): {res_search.text[:300]}")

    # 3. /tools/kaggle/competitions/list?search=python
    res_list = requests.get(f"{BASE_URL}/tools/kaggle/competitions/list?search=python", headers=headers)
    print(f"\n3. GET /tools/kaggle/competitions/list?search=python -> HTTP {res_list.status_code}")
    print(f"Response (first 300 chars): {res_list.text[:300]}")

if __name__ == "__main__":
    main()
