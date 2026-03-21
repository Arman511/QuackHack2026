from fastapi import APIRouter, status
from pydantic import BaseModel

router = APIRouter()


# This is the shape of data the fake bank sends us
class BankWebhookPayload(BaseModel):
    id: str
    type: str  # "in-person" or "online"
    amount: float
    merchant: str
    category: str
    location: dict  # { "lat": ..., "lng": ... } maybe not needed
    timestamp: str
    balanceAfter: float
    user_id: int  # which user made this transaction


@router.post("/webhook/transaction", status_code=status.HTTP_200_OK)
async def receive_transaction(payload: BankWebhookPayload):
    """
    Receives transaction data from the fake bank app.
    Just logs it for now — DB save comes later once auth is wired up.
    """
    print(f"\n=== TRANSACTION RECEIVED ===")
    print(f"  Type: {payload.type}")
    print(f"  Amount: £{payload.amount}")
    print(f"  Merchant: {payload.merchant}")
    print(f"  Category: {payload.category}")
    print(f"  Location: {payload.location}")
    print(f"  Timestamp: {payload.timestamp}")
    print(f"  Balance After: £{payload.balanceAfter}")
    print(f"  User ID: {payload.user_id}")
    print(f"=============================\n")

    # TODO: save to DB once user auth is shared between both apps
    # TODO: calculate tax and call POST /api/pot on the fake bank

    return {
        "status": "received",
        "message": f"Transaction of £{payload.amount} at {payload.merchant} received",
    }
