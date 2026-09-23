import sys
from app.api.v1.routes_youtube import extract_youtube_video_id

test_urls = [
    ("https://www.youtube.com/live/I8uW0iKtSGM?si=2uiGeNO8Dk_-vGPU", "I8uW0iKtSGM"),
    ("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"),
    ("https://youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ"),
    ("https://www.youtube.com/shorts/abc12345678", "abc12345678"),
    ("https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"),
]

print("=" * 60)
print("RUNNING YOUTUBE VIDEO ID EXTRACTION TESTS")
print("=" * 60)

all_passed = True
for url, expected in test_urls:
    result = extract_youtube_video_id(url)
    status = "PASS" if result == expected else "FAIL"
    if status == "FAIL":
        all_passed = False
    print(f"URL:      {url}")
    print(f"Expected: {expected}")
    print(f"Got:      {result}")
    print(f"Result:   [{status}]")
    print("-" * 60)

print(f"OVERALL STATUS: {'ALL PASSED' if all_passed else 'SOME FAILED'}")
sys.exit(0 if all_passed else 1)
