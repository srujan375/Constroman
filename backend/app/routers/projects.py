from fastapi import APIRouter, Depends, Query

from app.auth.dependencies import get_current_user
from app.dependencies import DbSession, Pagination
from app.models import User
from app.schemas import ProjectRead
from app.services.project_service import list_projects, get_project

router = APIRouter(
    prefix="/projects",
    tags=["projects"],
    dependencies=[Depends(get_current_user)],
)


@router.get("", response_model=list[ProjectRead])
def get_projects(
    db: DbSession,
    pagination: Pagination,
    organization_id: int | None = Query(default=None),
    status: str | None = Query(default=None),
) -> list[ProjectRead]:
    return list_projects(
        db,
        organization_id=organization_id,
        status=status,
        skip=(pagination["page"] - 1) * pagination["page_size"],
        limit=pagination["page_size"],
    )


@router.get("/{id}", response_model=ProjectRead)
def get_project_by_id(id: int, db: DbSession) -> ProjectRead:
    return get_project(db, id)
