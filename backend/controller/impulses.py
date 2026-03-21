from fastapi import APIRouter

from backend.models import (
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


@router.get("", response_model=list[ImpulseZonePublic])
def get_all_impulses(
    db: db_dependency,
    _: current_user_dependency,
):
    return list_all_impulse_zones(db)


@router.get("/me", response_model=UserImpulsesBundlePublic)
def get_my_impulses(
    db: db_dependency,
    current_user: current_user_dependency,
):
    return get_user_impulses_bundle(db, current_user=current_user)


@router.put("/me", response_model=UserImpulsesBundlePublic)
def replace_my_impulses(
    payload: UserImpulseSetRequest,
    db: db_dependency,
    current_user: current_user_dependency,
):
    return set_user_impulses(
        db,
        current_user=current_user,
        impulse_ids=payload.impulse_ids,
    )


@router.post("/possible", response_model=PossibleImpulseZonePublic)
def create_possible_impulse(
    payload: ImpulseZoneCreate,
    db: db_dependency,
):
    return create_possible_impulse_zone(db, payload=payload)


@router.get("/admin/real", response_model=list[ImpulseZonePublic])
def admin_get_impulses(
    db: db_dependency,
    _: admin_user_dependency,
):
    return admin_list_impulse_zones(db)


@router.post("/admin/real", response_model=ImpulseZonePublic)
def admin_create_impulse(
    payload: ImpulseZoneCreate,
    db: db_dependency,
    _: admin_user_dependency,
):
    return admin_create_impulse_zone(db, payload=payload)


@router.patch("/admin/real/{zone_id}", response_model=ImpulseZonePublic)
def admin_patch_impulse(
    zone_id: int,
    payload: ImpulseZoneUpdate,
    db: db_dependency,
    _: admin_user_dependency,
):
    return admin_update_impulse_zone(db, zone_id=zone_id, payload=payload)


@router.delete("/admin/real/{zone_id}")
def admin_remove_impulse(
    zone_id: int,
    db: db_dependency,
    _: admin_user_dependency,
):
    return admin_delete_impulse_zone(db, zone_id=zone_id)


@router.get("/admin/possible", response_model=list[PossibleImpulseZonePublic])
def admin_get_possible_impulses(
    db: db_dependency,
    _: admin_user_dependency,
):
    return admin_list_possible_impulse_zones(db)


@router.post("/admin/possible", response_model=PossibleImpulseZonePublic)
def admin_create_possible_impulse(
    payload: ImpulseZoneCreate,
    db: db_dependency,
    _: admin_user_dependency,
):
    return admin_create_possible_impulse_zone(db, payload=payload)


@router.patch("/admin/possible/{zone_id}", response_model=PossibleImpulseZonePublic)
def admin_patch_possible_impulse(
    zone_id: int,
    payload: ImpulseZoneUpdate,
    db: db_dependency,
    _: admin_user_dependency,
):
    return admin_update_possible_impulse_zone(db, zone_id=zone_id, payload=payload)


@router.delete("/admin/possible/{zone_id}")
def admin_remove_possible_impulse(
    zone_id: int,
    db: db_dependency,
    _: admin_user_dependency,
):
    return admin_delete_possible_impulse_zone(db, zone_id=zone_id)


@router.post("/admin/possible/{zone_id}/promote", response_model=ImpulseZonePublic)
def admin_promote_possible_impulse(
    zone_id: int,
    payload: PromotePossibleImpulseRequest,
    db: db_dependency,
    _: admin_user_dependency,
):
    return admin_promote_possible_impulse_zone(db, zone_id=zone_id, payload=payload)
