from fastapi import APIRouter, Depends, Query, status

from app.auth.dependencies import get_current_user
from app.dependencies import DbSession
from app.schemas import CommentCreate, CommentRead
from app.services.comment_service import create_comment, list_comments

router = APIRouter(
    prefix="/comments",
    tags=["comments"],
    dependencies=[Depends(get_current_user)],
)


@router.post("", response_model=CommentRead, status_code=status.HTTP_201_CREATED)
def post_comment(
    payload: CommentCreate,
    db: DbSession,
    organization_id: int = Query(default=1),
) -> CommentRead:
    return create_comment(db, organization_id, payload)


@router.get("", response_model=list[CommentRead])
def get_comments(
    db: DbSession,
    organization_id: int = Query(default=1),
    submission_id: int | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
) -> list[CommentRead]:
    return list_comments(
        db,
        organization_id,
        submission_id=submission_id,
        skip=(page - 1) * page_size,
        limit=page_size,
    )
