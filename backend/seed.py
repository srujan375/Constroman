import json
from datetime import date, datetime
from pathlib import Path

from sqlalchemy import text

from app.auth.utils import hash_password
from app.database import SessionLocal, engine, Base
from app.models import (
    Organization,
    Role,
    User,
    Project,
    Register,
    FormTemplate,
)

# Canonical sheet/field definitions shared with the frontend.
SHEETS_CONFIG_PATH = (
    Path(__file__).resolve().parent.parent
    / "frontend-app"
    / "lib"
    / "sheets.config.json"
)


def load_sheets() -> list[dict]:
    with open(SHEETS_CONFIG_PATH, encoding="utf-8") as fh:
        return json.load(fh)["sheets"]


def ensure_schema():
    """Create tables using raw SQL to avoid SQLAlchemy index conflicts."""
    meta = Base.metadata
    tables = meta.sorted_tables
    with engine.begin() as conn:
        existing = set(
            row[0]
            for row in conn.execute(
                text("SELECT tablename FROM pg_tables WHERE schemaname='public'")
            ).all()
        )
        for table in tables:
            if table.name not in existing:
                table.create(conn, checkfirst=True)
                print(f"  Created table: {table.name}")
        for table in tables:
            for index in table.indexes:
                if index.name:
                    exists = conn.execute(
                        text(
                            "SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname=:name"
                        ),
                        {"name": index.name},
                    ).first()
                    if not exists:
                        index.create(conn)
                        print(f"  Created index: {index.name}")


ensure_schema()


def seed():
    ensure_schema()
    db = SessionLocal()

    if db.query(Organization).count() > 0:
        print("Database already seeded, skipping.")
        db.close()
        return

    admin_role = Role(name="admin", description="Organization administrator")
    employee_role = Role(name="employee", description="Regular employee")
    db.add_all([admin_role, employee_role])
    db.flush()

    org = Organization(
        name="Constroman Constructions Pvt Ltd",
        slug="constroman",
        password_hash=hash_password("org123"),
        is_active=True,
        settings={"timezone": "Asia/Kolkata"},
    )
    db.add(org)
    db.flush()

    user = User(
        organization_id=org.id,
        name="Admin User",
        email="admin@constroman.com",
        password_hash=hash_password("admin123"),
        role_id=admin_role.id,
        role="admin",
        is_active=True,
    )
    db.add(user)

    employee = User(
        organization_id=org.id,
        name="Employee User",
        email="employee@constroman.com",
        password_hash=hash_password("emp123"),
        role_id=employee_role.id,
        role="employee",
        is_active=True,
    )
    db.add(employee)

    projects_data = [
        {
            "name": "Skyline Tower",
            "location": "Bandra Kurla Complex, Mumbai",
            "start_date": date(2024, 1, 15),
            "status": "active",
            "code": "ST-2024",
        },
        {
            "name": "Green Valley Residency",
            "location": "Hinjewadi, Pune",
            "start_date": date(2024, 3, 1),
            "status": "active",
            "code": "GV-2024",
        },
    ]

    created_projects = []
    for p in projects_data:
        project = Project(
            organization_id=org.id,
            name=p["name"],
            location=p["location"],
            start_date=p["start_date"],
            status=p["status"],
            code=p["code"],
        )
        db.add(project)
        created_projects.append(project)
    db.flush()

    from app.models import ProjectAssignment
    if created_projects:
        assign = ProjectAssignment(
            project_id=created_projects[0].id,
            user_id=employee.id,
            role="viewer",
        )
        db.add(assign)

    sheets = load_sheets()
    for idx, sheet in enumerate(sheets, start=1):
        config = {
            "code": sheet["code"],
            "group": sheet["group"],
            "icon": sheet["icon"],
            "mode": sheet["mode"],
            "enable_serial_number": bool(sheet.get("serial")),
            "allow_multiple_per_day": sheet["mode"] != "document",
        }
        register = Register(
            organization_id=org.id,
            name=sheet["name"],
            slug=sheet["registerSlug"],
            sort_order=idx,
            scope="project",
            config=config,
            is_active=True,
        )
        db.add(register)
        db.flush()

        template = FormTemplate(
            register_id=register.id,
            name=f"{sheet['name']} v1",
            version=1,
            schema_json={"fields": sheet["fields"]},
            ui_schema={"title": sheet["title"], "mode": sheet["mode"]},
            is_active=True,
            is_published=True,
            published_at=datetime.now(),
            created_by_id=user.id,
        )
        db.add(template)

    db.commit()
    count = db.query(Register).count()
    db.close()
    print(f"Database seeded successfully! ({count} registers)")


if __name__ == "__main__":
    seed()
