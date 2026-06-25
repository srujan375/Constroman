import logging
from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Submission, AuditLog
from app.repositories.submission_repo import SubmissionRepository
from app.schemas import (
    SubmissionCreate,
    SubmissionUpdate,
    SubmissionRead,
    SubmissionListParams,
    PaginatedResponse,
)

logger = logging.getLogger(__name__)


def create_submission(db: Session, payload: SubmissionCreate) -> SubmissionRead:
    repo = SubmissionRepository(db)
    data = payload.model_dump(exclude_unset=True)
    if data.get("submission_date") is None:
        data["submission_date"] = date.today()
    submission = repo.create(**data)
    db.commit()
    db.refresh(submission)

    audit = AuditLog(
        organization_id=submission.organization_id,
        entity_type="submission",
        entity_id=submission.id,
        action="created",
        user_id=payload.submitted_by_id,
        changes={"form_data": {"from": None, "to": submission.form_data}},
    )
    db.add(audit)
    db.commit()

    logger.info("Created submission %s for register %s", submission.id, submission.register_id)
    return SubmissionRead.model_validate(submission)


def get_submission(db: Session, submission_id: int) -> SubmissionRead:
    repo = SubmissionRepository(db)
    submission = repo.get_or_404(submission_id)
    return SubmissionRead.model_validate(submission)


def list_submissions(
    db: Session,
    organization_id: int,
    params: SubmissionListParams,
) -> PaginatedResponse[SubmissionRead]:
    repo = SubmissionRepository(db)
    skip = (params.page - 1) * params.page_size

    items = repo.search(
        organization_id=organization_id,
        project_id=params.project_id,
        register_id=params.register_id,
        status=params.status,
        search=params.search,
        skip=skip,
        limit=params.page_size,
        sort_by=params.sort_by,
        sort_order=params.sort_order,
    )
    total = repo.count_filtered(
        organization_id=organization_id,
        project_id=params.project_id,
        register_id=params.register_id,
        status=params.status,
        search=params.search,
    )

    return PaginatedResponse(
        items=[SubmissionRead.model_validate(s) for s in items],
        total=total,
        page=params.page,
        page_size=params.page_size,
        total_pages=max(1, (total + params.page_size - 1) // params.page_size),
    )


def update_submission(
    db: Session,
    submission_id: int,
    payload: "SubmissionUpdate",
) -> SubmissionRead:
    repo = SubmissionRepository(db)
    submission = repo.get_or_404(submission_id)
    old_form_data = dict(submission.form_data)

    data = payload.model_dump(exclude_unset=True, exclude_none=True)
    for key, value in data.items():
        setattr(submission, key, value)
    db.flush()

    audit = AuditLog(
        organization_id=submission.organization_id,
        entity_type="submission",
        entity_id=submission.id,
        action="updated",
        user_id=payload.submitted_by_id,
        changes={"form_data": {"from": old_form_data, "to": submission.form_data}},
    )
    db.add(audit)
    db.commit()
    db.refresh(submission)

    logger.info("Updated submission %s", submission.id)
    return SubmissionRead.model_validate(submission)


def delete_submission(db: Session, submission_id: int, user_id: int | None = None) -> None:
    repo = SubmissionRepository(db)
    submission = repo.get_or_404(submission_id)
    org_id = submission.organization_id

    audit = AuditLog(
        organization_id=org_id,
        entity_type="submission",
        entity_id=submission_id,
        action="deleted",
        user_id=user_id,
        changes={"form_data": {"from": submission.form_data, "to": None}},
    )
    db.add(audit)
    repo.delete(submission)
    db.commit()
    logger.info("Deleted submission %s", submission_id)


def update_submission_status(
    db: Session,
    submission_id: int,
    status: str,
    user_id: int | None = None,
) -> SubmissionRead:
    valid_statuses = {"draft", "submitted", "reviewed", "approved", "rejected"}
    if status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}",
        )

    repo = SubmissionRepository(db)
    submission = repo.get_or_404(submission_id)
    old_status = submission.status
    submission.status = status
    if status == "submitted" and old_status == "draft":
        submission.submitted_at = __import__("datetime").datetime.now()
    db.flush()

    audit = AuditLog(
        organization_id=submission.organization_id,
        entity_type="submission",
        entity_id=submission.id,
        action="status_changed",
        user_id=user_id,
        changes={"status": {"from": old_status, "to": status}},
    )
    db.add(audit)
    db.commit()
    db.refresh(submission)

    return SubmissionRead.model_validate(submission)
