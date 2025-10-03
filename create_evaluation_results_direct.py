#!/usr/bin/env python3
"""
Doğrudan veritabanına değerlendirme sonuçları ekle
"""

import os
import sys
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Database URL
DATABASE_URL = "postgresql://postgres:postgres@localhost:5433/lxplayer"

def create_evaluation_results(session_id: str):
    """Doğrudan veritabanına değerlendirme sonuçları ekle"""
    
    try:
        # Database connection
        engine = create_engine(DATABASE_URL)
        Session = sessionmaker(bind=engine)
        session = Session()
        
        print(f"🔍 Creating evaluation results for session: {session_id}")
        
        # Önce kriterleri oluştur
        criteria_data = [
            {
                "id": "criteria_1",
                "training_id": "460d92b0-d8df-490c-83dc-94913e89c6fd",
                "title": "Şirket ve Sistem Tanıtımı",
                "description": "Kullanıcının şirket ve sistem hakkında bilgi verme becerisi",
                "weight": 20,
                "is_active": True,
                "order_index": 1,
                "llm_evaluation_prompt": "Kullanıcının şirket ve sistem tanıtımını değerlendir",
                "criteria_type": "question",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "id": "criteria_2", 
                "training_id": "460d92b0-d8df-490c-83dc-94913e89c6fd",
                "title": "İhtiyaç Analizi",
                "description": "Müşteri ihtiyaçlarını analiz etme ve belirleme becerisi",
                "weight": 25,
                "is_active": True,
                "order_index": 2,
                "llm_evaluation_prompt": "Kullanıcının ihtiyaç analizi becerilerini değerlendir",
                "criteria_type": "question",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "id": "criteria_3",
                "training_id": "460d92b0-d8df-490c-83dc-94913e89c6fd", 
                "title": "İtiraz Karşılama",
                "description": "Müşteri itirazlarını etkili şekilde karşılama becerisi",
                "weight": 20,
                "is_active": True,
                "order_index": 3,
                "llm_evaluation_prompt": "Kullanıcının itiraz karşılama becerilerini değerlendir",
                "criteria_type": "question",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "id": "criteria_4",
                "training_id": "460d92b0-d8df-490c-83dc-94913e89c6fd",
                "title": "Soru Cevap", 
                "description": "Müşteri sorularına doğru ve zamanında cevap verme becerisi",
                "weight": 15,
                "is_active": True,
                "order_index": 4,
                "llm_evaluation_prompt": "Kullanıcının soru cevap becerilerini değerlendir",
                "criteria_type": "question",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "id": "criteria_5",
                "training_id": "460d92b0-d8df-490c-83dc-94913e89c6fd",
                "title": "Satış Kapatma",
                "description": "Satış sürecini başarıyla kapatma becerisi", 
                "weight": 10,
                "is_active": True,
                "order_index": 5,
                "llm_evaluation_prompt": "Kullanıcının satış kapatma becerilerini değerlendir",
                "criteria_type": "question",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "id": "criteria_6",
                "training_id": "460d92b0-d8df-490c-83dc-94913e89c6fd",
                "title": "İkna Kabiliyeti",
                "description": "Müşteriyi ikna etme ve etkileme becerisi",
                "weight": 15,
                "is_active": True,
                "order_index": 6,
                "llm_evaluation_prompt": "Kullanıcının ikna kabiliyetini değerlendir",
                "criteria_type": "question",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "id": "criteria_7",
                "training_id": "460d92b0-d8df-490c-83dc-94913e89c6fd",
                "title": "Buz Kırma",
                "description": "Müşteri ile iletişimi başlatma ve buz kırma becerisi",
                "weight": 10,
                "is_active": True,
                "order_index": 7,
                "llm_evaluation_prompt": "Kullanıcının buz kırma becerilerini değerlendir",
                "criteria_type": "question",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        ]
        
        # Kriterleri ekle
        for criteria in criteria_data:
            try:
                session.execute(text("""
                    INSERT INTO evaluationcriteria 
                    (id, training_id, title, description, weight, is_active, order_index, 
                     llm_evaluation_prompt, criteria_type, created_at, updated_at)
                    VALUES (:id, :training_id, :title, :description, :weight, :is_active, 
                            :order_index, :llm_evaluation_prompt, :criteria_type, :created_at, :updated_at)
                    ON CONFLICT (id) DO NOTHING
                """), criteria)
                print(f"✅ Added criteria: {criteria['title']}")
            except Exception as e:
                print(f"⚠️ Criteria already exists: {criteria['title']}")
        
        # Değerlendirme sonuçlarını ekle
        results_data = [
            {
                "id": "result_1",
                "criteria_id": "criteria_1",
                "session_id": session_id,
                "user_id": "55688495-daaa-4278-84d9-2df797af85a5",
                "training_id": "460d92b0-d8df-490c-83dc-94913e89c6fd",
                "evaluation_score": 85,
                "evaluation_result": "Başarılı",
                "explanation": "Kullanıcı şirket ve sistem hakkında net bilgi verdi",
                "llm_model": "elevenlabs",
                "evaluated_at": datetime.utcnow(),
                "metadata_json": '{"source": "test_script"}'
            },
            {
                "id": "result_2",
                "criteria_id": "criteria_2", 
                "session_id": session_id,
                "user_id": "55688495-daaa-4278-84d9-2df797af85a5",
                "training_id": "460d92b0-d8df-490c-83dc-94913e89c6fd",
                "evaluation_score": 78,
                "evaluation_result": "Başarılı",
                "explanation": "İhtiyaç analizi konusunda iyi performans gösterdi",
                "llm_model": "elevenlabs",
                "evaluated_at": datetime.utcnow(),
                "metadata_json": '{"source": "test_script"}'
            },
            {
                "id": "result_3",
                "criteria_id": "criteria_3",
                "session_id": session_id,
                "user_id": "55688495-daaa-4278-84d9-2df797af85a5", 
                "training_id": "460d92b0-d8df-490c-83dc-94913e89c6fd",
                "evaluation_score": 92,
                "evaluation_result": "Başarılı",
                "explanation": "İtirazları etkili şekilde karşıladı",
                "llm_model": "elevenlabs",
                "evaluated_at": datetime.utcnow(),
                "metadata_json": '{"source": "test_script"}'
            },
            {
                "id": "result_4",
                "criteria_id": "criteria_4",
                "session_id": session_id,
                "user_id": "55688495-daaa-4278-84d9-2df797af85a5",
                "training_id": "460d92b0-d8df-490c-83dc-94913e89c6fd",
                "evaluation_score": 65,
                "evaluation_result": "Kısmen Başarılı",
                "explanation": "Sorulara cevap verdi ama bazı detaylar eksikti",
                "llm_model": "elevenlabs",
                "evaluated_at": datetime.utcnow(),
                "metadata_json": '{"source": "test_script"}'
            },
            {
                "id": "result_5",
                "criteria_id": "criteria_5",
                "session_id": session_id,
                "user_id": "55688495-daaa-4278-84d9-2df797af85a5",
                "training_id": "460d92b0-d8df-490c-83dc-94913e89c6fd",
                "evaluation_score": 88,
                "evaluation_result": "Başarılı",
                "explanation": "Satış sürecini başarıyla yönlendirdi",
                "llm_model": "elevenlabs",
                "evaluated_at": datetime.utcnow(),
                "metadata_json": '{"source": "test_script"}'
            },
            {
                "id": "result_6",
                "criteria_id": "criteria_6",
                "session_id": session_id,
                "user_id": "55688495-daaa-4278-84d9-2df797af85a5",
                "training_id": "460d92b0-d8df-490c-83dc-94913e89c6fd",
                "evaluation_score": 72,
                "evaluation_result": "Başarılı",
                "explanation": "İkna kabiliyeti iyi seviyede",
                "llm_model": "elevenlabs",
                "evaluated_at": datetime.utcnow(),
                "metadata_json": '{"source": "test_script"}'
            },
            {
                "id": "result_7",
                "criteria_id": "criteria_7",
                "session_id": session_id,
                "user_id": "55688495-daaa-4278-84d9-2df797af85a5",
                "training_id": "460d92b0-d8df-490c-83dc-94913e89c6fd",
                "evaluation_score": 95,
                "evaluation_result": "Başarılı",
                "explanation": "Müşteri ile mükemmel bir başlangıç yaptı",
                "llm_model": "elevenlabs",
                "evaluated_at": datetime.utcnow(),
                "metadata_json": '{"source": "test_script"}'
            }
        ]
        
        # Sonuçları ekle
        for result in results_data:
            try:
                session.execute(text("""
                    INSERT INTO evaluationresult 
                    (id, criteria_id, session_id, user_id, training_id, evaluation_score,
                     evaluation_result, explanation, llm_model, evaluated_at, metadata_json)
                    VALUES (:id, :criteria_id, :session_id, :user_id, :training_id, :evaluation_score,
                            :evaluation_result, :explanation, :llm_model, :evaluated_at, :metadata_json)
                    ON CONFLICT (id) DO NOTHING
                """), result)
                print(f"✅ Added result: {result['evaluation_result']} - {result['evaluation_score']}")
            except Exception as e:
                print(f"⚠️ Result already exists: {result['id']}")
        
        # Değerlendirme raporu ekle
        report_data = {
            "id": "report_1",
            "session_id": session_id,
            "report_title": "ElevenLabs Değerlendirme Raporu",
            "overall_score": 80,
            "summary": "Genel olarak başarılı bir performans sergilediniz. İletişim becerileri ve problem çözme konularında güçlü performans gösterdiniz.",
            "detailed_analysis": "Kullanıcı şirket tanıtımı, ihtiyaç analizi ve satış kapatma konularında başarılı oldu. Soru cevap konusunda gelişim fırsatları var.",
            "recommendations": "Soru cevap becerilerinizi geliştirmek için daha fazla pratik yapın. Detaylı bilgi verme konusunda çalışın.",
            "strengths": "Şirket tanıtımı, ihtiyaç analizi, itiraz karşılama ve satış kapatma konularında güçlüsünüz.",
            "weaknesses": "Soru cevap konusunda daha detaylı bilgi verme becerisi geliştirilmeli.",
            "status": "completed",
            "generated_at": datetime.utcnow()
        }
        
        try:
            session.execute(text("""
                INSERT INTO evaluationreport 
                (id, session_id, report_title, overall_score, summary, detailed_analysis,
                 recommendations, strengths, weaknesses, status, generated_at)
                VALUES (:id, :session_id, :report_title, :overall_score, :summary, :detailed_analysis,
                        :recommendations, :strengths, :weaknesses, :status, :generated_at)
                ON CONFLICT (id) DO NOTHING
            """), report_data)
            print("✅ Added evaluation report")
        except Exception as e:
            print(f"⚠️ Report already exists: {report_data['id']}")
        
        session.commit()
        print(f"\n✅ Successfully created evaluation data for session: {session_id}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        session.rollback()
    finally:
        session.close()

def main():
    if len(sys.argv) != 2:
        print("Usage: python create_evaluation_results_direct.py <session_id>")
        print("Example: python create_evaluation_results_direct.py b4de3086-8873-4076-bf26-22359dc3d214")
        sys.exit(1)
    
    session_id = sys.argv[1]
    
    print("🔍 Direct Database Evaluation Results Creator")
    print("=" * 50)
    
    create_evaluation_results(session_id)
    
    print("3️⃣ Test tamamlandı!")
    print(f"Session ID: {session_id}")
    print("Artık eğitim sonu sayfasında değerlendirme sonuçlarını görebilirsiniz.")

if __name__ == "__main__":
    main()
