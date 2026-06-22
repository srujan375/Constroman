from fastapi import APIRouter, Depends, Query

from app.auth.dependencies import get_current_user
from app.dependencies import DbSession
from app.schemas import AuditLogRead
from app.services.audit_service import list_audit_logs

router = APIRouter(
    prefix="/audit-logs",
    tags=["audit-logs"],
    dependencies=[Depends(get_current_user)],
)


@router.get("", response_model=list[AuditLogRead])
def get_audit_logs(
    db: DbSession,
    organization_id: int = Query(default=1),
    entity_type: str | None = Query(default=None),
    entity_id: int | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
) -> list[AuditLogRead]:
    return list_audit_logs(
        db,
        organization_id,
        entity_type=entity_type,
        entity_id=entity_id,
        skip=(page - 1) * page_size,
        limit=page_size,
    )
