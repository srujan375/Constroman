from fastapi import APIRouter, Depends, Query, status

from app.auth.dependencies import get_current_user
from app.dependencies import DbSession
from app.models import User
from app.schemas import (
    SubmissionCreate,
    SubmissionUpdate,
    SubmissionRead,
    SubmissionListParams,
    PaginatedResponse,
)
from app.services.submission_service import (
    create_submission,
    get_submission,
    list_submissions,
    update_submission,
    delete_submission,
    update_submission_status,
)

router = APIRouter(
    prefix="/submissions",
    tags=["submissions"],
    dependencies=[Depends(get_current_user)],
)


@router.post("", response_model=SubmissionRead, status_code=status.HTTP_201_CREATED)
def post_submission(payload: SubmissionCreate, db: DbSession) -> SubmissionRead:
    return create_submission(db, payload)


@router.get("/{id}", response_model=SubmissionRead)
def get_submission_by_id(id: int, db: DbSession) -> SubmissionRead:
    return get_submission(db, id)


@router.get("", response_model=PaginatedResponse[SubmissionRead])
def get_submissions(
    db: DbSession,
    organization_id: int = Query(default=1),
    project_id: int | None = Query(default=None),
    register_id: int | None = Query(default=None),
    status: str | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    sort_by: str = Query(default="created_at"),
    sort_order: str = Query(default="desc"),
) -> PaginatedResponse[SubmissionRead]:
    params = SubmissionListParams(
        project_id=project_id,
        register_id=register_id,
        status=status,
        search=search,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    return list_submissions(db, organization_id=organization_id, params=params)


@router.put("/{id}", response_model=SubmissionRead)
def put_submission(id: int, payload: SubmissionUpdate, db: DbSession) -> SubmissionRead:
    return update_submission(db, id, payload)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_submission(id: int, db: DbSession, user_id: int | None = Query(default=None)) -> None:
    delete_submission(db, id, user_id=user_id)


@router.patch("/{id}/status", response_model=SubmissionRead)
def patch_submission_status(
    id: int,
    db: DbSession,
    status: str = Query(...),
    user_id: int | None = Query(default=None),
) -> SubmissionRead:
    return update_submission_status(db, id, status, user_id=user_id)
