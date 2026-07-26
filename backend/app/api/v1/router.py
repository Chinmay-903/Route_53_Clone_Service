"""Aggregates the v1 routers under a single prefix."""

from fastapi import APIRouter

from app.api.v1 import auth, hosted_zones, records, zone_files

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(hosted_zones.router)
api_router.include_router(records.router)
api_router.include_router(zone_files.router)
