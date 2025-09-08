#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db import get_session
from app.models import Asset, User, Company
from sqlmodel import select

def fix_asset_company_ids():
    """Tüm asset'leri SuperAdmin'in firmasına ata"""
    session = next(get_session())
    
    try:
        # SuperAdmin kullanıcısını bul
        superadmin = session.exec(
            select(User).where(User.role == "SuperAdmin")
        ).first()
        
        if not superadmin:
            print("❌ SuperAdmin kullanıcısı bulunamadı!")
            return
        
        print(f"👤 SuperAdmin bulundu: {superadmin.email}")
        print(f"🏢 SuperAdmin Company ID: {superadmin.company_id}")
        
        # Company_id'si boş olan asset'leri bul
        assets_without_company = session.exec(
            select(Asset).where(Asset.company_id.is_(None))
        ).all()
        
        print(f"📁 Company ID'si boş olan asset sayısı: {len(assets_without_company)}")
        
        if not assets_without_company:
            print("✅ Tüm asset'lerin company_id'si zaten dolu!")
            return
        
        # Asset'leri SuperAdmin'in firmasına ata
        updated_count = 0
        for asset in assets_without_company:
            print(f"🔄 Güncelleniyor: {asset.title} (ID: {asset.id})")
            asset.company_id = superadmin.company_id
            session.add(asset)
            updated_count += 1
        
        # Değişiklikleri kaydet
        session.commit()
        print(f"✅ {updated_count} asset başarıyla güncellendi!")
        
        # Güncellenmiş asset'leri listele
        print("\n📋 Güncellenmiş asset'ler:")
        for asset in assets_without_company:
            print(f"  - {asset.title} (ID: {asset.id}) -> Company: {asset.company_id}")
            
    except Exception as e:
        print(f"❌ Hata: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    fix_asset_company_ids()
