from fastapi import APIRouter, Depends, Query, status

from app.auth.dependencies import get_current_user
from app.dependencies import DbSession
from app.schemas import AttachmentCreate, AttachmentRead
from app.services.attachment_service import create_attachment, list_attachments

router = APIRouter(
    prefix="/attachments",
    tags=["attachments"],
    dependencies=[Depends(get_current_user)],
)


@router.post("", response_model=AttachmentRead, status_code=status.HTTP_201_CREATED)
def post_attachment(
    payload: AttachmentCreate,
    db: DbSession,
    organization_id: int = Query(default=1),
) -> AttachmentRead:
    return create_attachment(db, organization_id, payload)


@router.get("", response_model=list[AttachmentRead])
def get_attachments(
    db: DbSession,
    organization_id: int = Query(default=1),
    submission_id: int | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
) -> list[AttachmentRead]:
    return list_attachments(
        db,
        organization_id,
        submission_id=submission_id,
        skip=(page - 1) * page_size,
        limit=page_size,
    )
