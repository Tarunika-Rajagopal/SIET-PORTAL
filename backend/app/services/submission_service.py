import os
from typing import List, Optional, Tuple
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import UploadFile

from app.repositories.submission_repository import SubmissionRepository
from app.repositories.team_repository import TeamRepository
from app.services.storage_service import StorageService
from app.schemas.submissions import SubmissionCreateUpdate, SubmissionResponse, SubmissionFileResponse
from app.exceptions.custom import NotFoundException, BadRequestException, ForbiddenException
from app.models.submissions import WeeklySubmission, SubmissionFile
from app.models.users import User

WEEK_TITLES = {
    0: "Week 0 Deliverable Submission",
    1: "Project Proposal, Title & Problem Formulation",
    2: "Literature Survey & System Requirement Specification",
    3: "System Architecture & Design Diagram",
    4: "Implementation & Core Algorithm Development",
    5: "Testing, Experimental Results & Validation",
    6: "Final Project Dossier, Presentation & GitHub Submission"
}

ALLOWED_EXTENSIONS = {
    ".pptx": ("presentation", 25 * 1024 * 1024),  # 25 MB
    ".pdf": ("pdf", 20 * 1024 * 1024),            # 20 MB
    ".png": ("screenshot", 10 * 1024 * 1024),      # 10 MB
    ".jpg": ("screenshot", 10 * 1024 * 1024),      # 10 MB
    ".jpeg": ("screenshot", 10 * 1024 * 1024)      # 10 MB
}

