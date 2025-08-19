import os
import sys
from sqlmodel import Session

CURRENT_DIR = os.path.dirname(__file__)
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, os.pardir))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from app.db import engine
from app.models import Training, Asset, Overlay, Flow


def run():
    with Session(engine) as session:
        # demo flow
        flow = Flow(title="Demo Flow", graph_json='{"nodes": []}')
        session.add(flow)
        session.commit()
        session.refresh(flow)

        # trainings
        t1 = Training(title="Demo Eğitim 1", description="HLS örnek 1", flow_id=flow.id)
        t2 = Training(title="Demo Eğitim 2", description="HLS örnek 2", flow_id=flow.id)
        session.add(t1)
        session.add(t2)
        session.commit()
        session.refresh(t1)
        session.refresh(t2)

        # assets (HLS stub)
        a1 = Asset(title="Video 1", kind="video", uri=f"hls/{t1.id}.m3u8")
        a2 = Asset(title="Video 2", kind="video", uri=f"hls/{t2.id}.m3u8")
        a3 = Asset(title="Video 3", kind="video", uri="hls/extra1.m3u8")
        a4 = Asset(title="Video 4", kind="video", uri="hls/extra2.m3u8")
        session.add(a1)
        session.add(a2)
        session.add(a3)
        session.add(a4)

        # overlays
        ov1 = Overlay(training_id=t1.id, start_time=1.0, end_time=5.0, kind="text", payload_json='{"text":"Hoş geldiniz"}')
        ov2 = Overlay(training_id=t1.id, start_time=8.0, end_time=15.0, kind="cta", payload_json='{"label":"Devam"}')
        session.add(ov1)
        session.add(ov2)

        session.commit()
        print("Seed completed.")


if __name__ == "__main__":
    run()
