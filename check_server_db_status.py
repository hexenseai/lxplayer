#!/usr/bin/env python3
"""
Sunucudaki database durumunu kontrol etmek için script
Migration'ları uygulamadan önce mevcut durumu analiz eder
"""

import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_connection():
    """Database bağlantısı kur"""
    try:
        conn = psycopg2.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            port=os.getenv('DB_PORT', '5432'),
            database=os.getenv('DB_NAME', 'lxplayer'),
            user=os.getenv('DB_USER', 'lxplayer'),
            password=os.getenv('DB_PASSWORD', 'lxplayer123')
        )
        return conn
    except Exception as e:
        print(f"❌ Database bağlantı hatası: {e}")
        return None

def check_table_exists(cursor, table_name):
    """Tablo var mı kontrol et"""
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = %s
        );
    """, (table_name,))
    return cursor.fetchone()[0]

def check_column_exists(cursor, table_name, column_name):
    """Sütun var mı kontrol et"""
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = %s 
            AND column_name = %s
        );
    """, (table_name, column_name))
    return cursor.fetchone()[0]

def check_alembic_version(cursor):
    """Alembic version kontrol et"""
    try:
        cursor.execute("SELECT version_num FROM alembic_version;")
        result = cursor.fetchone()
        return result[0] if result else "No version found"
    except:
        return "Alembic table not found"

def analyze_database():
    """Database durumunu analiz et"""
    print("🔍 Sunucu Database Durumu Analizi")
    print("=" * 50)
    
    conn = get_db_connection()
    if not conn:
        return
    
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Alembic version
        version = check_alembic_version(cursor)
        print(f"📋 Alembic Version: {version}")
        print()
        
        # Tabloları kontrol et
        tables_to_check = [
            'organization', 'company', 'user', 'asset', 'training', 
            'style', 'frameconfig', 'globalframeconfig', 'flow',
            'companytraining', 'alembic_version'
        ]
        
        print("📊 Tablo Durumu:")
        for table in tables_to_check:
            exists = check_table_exists(cursor, table)
            status = "✅" if exists else "❌"
            print(f"  {status} {table}")
        
        print()
        
        # Kritik sütunları kontrol et
        print("🔍 Kritik Sütun Kontrolü:")
        
        # organization_id vs company_id
        if check_table_exists(cursor, 'user'):
            has_org_id = check_column_exists(cursor, 'user', 'organization_id')
            has_company_id = check_column_exists(cursor, 'user', 'company_id')
            print(f"  👤 user.organization_id: {'✅' if has_org_id else '❌'}")
            print(f"  👤 user.company_id: {'✅' if has_company_id else '❌'}")
        
        if check_table_exists(cursor, 'asset'):
            has_org_id = check_column_exists(cursor, 'asset', 'organization_id')
            has_company_id = check_column_exists(cursor, 'asset', 'company_id')
            print(f"  📁 asset.organization_id: {'✅' if has_org_id else '❌'}")
            print(f"  📁 asset.company_id: {'✅' if has_company_id else '❌'}")
        
        if check_table_exists(cursor, 'companytraining'):
            has_company_id = check_column_exists(cursor, 'companytraining', 'company_id')
            print(f"  🏢 companytraining.company_id: {'✅' if has_company_id else '❌'}")
        
        print()
        
        # Mevcut veri sayıları
        print("📈 Mevcut Veri Sayıları:")
        data_tables = ['user', 'asset', 'training', 'style', 'frameconfig', 'company']
        
        for table in data_tables:
            if check_table_exists(cursor, table):
                try:
                    cursor.execute(f"SELECT COUNT(*) FROM {table};")
                    count = cursor.fetchone()[0]
                    print(f"  📊 {table}: {count} kayıt")
                except Exception as e:
                    print(f"  ❌ {table}: Hata - {e}")
        
        print()
        
        # Migration önerileri
        print("💡 Migration Önerileri:")
        
        if check_table_exists(cursor, 'organization') and not check_table_exists(cursor, 'company'):
            print("  ⚠️  organization -> company migration gerekli")
        
        if check_table_exists(cursor, 'user') and check_column_exists(cursor, 'user', 'organization_id') and not check_column_exists(cursor, 'user', 'company_id'):
            print("  ⚠️  user.organization_id -> user.company_id migration gerekli")
        
        if check_table_exists(cursor, 'asset') and check_column_exists(cursor, 'asset', 'organization_id') and not check_column_exists(cursor, 'asset', 'company_id'):
            print("  ⚠️  asset.organization_id -> asset.company_id migration gerekli")
        
        if check_table_exists(cursor, 'companytraining') and not check_column_exists(cursor, 'companytraining', 'company_id'):
            print("  ⚠️  companytraining.company_id sütunu eklenmeli")
        
        print()
        print("✅ Database analizi tamamlandı!")
        
    except Exception as e:
        print(f"❌ Analiz hatası: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    analyze_database()
