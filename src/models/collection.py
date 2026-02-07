"""User collection models for tracking owned models."""
from peewee import CharField, IntegerField, ForeignKeyField
from src.models.database import BaseModel


class Collection(BaseModel):
    """Represents a user's model collection."""

    name = CharField(default="My Collection")
    user_id = CharField(default="default")
    description = CharField(null=True)


class CollectionItem(BaseModel):
    """Represents models owned in a collection."""

    collection = ForeignKeyField(Collection, backref='items', on_delete='CASCADE')
    unit_name = CharField(index=True)  # "Dracosan Armoured Transport"
    quantity = IntegerField(default=1)  # Number owned
    notes = CharField(null=True)  # "Built and painted", "NiB", etc.

    class Meta:
        indexes = (
            (('collection', 'unit_name'), True),  # Unique per collection
        )
