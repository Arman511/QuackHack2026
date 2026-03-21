from fastapi import APIRouter

from backend.models import (
    UserAdminPatch,
    UserGoalSetRequest,
    UserLimitStatusPublic,
    UserMetadataPublic,
    UserRead,
    UserUpdate,
)
from backend.services.bank_service import get_user_limit_status, set_user_goal
from backend.services.user_service import (
    admin_patch_user,
    update_current_user_profile,
    admin_get_user_by_id,
)
from backend.utils.dependencies import (
    admin_user_dependency,
    current_user_dependency,
    db_dependency,
)

router = APIRouter(prefix="/users", tags=["users"])


@router.put("/me", response_model=UserRead)
def update_my_profile(
    payload: UserUpdate,
    db: db_dependency,
    current_user: current_user_dependency,
):
    return update_current_user_profile(db, current_user=current_user, payload=payload)


@router.post("/me/goal", response_model=UserMetadataPublic)
def set_my_goal(
    payload: UserGoalSetRequest,
    db: db_dependency,
    current_user: current_user_dependency,
):
    return set_user_goal(db, current_user=current_user, payload=payload)


@router.get("/me/is-passed-limit", response_model=UserLimitStatusPublic)
def get_my_limit_status(
    db: db_dependency,
    current_user: current_user_dependency,
):
    return get_user_limit_status(db, current_user=current_user)


@router.get("/{user_id}", response_model=UserRead)
def get_user(
    user_id: int,
    db: db_dependency,
    admin_user: admin_user_dependency,
):
    return admin_get_user_by_id(db, actor=admin_user, user_id=user_id)


@router.patch("/{user_id}", response_model=UserRead)
def patch_user_as_admin(
    user_id: int,
    payload: UserAdminPatch,
    db: db_dependency,
    admin_user: admin_user_dependency,
):
    return admin_patch_user(db, actor=admin_user, user_id=user_id, payload=payload)
