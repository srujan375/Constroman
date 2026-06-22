from fastapi import APIRouter, Depends

from app.auth.dependencies import get_current_user
from app.dependencies import DbSession
from app.schemas import FormCategoryRead
from app.services.categories import list_categories

router = APIRouter(
    tags=["categories"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/categories", response_model=list[FormCategoryRead])
def get_categories(db: DbSession) -> list[FormCategoryRead]:
    return list_categories(db)
