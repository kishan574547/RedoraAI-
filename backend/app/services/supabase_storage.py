from app.core.config import settings


class SupabaseStorageService:
    def __init__(self):
        self.url = settings.SUPABASE_URL
        self.key = settings.SUPABASE_KEY

    async def upload_file(self, bucket: str, path: str, file_data: bytes) -> dict:
        # TODO: Implement file upload
        return {"message": "Supabase storage endpoint"}

    async def download_file(self, bucket: str, path: str) -> bytes:
        # TODO: Implement file download
        return b""
