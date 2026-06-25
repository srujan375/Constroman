from datetime import date, datetime
from typing import Any, Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int


class OrganizationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    domain: str | None = None
    logo_url: str | None = None
    is_active: bool
    settings: dict[str, Any] = {}


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int
    name: str
    email: str
    role: str
    phone: str | None = None
    avatar_url: str | None = None
    is_active: bool
    last_login_at: datetime | None = None
    preferences: dict[str, Any] = {}
    created_at: datetime


class SubprojectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    name: str
    location: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    status: str
    custom_fields: dict[str, Any] = {}


class ProjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int
    name: str
    location: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    status: str
    code: str | None = None
    custom_fields: dict[str, Any] = {}
    subprojects: list[SubprojectRead] = []


class ProjectAssignmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    user_id: int
    role: str | None = None
    created_at: datetime


class ReportCreate(BaseModel):
    project_id: int
    subproject_id: int | None = None
    report_date: date
    title: str | None = None
    status: str = "draft"
    weather: dict[str, Any] | None = None
    prepared_by_id: int | None = None
    notes: str | None = None


class ReportRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    subproject_id: int | None = None
    report_date: date
    title: str | None = None
    status: str
    weather: dict[str, Any] | None = None
    prepared_by_id: int | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime | None = None


class RegisterCreate(BaseModel):
    name: str
    slug: str
    description: str | None = None
    icon: str | None = None
    sort_order: int = 0
    scope: str = "project"
    config: dict[str, Any] = {}
    is_active: bool = True


class RegisterRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int
    name: str
    slug: str
    description: str | None = None
    icon: str | None = None
    sort_order: int
    scope: str
    config: dict[str, Any]
    is_active: bool
    is_system: bool
    created_at: datetime
    updated_at: datetime | None = None


class FormTemplateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

    id: int
    register_id: int
    name: str
    version: int
    schema_json: dict[str, Any]
    ui_schema: dict[str, Any] | None = None
    validation_rules: dict[str, Any] = {}
    is_active: bool
    is_published: bool
    published_at: datetime | None = None
    created_by_id: int | None = None
    created_at: datetime
    updated_at: datetime | None = None


class SubmissionCreate(BaseModel):
    organization_id: int
    project_id: int | None = None
    register_id: int
    template_id: int
    report_id: int | None = None
    submission_date: date | None = None
    title: str | None = None
    status: str = "draft"
    form_data: dict[str, Any] = Field(default_factory=dict)
    submitted_by_id: int | None = None
    custom_fields: dict[str, Any] = Field(default_factory=dict)


class SubmissionUpdate(BaseModel):
    project_id: int | None = None
    submission_date: date | None = None
    title: str | None = None
    status: str | None = None
    form_data: dict[str, Any] | None = None
    submitted_by_id: int | None = None


class SubmissionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int
    project_id: int | None = None
    register_id: int
    template_id: int
    report_id: int | None = None
    submission_date: date
    title: str | None = None
    status: str
    form_data: dict[str, Any]
    serial_no: int | None = None
    submitted_by_id: int | None = None
    submitted_at: datetime | None = None
    custom_fields: dict[str, Any] = {}
    created_at: datetime
    updated_at: datetime | None = None


class SubmissionListParams(BaseModel):
    project_id: int | None = None
    register_id: int | None = None
    status: str | None = None
    search: str | None = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=200)
    sort_by: str = "created_at"
    sort_order: str = "desc"


class AttachmentCreate(BaseModel):
    submission_id: int | None = None
    entity_type: str | None = None
    entity_id: int | None = None
    file_name: str
    file_size: int
    mime_type: str
    storage_path: str
    storage_provider: str = "local"
    uploaded_by_id: int | None = None


class AttachmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int
    submission_id: int | None = None
    entity_type: str | None = None
    entity_id: int | None = None
    file_name: str
    file_size: int
    mime_type: str
    storage_path: str
    storage_provider: str
    uploaded_by_id: int | None = None
    created_at: datetime


class CommentCreate(BaseModel):
    submission_id: int
    parent_id: int | None = None
    user_id: int
    content: str
    is_internal: bool = False


class CommentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int
    submission_id: int
    parent_id: int | None = None
    user_id: int
    content: str
    is_internal: bool
    created_at: datetime
    updated_at: datetime | None = None


class AuditLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int
    entity_type: str
    entity_id: int
    action: str
    user_id: int | None = None
    changes: dict[str, Any] | None = None
    context: dict[str, Any] | None = None
    created_at: datetime
