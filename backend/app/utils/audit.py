from typing import Optional
from uuid import UUID
from sqlalchemy.orm import Session
from app.models import AuditLog


def log_action(
    db: Session,
    user_id: Optional[UUID],
    action: str,
    entity_type: Optional[str] = None,
    entity_id: Optional[UUID] = None,
    details: Optional[str] = None,
    ip_address: Optional[str] = None,
) -> None:
    log = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details,
        ip_address=ip_address,
    )
    db.add(log)
    db.commit()
    db.refresh(log)