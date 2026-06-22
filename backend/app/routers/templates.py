from fastapi import APIRouter, Depends

from app.auth.dependencies import get_current_user
from app.dependencies import DbSession
from app.schemas import FormTemplateRead
from app.services.template_service import list_templates_by_register

router = APIRouter(
    prefix="/templates",
    tags=["templates"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/{register_id}", response_model=list[FormTemplateRead])
def get_templates(register_id: int, db: DbSession) -> list[FormTemplateRead]:
    return list_templates_by_register(db, register_id)
