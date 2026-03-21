from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.models import UserAdminPatch, UserDB, UserRead, UserTypeEnum, UserUpdate
from backend.repositories.user_repository import UserRepository
from backend.services.auth_service import get_password_hash, roles_to_csv


def update_current_user_profile(
    db: Session, *, current_user: UserDB, payload: UserUpdate
) -> UserRead:
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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return UserRead.model_validate(updated_user)


def admin_patch_user(
    db: Session,
    *,
    actor: UserDB,
    user_id: int,
    payload: UserAdminPatch,
) -> UserRead:
    user_repo = UserRepository(db)
    target = user_repo.get_by_id(user_id)
    if target is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    new_roles = payload.roles
    if actor.id == user_id and new_roles and UserTypeEnum.ADMIN not in new_roles:
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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    return UserRead.model_validate(updated_user)


def admin_get_user_by_id(db: Session, actor: UserDB, user_id: int) -> UserRead:
    user_repo = UserRepository(db)
    if UserTypeEnum.ADMIN not in actor.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access other users' profiles",
        )
    target = user_repo.admin_get_user_by_id(user_id)
    if target is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return UserRead.model_validate(target)
