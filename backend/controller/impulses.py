from fastapi import APIRouter
import logging

from backend.models import (
    DeletedResponse,
    ImpulseZoneCreate,
    ImpulseZonePublic,
    ImpulseZoneUpdate,
    PossibleImpulseZonePublic,
    PromotePossibleImpulseRequest,
    UserImpulsesBundlePublic,
    UserImpulseSetRequest,
)
from backend.services.bank_service import (
    admin_create_impulse_zone,
    admin_create_possible_impulse_zone,
    admin_delete_impulse_zone,
    admin_delete_possible_impulse_zone,
    admin_list_impulse_zones,
    admin_list_possible_impulse_zones,
    admin_promote_possible_impulse_zone,
    admin_update_impulse_zone,
    admin_update_possible_impulse_zone,
    create_possible_impulse_zone,
    delete_user_possible_impulse_zone,
    get_user_impulses_bundle,
    list_all_impulse_zones,
    set_user_impulses,
)
from backend.utils.dependencies import (
    admin_user_dependency,
    current_user_dependency,
    db_dependency,
)

router = APIRouter(prefix="/impulses", tags=["impulses"])
logger = logging.getLogger(__name__)


@router.get("", response_model=list[ImpulseZonePublic])
def get_all_impulses(
    db: db_dependency,
    _: current_user_dependency,
):
    """List all real impulse zones available to signed-in users."""
    logger.debug("Listing all impulse zones")
    return list_all_impulse_zones(db)


@router.get("/me", response_model=UserImpulsesBundlePublic)
def get_my_impulses(
    db: db_dependency,
    current_user: current_user_dependency,
):
    """Get the authenticated user's real and possible impulse bundle."""
    logger.debug("Fetching impulse bundle for user_id=%s", current_user.id)
    return get_user_impulses_bundle(db, current_user=current_user)


@router.put("/me", response_model=UserImpulsesBundlePublic)
def replace_my_impulses(
    payload: UserImpulseSetRequest,
    db: db_dependency,
    current_user: current_user_dependency,
):
    """Replace the authenticated user's selected real impulses."""
    logger.info(
        "Replacing user impulses user_id=%s impulse_count=%s",
        current_user.id,
        len(payload.impulse_ids),
    )
    return set_user_impulses(
        db,
        current_user=current_user,
        impulse_ids=payload.impulse_ids,
    )


@router.post("/possible", response_model=PossibleImpulseZonePublic)
def create_possible_impulse(
    payload: ImpulseZoneCreate,
    db: db_dependency,
    current_user: current_user_dependency,
):
    """Create a user-owned possible impulse suggestion."""
    logger.info("Creating possible impulse for user_id=%s", current_user.id)
    return create_possible_impulse_zone(
        db,
        current_user=current_user,
        payload=payload,
    )


@router.delete("/possible/{zone_id}", response_model=DeletedResponse)
def remove_my_possible_impulse(
    zone_id: int,
    db: db_dependency,
    current_user: current_user_dependency,
):
    """Delete a user-owned possible impulse suggestion."""
    logger.info(
        "Deleting user possible impulse user_id=%s zone_id=%s",
        current_user.id,
        zone_id,
    )
    return delete_user_possible_impulse_zone(
        db,
        current_user=current_user,
        zone_id=zone_id,
    )


@router.get("/admin/real", response_model=list[ImpulseZonePublic])
def admin_get_impulses(
    db: db_dependency,
    _: admin_user_dependency,
):
    """List all real impulse zones (admin only)."""
    logger.debug("Admin listing real impulse zones")
    return admin_list_impulse_zones(db)


@router.post("/admin/real", response_model=ImpulseZonePublic)
def admin_create_impulse(
    payload: ImpulseZoneCreate,
    db: db_dependency,
    _: admin_user_dependency,
):
    """Create a real impulse zone (admin only)."""
    logger.info("Admin creating real impulse zone name=%s", payload.name)
    return admin_create_impulse_zone(db, payload=payload)


@router.patch("/admin/real/{zone_id}", response_model=ImpulseZonePublic)
def admin_patch_impulse(
    zone_id: int,
    payload: ImpulseZoneUpdate,
    db: db_dependency,
    _: admin_user_dependency,
):
    """Update a real impulse zone by ID (admin only)."""
    logger.info("Admin updating real impulse zone zone_id=%s", zone_id)
    return admin_update_impulse_zone(db, zone_id=zone_id, payload=payload)


@router.delete("/admin/real/{zone_id}")
def admin_remove_impulse(
    zone_id: int,
    db: db_dependency,
    _: admin_user_dependency,
):
    """Delete a real impulse zone by ID (admin only)."""
    logger.info("Admin deleting real impulse zone zone_id=%s", zone_id)
    return admin_delete_impulse_zone(db, zone_id=zone_id)


@router.get("/admin/possible", response_model=list[PossibleImpulseZonePublic])
def admin_get_possible_impulses(
    db: db_dependency,
    _: admin_user_dependency,
):
    """List all possible impulse zones (admin only)."""
    logger.debug("Admin listing possible impulse zones")
    return admin_list_possible_impulse_zones(db)


@router.post("/admin/possible", response_model=PossibleImpulseZonePublic)
def admin_create_possible_impulse(
    payload: ImpulseZoneCreate,
    db: db_dependency,
    _: admin_user_dependency,
):
    """Create a possible impulse zone without user scope (admin only)."""
    logger.info("Admin creating possible impulse zone name=%s", payload.name)
    return admin_create_possible_impulse_zone(db, payload=payload)


@router.patch("/admin/possible/{zone_id}", response_model=PossibleImpulseZonePublic)
def admin_patch_possible_impulse(
    zone_id: int,
    payload: ImpulseZoneUpdate,
    db: db_dependency,
    _: admin_user_dependency,
):
    """Update a possible impulse zone by ID (admin only)."""
    logger.info("Admin updating possible impulse zone zone_id=%s", zone_id)
    return admin_update_possible_impulse_zone(db, zone_id=zone_id, payload=payload)


@router.delete("/admin/possible/{zone_id}")
def admin_remove_possible_impulse(
    zone_id: int,
    db: db_dependency,
    _: admin_user_dependency,
):
    """Delete a possible impulse zone by ID (admin only)."""
    logger.info("Admin deleting possible impulse zone zone_id=%s", zone_id)
    return admin_delete_possible_impulse_zone(db, zone_id=zone_id)


@router.post("/admin/possible/{zone_id}/promote", response_model=ImpulseZonePublic)
def admin_promote_possible_impulse(
    zone_id: int,
    payload: PromotePossibleImpulseRequest,
    db: db_dependency,
    _: admin_user_dependency,
):
    """Promote a possible impulse zone into a real impulse zone (admin only)."""
    logger.info("Admin promoting possible impulse zone zone_id=%s", zone_id)
    return admin_promote_possible_impulse_zone(db, zone_id=zone_id, payload=payload)
