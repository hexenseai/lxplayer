import os
import sys
from sqlmodel import Session, select
import uuid

CURRENT_DIR = os.path.dirname(__file__)
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, os.pardir))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from app.db import engine
from app.models import Training, Asset, TrainingSection, Overlay, Organization, CompanyTraining, User

def run():
    with Session(engine) as session:
        # Check if test data already exists
        existing_company_training = session.exec(
            select(CompanyTraining).where(CompanyTraining.access_code == "TEST123")
        ).first()
        
        if existing_company_training:
            print("Test data already exists!")
            print(f"Access Code: TEST123")
            training = session.get(Training, existing_company_training.training_id)
            org = session.get(Organization, existing_company_training.organization_id)
            print(f"Training: {training.title if training else 'Unknown'}")
            print(f"Organization: {org.name if org else 'Unknown'}")
            return

        # Test organization
        org = Organization(
            name="Test Şirketi",
            business_topic="Teknoloji"
        )
        session.add(org)
        session.commit()
        session.refresh(org)

        # Test user
        user = User(
            email="test@example.com",
            username="testuser",
            full_name="Test User",
            organization_id=org.id,
            role="User"
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        # Test training
        training = Training(
            title="Yapay Zeka ile Nasıl İşbirliği Yapılır",
            description="Bu eğitimde yapay zeka ile etkili işbirliği yapmanın yollarını öğreneceksiniz.",
            ai_flow='{"nodes": [], "edges": []}'
        )
        session.add(training)
        session.commit()
        session.refresh(training)

        # Test video asset
        video_asset = Asset(
            title="AI İşbirliği Video",
            kind="video",
            uri="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            description="Yapay zeka işbirliği örnek videosu"
        )
        session.add(video_asset)
        session.commit()
        session.refresh(video_asset)

        # Test sections
        section1 = TrainingSection(
            training_id=training.id,
            title="Giriş",
            description="Eğitime giriş ve temel kavramlar",
            script="Merhaba ben Aslı Güven. Yönetim ve İnsan kaynakları danışmanı olarak 20 seneyi aşkın süredir çalışıyorum.",
            duration=60,
            asset_id=video_asset.id,
            order_index=1
        )
        session.add(section1)
        session.commit()
        session.refresh(section1)

        section2 = TrainingSection(
            training_id=training.id,
            title="AI'nın Temelleri",
            description="Yapay zeka temel kavramları",
            script="Yapay zeka, makine öğrenmesi ve derin öğrenme kavramlarını anlayalım.",
            duration=90,
            asset_id=video_asset.id,
            order_index=2
        )
        session.add(section2)
        session.commit()
        session.refresh(section2)

        # Section 1 overlays
        section1_overlays = [
            Overlay(
                training_id=training.id,
                training_section_id=section1.id,
                time_stamp=5,
                type="label",
                caption="Bu önemli bir nokta!",
                position="top_middle",
                icon="Info",
                animation="fade_in",
                duration=3.0
            ),
            Overlay(
                training_id=training.id,
                training_section_id=section1.id,
                time_stamp=10,
                type="button_message",
                caption="Detayları göster",
                position="bottom_left",
                icon="Eye",
                animation="slide_in_left",
                duration=4.0
            ),
            Overlay(
                training_id=training.id,
                training_section_id=section1.id,
                time_stamp=15,
                type="frame_set",
                frame="face_left"
            ),
            Overlay(
                training_id=training.id,
                training_section_id=section1.id,
                time_stamp=20,
                type="label",
                caption="Dikkat!",
                position="top_right",
                icon="AlertCircle",
                animation="scale_in",
                duration=2.5
            ),
            Overlay(
                training_id=training.id,
                training_section_id=section1.id,
                time_stamp=25,
                type="button_link",
                caption="Dosyayı indir",
                position="bottom_right",
                icon="Download",
                animation="slide_in_right",
                duration=3.0
            ),
            Overlay(
                training_id=training.id,
                training_section_id=section1.id,
                time_stamp=30,
                type="frame_set",
                frame="face_right"
            ),
            Overlay(
                training_id=training.id,
                training_section_id=section1.id,
                time_stamp=35,
                type="label",
                caption="Başarılı!",
                position="center",
                icon="CheckCircle",
                animation="fade_in",
                duration=2.0
            ),
            Overlay(
                training_id=training.id,
                training_section_id=section1.id,
                time_stamp=40,
                type="button_message",
                caption="Devam et",
                position="bottom_middle",
                icon="Play",
                animation="scale_in",
                duration=3.0
            ),
            Overlay(
                training_id=training.id,
                training_section_id=section1.id,
                time_stamp=45,
                type="frame_set",
                frame="face_middle"
            ),
            Overlay(
                training_id=training.id,
                training_section_id=section1.id,
                time_stamp=50,
                type="label",
                caption="Önemli bilgi",
                position="left_content",
                icon="Book",
                animation="slide_in_left",
                duration=2.5
            ),
            Overlay(
                training_id=training.id,
                training_section_id=section1.id,
                time_stamp=55,
                type="frame_set",
                frame="face_close"
            ),
            Overlay(
                training_id=training.id,
                training_section_id=section1.id,
                time_stamp=60,
                type="button_message",
                caption="Tamamladım",
                position="bottom_middle",
                icon="CheckCircle",
                animation="fade_in",
                duration=2.0
            )
        ]

        # Section 2 overlays
        section2_overlays = [
            Overlay(
                training_id=training.id,
                training_section_id=section2.id,
                time_stamp=10,
                type="label",
                caption="Yeni bölüm başlıyor",
                position="top_middle",
                icon="Star",
                animation="fade_in",
                duration=3.0
            ),
            Overlay(
                training_id=training.id,
                training_section_id=section2.id,
                time_stamp=20,
                type="button_message",
                caption="Anladım",
                position="bottom_left",
                icon="ThumbsUp",
                animation="slide_in_left",
                duration=3.0
            ),
            Overlay(
                training_id=training.id,
                training_section_id=section2.id,
                time_stamp=25,
                type="frame_set",
                frame="face_left"
            ),
            Overlay(
                training_id=training.id,
                training_section_id=section2.id,
                time_stamp=35,
                type="label",
                caption="Harika!",
                position="right_content",
                icon="Heart",
                animation="scale_in",
                duration=2.0
            ),
            Overlay(
                training_id=training.id,
                training_section_id=section2.id,
                time_stamp=40,
                type="frame_set",
                frame="face_middle"
            ),
            Overlay(
                training_id=training.id,
                training_section_id=section2.id,
                time_stamp=50,
                type="button_link",
                caption="Daha fazla bilgi",
                position="bottom_right",
                icon="ExternalLink",
                animation="slide_in_right",
                duration=3.0
            ),
            Overlay(
                training_id=training.id,
                training_section_id=section2.id,
                time_stamp=60,
                type="frame_set",
                frame="wide"
            ),
            Overlay(
                training_id=training.id,
                training_section_id=section2.id,
                time_stamp=65,
                type="label",
                caption="Bölüm tamamlandı",
                position="center",
                icon="Trophy",
                animation="fade_in",
                duration=2.5
            )
        ]

        # Add all overlays to session
        for overlay in section1_overlays + section2_overlays:
            session.add(overlay)

        # Company training with access code
        company_training = CompanyTraining(
            organization_id=org.id,
            training_id=training.id,
            expectations="Kullanıcıların AI ile etkili çalışma yöntemlerini öğrenmesi bekleniyor.",
            access_code="TEST123"
        )
        session.add(company_training)

        session.commit()
        print("Interactive Player test data created successfully!")
        print(f"Access Code: TEST123")
        print(f"Training: {training.title}")
        print(f"Organization: {org.name}")
        print(f"User: {user.email}")

if __name__ == "__main__":
    run()
