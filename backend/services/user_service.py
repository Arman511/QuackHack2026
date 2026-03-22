from fastapi import HTTPException, status
import logging
from sqlalchemy.orm import Session

from backend.models import (
    UserAdminPatch,
    UserDB,
    UserMetadataPublic,
    UserRead,
    UserTypeEnum,
    UserUpdate,
)
from backend.repositories.user_metadata_repository import UserMetadataRepository
from backend.repositories.user_repository import UserRepository
from backend.services.auth_service import get_password_hash, roles_to_csv

logger = logging.getLogger(__name__)


def update_current_user_profile(
    db: Session, *, current_user: UserDB, payload: UserUpdate
) -> UserRead:
    logger.info("Updating current user profile user_id=%s", current_user.id)
    user_repo = UserRepository(db)
    updated_user = user_repo.update_self(
        user_id=current_user.id,
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=(
            get_password_hash(payload.password) if payload.password else None
        ),
    )
    if updated_user is None:
        logger.warning("Current user profile update failed user_id=%s", current_user.id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    logger.info("Current user profile updated user_id=%s", current_user.id)
    return UserRead.model_validate(updated_user)


def admin_patch_user(
    db: Session,
    *,
    actor: UserDB,
    user_id: int,
    payload: UserAdminPatch,
) -> UserRead:
    logger.info(
        "Admin patch user requested actor_id=%s target_user_id=%s", actor.id, user_id
    )
    user_repo = UserRepository(db)
    target = user_repo.get_by_id(user_id)
    if target is None:
        logger.warning("Admin patch target not found user_id=%s", user_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    new_roles = payload.roles
    if actor.id == user_id and new_roles and UserTypeEnum.ADMIN not in new_roles:
        logger.warning("Admin self-demotion prevented actor_id=%s", actor.id)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admins cannot remove their own ADMIN role",
        )

    roles_csv = None
    if new_roles is not None:
        roles_csv = roles_to_csv(new_roles)

    updated_user = user_repo.admin_update_user(
        user_id=user_id,
        username=payload.username,
        hashed_password=(
            get_password_hash(payload.password) if payload.password else None
        ),
        is_active=payload.is_active,
        roles=roles_csv,
    )
    if updated_user is None:
        logger.warning("Admin patch update failed target_user_id=%s", user_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    logger.info(
        "Admin patch user completed actor_id=%s target_user_id=%s", actor.id, user_id
    )
    return UserRead.model_validate(updated_user)


def admin_get_user_by_id(db: Session, actor: UserDB, user_id: int) -> UserRead:
    user_repo = UserRepository(db)
    if UserTypeEnum.ADMIN not in actor.roles:
        logger.warning("Admin-only profile read denied actor_id=%s", actor.id)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access other users' profiles",
        )
    target = user_repo.admin_get_user_by_id(user_id)
    if target is None:
        logger.warning("Admin profile lookup target not found user_id=%s", user_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    logger.info(
        "Admin profile lookup success actor_id=%s target_user_id=%s", actor.id, user_id
    )
    return UserRead.model_validate(target)


def delete_user(
    db: Session,
    *,
    actor: UserDB,
    user_id: int,
) -> dict[str, bool]:
    """Delete a user when actor is admin or deleting their own account."""
    if actor.id != user_id and UserTypeEnum.ADMIN not in actor.roles:
        logger.warning(
            "Delete user denied actor_id=%s target_user_id=%s",
            actor.id,
            user_id,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own account unless you are an admin",
        )

    deleted = UserRepository(db).delete_user_by_id(user_id)
    if not deleted:
        logger.warning("Delete user target not found user_id=%s", user_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    logger.info(
        "Delete user completed actor_id=%s target_user_id=%s",
        actor.id,
        user_id,
    )
    return {"deleted": True}


def patch_current_user_tax_percentage(
    db: Session,
    *,
    current_user: UserDB,
    tax_percentage: int,
) -> UserMetadataPublic:
    """Update only tax percentage for current user metadata."""
    logger.info(
        "Patching tax percentage for user_id=%s tax_percentage=%s",
        current_user.id,
        tax_percentage,
    )
    metadata_repo = UserMetadataRepository(db)
    existing = metadata_repo.get_by_user_id(current_user.id)
    patched = metadata_repo.set_goal(
        user_id=current_user.id,
        goal=existing.goal if existing else None,
        bank_account_id=existing.bank_account_id if existing else None,
        impulse_limit=existing.impulse_limit if existing else None,
        tax_percentage=tax_percentage,
    )
    logger.info(
        "Tax percentage patched for user_id=%s metadata_id=%s",
        current_user.id,
        patched.id,
    )
    return patched
