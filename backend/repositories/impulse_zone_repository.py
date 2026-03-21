from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.models import ImpulseZonePublic, PossibleImpulseZonePublic


class ImpulseZoneRepository:
    """Repository for impulse zone operations."""

    SQL_CREATE_IMPULSE_ZONE = text("""
        INSERT INTO impulse_zones (name)
        VALUES (:name)
        RETURNING id, name, created_at
        """)

    SQL_SELECT_IMPULSE_ZONE_BY_ID = text("""
        SELECT id, name, created_at
        FROM impulse_zones
        WHERE id = :zone_id
        """)

    SQL_SELECT_ALL_IMPULSE_ZONES = text("""
        SELECT id, name, created_at
        FROM impulse_zones
        ORDER BY created_at
        """)

    SQL_UPDATE_IMPULSE_ZONE = text("""
        UPDATE impulse_zones
        SET name = :name
        WHERE id = :zone_id
        RETURNING id, name, created_at
        """)

    SQL_DELETE_IMPULSE_ZONE = text("""
        DELETE FROM impulse_zones
        WHERE id = :zone_id
        """)

    SQL_CREATE_POSSIBLE_IMPULSE_ZONE = text("""
        INSERT INTO possible_impulse_zones (user_id, name)
        VALUES (:user_id, :name)
        RETURNING id, user_id, name, created_at
        """)

    SQL_SELECT_POSSIBLE_IMPULSE_ZONE_BY_ID = text("""
        SELECT id, user_id, name, created_at
        FROM possible_impulse_zones
        WHERE id = :zone_id
        """)

    SQL_SELECT_ALL_POSSIBLE_IMPULSE_ZONES = text("""
        SELECT id, user_id, name, created_at
        FROM possible_impulse_zones
        ORDER BY created_at
        """)

    SQL_SELECT_POSSIBLE_IMPULSE_ZONES_FOR_USER = text("""
        SELECT id, user_id, name, created_at
        FROM possible_impulse_zones
        WHERE user_id = :user_id OR user_id IS NULL
        ORDER BY created_at
        """)

    SQL_UPDATE_POSSIBLE_IMPULSE_ZONE = text("""
        UPDATE possible_impulse_zones
        SET name = :name
        WHERE id = :zone_id
        RETURNING id, user_id, name, created_at
        """)

    SQL_PROMOTE_POSSIBLE_TO_IMPULSE_ZONE = text("""
        -- Move transactions from possible_impulse_zone_id to impulse_zone_id
        UPDATE transactions
        SET impulse_zone_id = :new_impulse_zone_id
        WHERE possible_impulse_zone_id = :possible_zone_id
        """)

    SQL_DELETE_POSSIBLE_IMPULSE_ZONE = text("""
        DELETE FROM possible_impulse_zones
        WHERE id = :zone_id
        """)

    SQL_SELECT_USER_IMPULSES = text("""
        SELECT z.id, z.name, z.created_at
        FROM user_impulses ui
        INNER JOIN impulse_zones z ON z.id = ui.impulse_id
        WHERE ui.user_id = :user_id
        ORDER BY z.created_at
        """)

    SQL_DELETE_USER_IMPULSES = text("""
        DELETE FROM user_impulses
        WHERE user_id = :user_id
        """)

    SQL_INSERT_USER_IMPULSE = text("""
        INSERT INTO user_impulses (user_id, impulse_id)
        VALUES (:user_id, :impulse_id)
        ON CONFLICT (user_id, impulse_id) DO NOTHING
        """)

    def __init__(self, db: Session):
        self.db = db

    def create_impulse_zone(self, name: str) -> ImpulseZonePublic:
        """Create a new impulse zone."""
        row = (
            self.db.execute(
                self.SQL_CREATE_IMPULSE_ZONE,
                {"name": name},
            )
            .mappings()
            .first()
        )
        self.db.commit()
        if row is None:
            raise RuntimeError("Failed to create impulse zone")
        return ImpulseZonePublic(**row)

    def get_impulse_zone_by_id(self, zone_id: int) -> ImpulseZonePublic | None:
        """Get an impulse zone by ID."""
        row = (
            self.db.execute(
                self.SQL_SELECT_IMPULSE_ZONE_BY_ID,
                {"zone_id": zone_id},
            )
            .mappings()
            .first()
        )
        return ImpulseZonePublic(**row) if row else None

    def get_all_impulse_zones(self) -> list[ImpulseZonePublic]:
        """Get all impulse zones."""
        rows = self.db.execute(self.SQL_SELECT_ALL_IMPULSE_ZONES).mappings().all()
        return [ImpulseZonePublic(**row) for row in rows]

    def update_impulse_zone(self, zone_id: int, name: str) -> ImpulseZonePublic | None:
        """Update an impulse zone's name."""
        row = (
            self.db.execute(
                self.SQL_UPDATE_IMPULSE_ZONE,
                {
                    "zone_id": zone_id,
                    "name": name,
                },
            )
            .mappings()
            .first()
        )
        self.db.commit()
        return ImpulseZonePublic(**row) if row else None

    def delete_impulse_zone(self, zone_id: int) -> bool:
        """Delete an impulse zone by ID."""
        result = self.db.execute(self.SQL_DELETE_IMPULSE_ZONE, {"zone_id": zone_id})
        self.db.commit()
        return (result.rowcount or 0) > 0

    def create_possible_impulse_zone(
        self,
        name: str,
        user_id: int | None = None,
    ) -> PossibleImpulseZonePublic:
        """Create a new possible impulse zone."""
        row = (
            self.db.execute(
                self.SQL_CREATE_POSSIBLE_IMPULSE_ZONE,
                {"name": name, "user_id": user_id},
            )
            .mappings()
            .first()
        )
        self.db.commit()
        if row is None:
            raise RuntimeError("Failed to create possible impulse zone")
        return PossibleImpulseZonePublic(**row)

    def get_possible_impulse_zone_by_id(
        self, zone_id: int
    ) -> PossibleImpulseZonePublic | None:
        """Get a possible impulse zone by ID."""
        row = (
            self.db.execute(
                self.SQL_SELECT_POSSIBLE_IMPULSE_ZONE_BY_ID,
                {"zone_id": zone_id},
            )
            .mappings()
            .first()
        )
        return PossibleImpulseZonePublic(**row) if row else None

    def get_all_possible_impulse_zones(self) -> list[PossibleImpulseZonePublic]:
        """Get all possible impulse zones."""
        rows = (
            self.db.execute(self.SQL_SELECT_ALL_POSSIBLE_IMPULSE_ZONES).mappings().all()
        )
        return [PossibleImpulseZonePublic(**row) for row in rows]

    def get_possible_impulse_zones_for_user(
        self,
        user_id: int,
    ) -> list[PossibleImpulseZonePublic]:
        """Get global and user-owned possible impulse zones for a user."""
        rows = (
            self.db.execute(
                self.SQL_SELECT_POSSIBLE_IMPULSE_ZONES_FOR_USER,
                {"user_id": user_id},
            )
            .mappings()
            .all()
        )
        return [PossibleImpulseZonePublic(**row) for row in rows]

    def update_possible_impulse_zone(
        self, zone_id: int, name: str
    ) -> PossibleImpulseZonePublic | None:
        """Update a possible impulse zone's name."""
        row = (
            self.db.execute(
                self.SQL_UPDATE_POSSIBLE_IMPULSE_ZONE,
                {
                    "zone_id": zone_id,
                    "name": name,
                },
            )
            .mappings()
            .first()
        )
        self.db.commit()
        return PossibleImpulseZonePublic(**row) if row else None

    def delete_possible_impulse_zone(self, zone_id: int) -> bool:
        """Delete a possible impulse zone by ID."""
        result = self.db.execute(
            self.SQL_DELETE_POSSIBLE_IMPULSE_ZONE,
            {"zone_id": zone_id},
        )
        self.db.commit()
        return (result.rowcount or 0) > 0

    def get_user_impulses(self, user_id: int) -> list[ImpulseZonePublic]:
        """List real impulses currently selected for a user."""
        rows = (
            self.db.execute(self.SQL_SELECT_USER_IMPULSES, {"user_id": user_id})
            .mappings()
            .all()
        )
        return [ImpulseZonePublic(**row) for row in rows]

    def replace_user_impulses(self, *, user_id: int, impulse_ids: list[int]) -> None:
        """Replace all user impulse mappings with the provided IDs."""
        self.db.execute(self.SQL_DELETE_USER_IMPULSES, {"user_id": user_id})
        for impulse_id in impulse_ids:
            self.db.execute(
                self.SQL_INSERT_USER_IMPULSE,
                {
                    "user_id": user_id,
                    "impulse_id": impulse_id,
                },
            )
        self.db.commit()

    def promote_possible_to_impulse_zone(
        self, possible_zone_id: int, new_zone_name: str | None = None
    ) -> ImpulseZonePublic:
        """
        Promote a PossibleImpulseZone to a real ImpulseZone.

        Process:
        1. Get the possible zone details
        2. Create a new impulse zone with the same (or provided) name
        3. Update all transactions, moving the ID from possible_impulse_zone_id to impulse_zone_id
        4. Delete the record from PossibleImpulseZones
        """
        # Get the possible impulse zone
        possible_zone = self.get_possible_impulse_zone_by_id(possible_zone_id)
        if possible_zone is None:
            raise ValueError(
                f"Possible impulse zone with ID {possible_zone_id} not found"
            )

        # Create the new impulse zone with the same name (or override)
        zone_name = new_zone_name or possible_zone.name
        new_impulse_zone = self.create_impulse_zone(zone_name)

        # Update all transactions that reference this possible zone
        self.db.execute(
            self.SQL_PROMOTE_POSSIBLE_TO_IMPULSE_ZONE,
            {
                "new_impulse_zone_id": new_impulse_zone.id,
                "possible_zone_id": possible_zone_id,
            },
        )

        # Delete the possible impulse zone
        self.db.execute(
            self.SQL_DELETE_POSSIBLE_IMPULSE_ZONE,
            {"zone_id": possible_zone_id},
        )

        self.db.commit()

        return new_impulse_zone
