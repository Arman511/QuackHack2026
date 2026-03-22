from fastapi import APIRouter
import logging

from backend.models import (
    DeletedResponse,
    PossibleImpulseZonePublic,
    UserAdminPatch,
    UserGoalSetRequest,
    UserLimitStatusPublic,
    UserMetadataPublic,
    UserRead,
    UserUpdate,
)
from backend.services.bank_service import (
    get_user_limit_status,
    get_user_possible_impulses,
    set_user_goal,
)
from backend.services.user_service import (
    admin_patch_user,
    delete_user,
    update_current_user_profile,
    admin_get_user_by_id,
)
from backend.utils.dependencies import (
    admin_user_dependency,
    current_user_dependency,
    db_dependency,
)

router = APIRouter(prefix="/users", tags=["users"])
logger = logging.getLogger(__name__)


@router.put("/me", response_model=UserRead)
def update_my_profile(
    payload: UserUpdate,
    db: db_dependency,
    current_user: current_user_dependency,
):
    """Update the authenticated user's profile fields."""
    logger.info("Updating profile for user_id=%s", current_user.id)
    return update_current_user_profile(db, current_user=current_user, payload=payload)


@router.post("/me/goal", response_model=UserMetadataPublic)
def set_my_goal(
    payload: UserGoalSetRequest,
    db: db_dependency,
    current_user: current_user_dependency,
):
    """Set or update the authenticated user's goal and spending controls."""
    logger.info("Setting goal metadata for user_id=%s", current_user.id)
    return set_user_goal(db, current_user=current_user, payload=payload)


@router.get("/me/is-passed-limit", response_model=UserLimitStatusPublic)
def get_my_limit_status(
    db: db_dependency,
    current_user: current_user_dependency,
):
    """Return monthly spending and limit status for the authenticated user."""
    logger.debug("Getting limit status for user_id=%s", current_user.id)
    return get_user_limit_status(db, current_user=current_user)


@router.get("/me/possible-impulses", response_model=list[PossibleImpulseZonePublic])
def get_my_possible_impulses(
    db: db_dependency,
    current_user: current_user_dependency,
):
    """List possible impulse zones available to the authenticated user."""
    logger.debug("Getting possible impulses for user_id=%s", current_user.id)
    return get_user_possible_impulses(db, current_user=current_user)


@router.get("/{user_id}", response_model=UserRead)
def get_user(
    user_id: int,
    db: db_dependency,
    admin_user: admin_user_dependency,
):
    """Get a user by ID (admin only)."""
    logger.info(
        "Admin user lookup actor_id=%s target_user_id=%s", admin_user.id, user_id
    )
    return admin_get_user_by_id(db, actor=admin_user, user_id=user_id)


@router.patch("/{user_id}", response_model=UserRead)
def patch_user_as_admin(
    user_id: int,
    payload: UserAdminPatch,
    db: db_dependency,
    admin_user: admin_user_dependency,
):
    """Patch user profile and access fields (admin only)."""
    logger.info(
        "Admin patch user actor_id=%s target_user_id=%s", admin_user.id, user_id
    )
    return admin_patch_user(db, actor=admin_user, user_id=user_id, payload=payload)


@router.delete("/{user_id}", response_model=DeletedResponse)
def delete_user_account(
    user_id: int,
    db: db_dependency,
    current_user: current_user_dependency,
):
    """Delete a user account (self or admin)."""
    logger.info(
        "Delete user requested actor_id=%s target_user_id=%s", current_user.id, user_id
    )
    return delete_user(db, actor=current_user, user_id=user_id)