class SubmissionService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.sub_repo = SubmissionRepository(db)
        self.team_repo = TeamRepository(db)
        self.storage_service = StorageService()

    def _build_submission_response(self, sub: WeeklySubmission) -> SubmissionResponse:
        file_resps = [
            SubmissionFileResponse(
                id=f.id,
                original_filename=f.original_filename,
                file_category=f.file_category,
                content_type=f.content_type,
                file_size=f.file_size,
                created_at=f.created_at
            )
            for f in sub.files
        ]

        return SubmissionResponse(
            id=sub.id,
            week_number=sub.week_number,
            title=sub.title,
            due_date=sub.due_date,
            status=sub.status,
            submission_date=sub.submission_date,
            problem_statement=sub.problem_statement,
            solution=sub.solution,
            technology_used=sub.technology_used,
            obstacles_faced=sub.obstacles_faced,
            abstract=sub.abstract,
            repo_url=sub.repo_url,
            demo_url=sub.demo_url,
            comments=sub.comments,
            score=sub.score,
            max_score=sub.max_score,
            guide_review_date=sub.guide_review_date,
            files=file_resps
        )

    async def get_student_submissions(self, student_user: User) -> List[SubmissionResponse]:
        team = await self.team_repo.get_team_by_student_user_id(student_user.id)
        if not team:
            raise NotFoundException("You are not currently assigned to any team.")

        existing_subs = await self.sub_repo.get_submissions_by_team_id(team.id)
        subs_dict = {s.week_number: s for s in existing_subs}

        resps = []
        for week_num in range(0, 7):
            if week_num in subs_dict:
                resps.append(self._build_submission_response(subs_dict[week_num]))
            else:
                title = WEEK_TITLES.get(week_num, f"Week {week_num} Deliverable")
                resps.append(
                    SubmissionResponse(
                        id=UUID("00000000-0000-0000-0000-000000000000"),
                        week_number=week_num,
                        title=title,
                        due_date=f"Week {week_num}",
                        status="Pending",
                        files=[]
                    )
                )

        return resps

    async def get_submission_by_week(self, week_number: int, student_user: User) -> SubmissionResponse:
        if week_number < 0 or week_number > 16:
            raise BadRequestException(f"Invalid week number {week_number}. Academic weeks range from 0 to 16.")

        team = await self.team_repo.get_team_by_student_user_id(student_user.id)
        if not team:
            raise NotFoundException("You are not currently assigned to any team.")

        sub = await self.sub_repo.get_submission_by_team_and_week(team.id, week_number)
        if not sub:
            title = WEEK_TITLES.get(week_number, f"Week {week_number} Deliverable")
            return SubmissionResponse(
                id=UUID("00000000-0000-0000-0000-000000000000"),
                week_number=week_number,
                title=title,
                due_date=f"Week {week_number}",
                status="Pending",
                files=[]
            )
        return self._build_submission_response(sub)

    async def create_or_update_submission(
        self,
        week_number: int,
        data: SubmissionCreateUpdate,
        student_user: User
    ) -> SubmissionResponse:
        if week_number < 0 or week_number > 16:
            raise BadRequestException(f"Invalid week number {week_number}. Academic weeks range from 0 to 16.")

        team = await self.team_repo.get_team_by_student_user_id(student_user.id)
        if not team:
            raise NotFoundException("You are not currently assigned to any team.")

        sub = await self.sub_repo.get_submission_by_team_and_week(team.id, week_number)

        # Enforce editable status checks: only prevent modification if already approved
        if sub and sub.status == "APPROVED":
            raise BadRequestException(f"Submission for Week {week_number} is already approved and cannot be modified.")

        title = WEEK_TITLES.get(week_number, f"Week {week_number} Deliverable")
        new_status = "SUBMITTED" if data.is_submit else "DRAFT"

        if not sub:
            sub = await self.sub_repo.create_submission(
                team_id=team.id,
                week_number=week_number,
                title=title,
                due_date=f"Week {week_number}",
                status=new_status,
                problem_statement=data.problem_statement,
                solution=data.solution,
                technology_used=data.technology_used,
                obstacles_faced=data.obstacles_faced,
                abstract=data.abstract,
                repo_url=data.repo_url,
                demo_url=data.demo_url
            )
        else:
            sub.status = new_status
            if data.problem_statement is not None:
                sub.problem_statement = data.problem_statement
            if data.solution is not None:
                sub.solution = data.solution
            if data.technology_used is not None:
                sub.technology_used = data.technology_used
            if data.obstacles_faced is not None:
                sub.obstacles_faced = data.obstacles_faced
            if data.abstract is not None:
                sub.abstract = data.abstract
            if data.repo_url is not None:
                sub.repo_url = data.repo_url
            if data.demo_url is not None:
                sub.demo_url = data.demo_url

        if data.is_submit:
            sub.submission_date = datetime.now(timezone.utc)

        await self.db.commit()
        refreshed = await self.sub_repo.get_submission_by_id(sub.id)
        return self._build_submission_response(refreshed)

    async def upload_file(self, submission_id: UUID, file: UploadFile, student_user: User) -> SubmissionFileResponse:
        team = await self.team_repo.get_team_by_student_user_id(student_user.id)
        if not team:
            raise NotFoundException("You are not currently assigned to any team.")

        sub = await self.sub_repo.get_submission_by_id(submission_id)
        if not sub or sub.team_id != team.id:
            raise NotFoundException("Submission record not found for your team.")

        if sub.status in ["SUBMITTED", "APPROVED"]:
            raise BadRequestException("Cannot upload files to a finalized submission.")

        orig_filename = file.filename or "file"
        ext = os.path.splitext(orig_filename)[1].lower()

        if ext not in ALLOWED_EXTENSIONS:
            raise BadRequestException(f"Unsupported file format '{ext}'. Allowed formats: PPTX, PDF, PNG, JPG, JPEG.")

        category, max_allowed = ALLOWED_EXTENSIONS[ext]

        contents = await file.read()
        file_size = len(contents)

        if file_size == 0:
            raise BadRequestException("Uploaded file is empty (0 bytes).")

        if file_size > max_allowed:
            max_mb = int(max_allowed / (1024 * 1024))
            raise BadRequestException(f"File size exceeds maximum permitted limit of {max_mb} MB for {category} files.")

        # Save physical file using StorageService
        storage_path, physical_name = self.storage_service.save_file(
            team_id=team.id,
            week_number=sub.week_number,
            original_filename=orig_filename,
            contents=contents
        )

        # Attempt DB metadata creation with orphan cleanup fallback
        try:
            db_file = await self.sub_repo.add_submission_file(
                submission_id=sub.id,
                original_filename=orig_filename,
                storage_path=storage_path,
                file_category=category,
                content_type=file.content_type or "application/octet-stream",
                file_size=file_size,
                uploaded_by_id=student_user.id
            )
            await self.db.commit()
        except Exception as err:
            # Orphan cleanup: remove saved physical file if database transaction fails
            self.storage_service.delete_file(storage_path)
            raise BadRequestException(f"Failed to record file metadata in database: {str(err)}")

        return SubmissionFileResponse(
            id=db_file.id,
            original_filename=db_file.original_filename,
            file_category=db_file.file_category,
            content_type=db_file.content_type,
            file_size=db_file.file_size,
            created_at=db_file.created_at
        )

    async def delete_file(self, submission_id: UUID, file_id: UUID, student_user: User) -> bool:
        file_rec = await self.sub_repo.get_submission_file_by_id(file_id)
        if not file_rec:
            raise NotFoundException("File attachment not found.")

        # IDOR check: file must belong to submission_id
        if file_rec.submission_id != submission_id:
            raise BadRequestException("File does not belong to the specified submission.")

        team = await self.team_repo.get_team_by_student_user_id(student_user.id)
        if not team or file_rec.submission.team_id != team.id:
            raise ForbiddenException("Access denied. You do not own this submission file.")

        if file_rec.submission.status in ["SUBMITTED", "APPROVED"]:
            raise BadRequestException("Cannot delete files from a finalized submission.")

        # Physical removal via StorageService
        self.storage_service.delete_file(file_rec.storage_path)

        await self.sub_repo.delete_submission_file(file_id)
        await self.db.commit()
        return True

    async def get_file_for_download(self, file_id: UUID, user: User) -> Tuple[str, str, str]:
        file_rec = await self.sub_repo.get_submission_file_by_id(file_id)
        if not file_rec:
            raise NotFoundException("File attachment not found.")

        roles = [r.name.lower() for r in user.roles]
        
        # Student ownership check
        if "student" in roles and "admin" not in roles and "guide" not in roles and "advisor" not in roles and "hod" not in roles:
            team = await self.team_repo.get_team_by_student_user_id(user.id)
            if not team or file_rec.submission.team_id != team.id:
                raise ForbiddenException("Access denied to this file attachment.")

        # Guide assignment check
        if "guide" in roles and "admin" not in roles and "advisor" not in roles and "hod" not in roles:
            team = file_rec.submission.team
            if not team or team.guide_id != user.id:
                raise ForbiddenException("Access denied to file belonging to unassigned team.")

        return file_rec.storage_path, file_rec.original_filename, file_rec.content_type

    async def delete_submission(self, week_number: int, student_user: User) -> bool:
        team = await self.team_repo.get_team_by_student_user_id(student_user.id)
        if not team:
            raise NotFoundException("You are not currently assigned to any team.")

        sub = await self.sub_repo.get_submission_by_team_and_week(team.id, week_number)
        if not sub:
            return True

        for f in sub.files:
            try:
                self.storage_service.delete_file(f.storage_path)
            except Exception:
                pass

        await self.db.delete(sub)
        await self.db.commit()
        return True

