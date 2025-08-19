from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from ..db import get_session
from ..models import Session as DbSession, InteractionLog


class CreateSessionRequest(BaseModel):
    training_id: str
    user_id: str | None = None


class LogEventRequest(BaseModel):
    event: str
    data_json: dict | None = None


router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("")
def create_session(payload: CreateSessionRequest, session: Session = Depends(get_session)):
    dbs = DbSession(training_id=payload.training_id, user_id=payload.user_id)
    session.add(dbs)
    session.commit()
    session.refresh(dbs)
    return dbs


@router.get("/{session_id}")
def get_session_by_id(session_id: str, session: Session = Depends(get_session)):
    dbs = session.get(DbSession, session_id)
    if not dbs:
        raise HTTPException(status_code=404, detail="Session not found")
    return dbs


@router.post("/{session_id}/logs")
def add_log(session_id: str, payload: LogEventRequest, session: Session = Depends(get_session)):
    dbs = session.get(DbSession, session_id)
    if not dbs:
        raise HTTPException(status_code=404, detail="Session not found")
    log = InteractionLog(session_id=dbs.id, event=payload.event, data_json=str(payload.data_json or {}))
    session.add(log)
    session.commit()
    return {"ok": True}
