from fastapi import APIRouter, Depends, Query, status

from app.auth.dependencies import get_current_user
from app.dependencies import DbSession, Pagination
from app.schemas import ReportCreate, ReportRead
from app.services.report_service import create_report, list_reports, get_report

router = APIRouter(
    prefix="/reports",
    tags=["reports"],
    dependencies=[Depends(get_current_user)],
)


@router.post("", response_model=ReportRead, status_code=status.HTTP_201_CREATED)
def post_report(payload: ReportCreate, db: DbSession) -> ReportRead:
    return create_report(db, payload)


@router.get("", response_model=list[ReportRead])
def get_reports(
    db: DbSession,
    pagination: Pagination,
    project_id: int | None = Query(default=None),
) -> list[ReportRead]:
    return list_reports(
        db,
        project_id=project_id,
        skip=(pagination["page"] - 1) * pagination["page_size"],
        limit=pagination["page_size"],
    )


@router.get("/{id}", response_model=ReportRead)
def get_report_by_id(id: int, db: DbSession) -> ReportRead:
    return get_report(db, id)
