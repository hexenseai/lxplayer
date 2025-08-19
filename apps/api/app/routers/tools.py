from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/tools", tags=["tools"]) 


class PlayerControl(BaseModel):
  action: str
  value: float | None = None


@router.post("/player")
def player_control(body: PlayerControl):
  # placeholder: log or dispatch to a worker/bus
  return {"ok": True, "received": body.model_dump()}


class NavigateBody(BaseModel):
  step_id: str


@router.post("/navigate")
def navigate_to_step(body: NavigateBody):
  return {"ok": True, "step": body.step_id}


class OverlaySetBody(BaseModel):
  overlay_id: str | None = None
  payload: dict | None = None


@router.post("/overlay/set")
def overlay_set(body: OverlaySetBody):
  return {"ok": True, "overlay": body.overlay_id, "payload": body.payload}


class FrameCropBody(BaseModel):
  x: float
  y: float
  width: float
  height: float


@router.post("/frame/set-crop")
def frame_set_crop(body: FrameCropBody):
  return {"ok": True, "crop": body.model_dump()}
