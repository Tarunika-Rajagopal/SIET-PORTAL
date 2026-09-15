import os
import shutil
from uuid import uuid4, UUID
from typing import Tuple
from app.exceptions.custom import BadRequestException

class StorageService:
    BASE_UPLOAD_DIR = os.path.abspath(os.path.join("uploads", "submissions"))

    def __init__(self, base_dir: str = BASE_UPLOAD_DIR):
        self.base_dir = os.path.abspath(base_dir)

    def _sanitize_filename(self, filename: str) -> str:
        # Strip directory path components
        clean_name = os.path.basename(filename)
        # Prevent hidden files or empty filenames
        if not clean_name or clean_name.startswith("."):
            clean_name = "file_" + uuid4().hex[:8]
        return clean_name

    def generate_safe_storage_path(self, team_id: UUID, week_number: int, original_filename: str) -> Tuple[str, str]:
        """
        Generates a secure physical storage path using UUID for physical filename to prevent path traversal.
        Returns tuple (full_abs_storage_path, safe_physical_filename).
        """
        clean_orig = self._sanitize_filename(original_filename)
        ext = os.path.splitext(clean_orig)[1].lower()

        # Disallow dangerous extensions
        allowed_exts = {".pptx", ".pdf", ".png", ".jpg", ".jpeg"}
        if ext not in allowed_exts:
            raise BadRequestException(f"Unsupported file format '{ext}'. Allowed formats: PPTX, PDF, PNG, JPG, JPEG.")

        target_dir = os.path.abspath(os.path.join(self.base_dir, str(team_id), f"week_{week_number}"))
        
        # Path traversal guard
        if not target_dir.startswith(self.base_dir):
            raise BadRequestException("Invalid path traversal detected.")

        os.makedirs(target_dir, exist_ok=True)

        physical_filename = f"{uuid4().hex}{ext}"
        storage_path = os.path.join(target_dir, physical_filename)

        # Extra sanity check
        if not os.path.abspath(storage_path).startswith(self.base_dir):
            raise BadRequestException("Invalid physical file location.")

        return storage_path, physical_filename

    def save_file(self, team_id: UUID, week_number: int, original_filename: str, contents: bytes) -> Tuple[str, str]:
        if not contents or len(contents) == 0:
            raise BadRequestException("Uploaded file is empty (0 bytes).")

        storage_path, physical_filename = self.generate_safe_storage_path(team_id, week_number, original_filename)

        try:
            with open(storage_path, "wb") as f:
                f.write(contents)
        except Exception as e:
            raise BadRequestException(f"Failed to write file to storage: {str(e)}")

        return storage_path, physical_filename

    def delete_file(self, storage_path: str) -> bool:
        if not storage_path:
            return False

        abs_path = os.path.abspath(storage_path)
        if not abs_path.startswith(self.base_dir):
            # Do not delete files outside upload dir
            return False

        if os.path.exists(abs_path):
            try:
                os.remove(abs_path)
                return True
            except Exception:
                return False
        return False

    def file_exists(self, storage_path: str) -> bool:
        if not storage_path:
            return False
        abs_path = os.path.abspath(storage_path)
        return abs_path.startswith(self.base_dir) and os.path.exists(abs_path)
