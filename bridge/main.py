"""FastAPI bridge: ESP32 RFID scans → Supabase active_scans (multi-sample table)."""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from supabase import Client, create_client

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("bridge")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError(
        "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. "
        "Copy bridge/.env.example to bridge/.env and fill in values."
    )

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

app = FastAPI(title="Materials Sample Library Bridge", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ScanPayload(BaseModel):
    rfid_id: str = Field(..., min_length=1, description="RFID tag UID as hex string")


class MaterialPayload(BaseModel):
    rfid_id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    supplier: str | None = None
    cost_per_unit: str | None = None
    fire_rating: str | None = None
    acoustic_rating: str | None = None
    sustainability_cert: str | None = None
    spec_section: str | None = None
    projects_used_in: list[str] = Field(default_factory=list)
    image_url: str | None = None
    datasheet_url: str | None = None


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/materials")
def create_material(payload: MaterialPayload) -> dict:
    """Insert or update a material asset in the library."""
    row = {
        "rfid_id": payload.rfid_id.strip().upper(),
        "name": payload.name.strip(),
        "supplier": payload.supplier,
        "cost_per_unit": payload.cost_per_unit,
        "fire_rating": payload.fire_rating,
        "acoustic_rating": payload.acoustic_rating,
        "sustainability_cert": payload.sustainability_cert,
        "spec_section": payload.spec_section,
        "projects_used_in": payload.projects_used_in,
        "image_url": payload.image_url,
        "datasheet_url": payload.datasheet_url,
    }
    logger.info("Upsert material: rfid_id=%s name=%s", row["rfid_id"], row["name"])
    try:
        result = (
            supabase.table("materials")
            .upsert(row, on_conflict="rfid_id")
            .execute()
        )
    except Exception as exc:
        logger.exception("Failed to upsert material rfid_id=%s", row["rfid_id"])
        raise HTTPException(status_code=502, detail="Failed to save material") from exc

    material = result.data[0] if result.data else row
    return {"ok": True, "material": material}


@app.post("/scan")
def scan(payload: ScanPayload) -> dict[str, bool]:
    """Add or refresh a sample on the table (does not remove others)."""
    rfid_id = payload.rfid_id.strip()
    if not rfid_id:
        raise HTTPException(status_code=400, detail="rfid_id must not be empty")

    scanned_at = datetime.now(timezone.utc).isoformat()
    logger.info("Scan received: rfid_id=%s scanned_at=%s", rfid_id, scanned_at)

    try:
        result = (
            supabase.table("active_scans")
            .upsert(
                {"rfid_id": rfid_id, "scanned_at": scanned_at},
                on_conflict="rfid_id",
            )
            .execute()
        )
    except Exception as exc:
        logger.exception("Supabase upsert failed for rfid_id=%s", rfid_id)
        raise HTTPException(status_code=502, detail="Failed to update active_scans") from exc

    logger.info("Upserted active_scans: %s", result.data)
    return {"ok": True}


@app.delete("/scan/{rfid_id}")
def remove_scan(rfid_id: str) -> dict[str, bool]:
    """Remove one sample from the table."""
    rid = rfid_id.strip()
    logger.info("Remove scan: rfid_id=%s", rid)
    try:
        supabase.table("active_scans").delete().eq("rfid_id", rid).execute()
    except Exception as exc:
        logger.exception("Supabase delete failed for rfid_id=%s", rid)
        raise HTTPException(status_code=502, detail="Failed to remove active scan") from exc
    return {"ok": True}


@app.delete("/scans")
def clear_scans() -> dict[str, bool]:
    """Clear the table (all active samples)."""
    logger.info("Clearing all active_scans")
    try:
        supabase.table("active_scans").delete().neq("rfid_id", "").execute()
    except Exception as exc:
        logger.exception("Supabase clear failed")
        raise HTTPException(status_code=502, detail="Failed to clear active_scans") from exc
    return {"ok": True}
