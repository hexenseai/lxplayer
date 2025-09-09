#!/usr/bin/env python3
"""
Güvenli migration stratejisi
Sunucuda migration'ları adım adım ve güvenli şekilde uygular
"""

import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
import subprocess
import time

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

def backup_database():
    """Database backup al"""
    print("💾 Database backup alınıyor...")
    try:
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        backup_file = f"lxplayer_backup_{timestamp}.sql"
        
        cmd = [
            "pg_dump",
            "-h", os.getenv('DB_HOST', 'localhost'),
            "-p", os.getenv('DB_PORT', '5432'),
            "-U", os.getenv('DB_USER', 'lxplayer'),
            "-d", os.getenv('DB_NAME', 'lxplayer'),
            "-f", backup_file
        ]
        
        # Password'i environment variable olarak geç
        env = os.environ.copy()
        env['PGPASSWORD'] = os.getenv('DB_PASSWORD', 'lxplayer123')
        
        result = subprocess.run(cmd, env=env, capture_output=True, text=True)
        
        if result.returncode == 0:
            print(f"✅ Backup başarılı: {backup_file}")
            return backup_file
        else:
            print(f"❌ Backup hatası: {result.stderr}")
            return None
            
    except Exception as e:
        print(f"❌ Backup hatası: {e}")
        return None

def check_migration_safety():
    """Migration güvenliği kontrol et"""
    print("🔒 Migration güvenlik kontrolü...")
    
    conn = get_db_connection()
    if not conn:
        return False
    
    cursor = conn.cursor()
    
    try:
        # Kritik tabloları kontrol et
        critical_tables = ['user', 'asset', 'training']
        
        for table in critical_tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table};")
            count = cursor.fetchone()[0]
            print(f"  📊 {table}: {count} kayıt")
            
            if count == 0:
                print(f"  ⚠️  {table} tablosu boş - migration güvenli")
            elif count > 1000:
                print(f"  ⚠️  {table} tablosunda çok veri var - dikkatli ol!")
            else:
                print(f"  ✅ {table} tablosu migration için uygun")
        
        return True
        
    except Exception as e:
        print(f"❌ Güvenlik kontrolü hatası: {e}")
        return False
    finally:
        cursor.close()
        conn.close()

def run_migration_step(step_name, migration_command):
    """Migration adımını çalıştır"""
    print(f"🔄 {step_name} başlatılıyor...")
    
    try:
        # Docker container içinde migration çalıştır
        cmd = [
            "docker-compose", "-f", "docker-compose.prod.yml", "exec", "-T", "api",
            "python", "-m", "alembic", migration_command
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            print(f"✅ {step_name} başarılı")
            print(f"📝 Çıktı: {result.stdout}")
            return True
        else:
            print(f"❌ {step_name} hatası: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ {step_name} hatası: {e}")
        return False

def safe_migration_process():
    """Güvenli migration süreci"""
    print("🚀 Güvenli Migration Süreci Başlatılıyor")
    print("=" * 50)
    
    # 1. Backup al
    backup_file = backup_database()
    if not backup_file:
        print("❌ Backup alınamadı - migration iptal ediliyor")
        return False
    
    # 2. Güvenlik kontrolü
    if not check_migration_safety():
        print("❌ Güvenlik kontrolü başarısız - migration iptal ediliyor")
        return False
    
    # 3. Mevcut alembic durumunu kontrol et
    print("📋 Mevcut Alembic durumu kontrol ediliyor...")
    if not run_migration_step("Alembic durum kontrolü", "current"):
        print("❌ Alembic durum kontrolü başarısız")
        return False
    
    # 4. Migration'ları uygula
    print("🔄 Migration'lar uygulanıyor...")
    if not run_migration_step("Migration uygulama", "upgrade head"):
        print("❌ Migration uygulama başarısız")
        print(f"💾 Backup dosyası: {backup_file}")
        return False
    
    # 5. Son durum kontrolü
    print("✅ Son durum kontrolü...")
    if not run_migration_step("Son durum kontrolü", "current"):
        print("❌ Son durum kontrolü başarısız")
        return False
    
    print("🎉 Migration başarıyla tamamlandı!")
    print(f"💾 Backup dosyası: {backup_file}")
    return True

def rollback_migration(backup_file):
    """Migration'ı geri al"""
    print(f"🔄 Migration geri alınıyor: {backup_file}")
    
    try:
        cmd = [
            "psql",
            "-h", os.getenv('DB_HOST', 'localhost'),
            "-p", os.getenv('DB_PORT', '5432'),
            "-U", os.getenv('DB_USER', 'lxplayer'),
            "-d", os.getenv('DB_NAME', 'lxplayer'),
            "-f", backup_file
        ]
        
        env = os.environ.copy()
        env['PGPASSWORD'] = os.getenv('DB_PASSWORD', 'lxplayer123')
        
        result = subprocess.run(cmd, env=env, capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ Rollback başarılı")
            return True
        else:
            print(f"❌ Rollback hatası: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ Rollback hatası: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "rollback":
        if len(sys.argv) > 2:
            rollback_migration(sys.argv[2])
        else:
            print("❌ Rollback için backup dosyası belirtin: python safe_migration_strategy.py rollback backup_file.sql")
    else:
        safe_migration_process()
