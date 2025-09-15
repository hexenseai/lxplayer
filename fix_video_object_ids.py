#!/usr/bin/env python3
"""
Script to fix video_object IDs for training sections that have video assets but empty video_object.
This script will update video_object field with the asset.uri value for video assets.
"""

import asyncio
import asyncpg
import os
from typing import List, Dict, Any

async def fix_video_object_ids():
    """Fix video_object IDs for training sections with video assets."""
    
    # Database connection
    DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/lxplayer')
    
    try:
        conn = await asyncpg.connect(DATABASE_URL)
        print("✅ Database connected successfully")
        
        # Find sections with video assets but empty video_object
        query = """
        SELECT 
            ts.id as section_id,
            ts.title as section_title,
            ts.video_object,
            ts.asset_id,
            a.uri as asset_uri,
            a.kind as asset_kind,
            a.title as asset_title
        FROM trainingsection ts
        LEFT JOIN asset a ON ts.asset_id = a.id
        WHERE a.kind = 'video' 
        AND (ts.video_object IS NULL OR ts.video_object = '')
        ORDER BY ts.id;
        """
        
        sections = await conn.fetch(query)
        print(f"🔍 Found {len(sections)} sections with video assets but empty video_object")
        
        if not sections:
            print("✅ No sections need fixing")
            return
        
        # Update each section
        updated_count = 0
        for section in sections:
            section_id = section['section_id']
            section_title = section['section_title']
            asset_uri = section['asset_uri']
            asset_title = section['asset_title']
            
            print(f"🔄 Updating section: {section_title} (ID: {section_id})")
            print(f"   Asset: {asset_title} (URI: {asset_uri})")
            
            # Update video_object with asset.uri
            update_query = """
            UPDATE trainingsection 
            SET video_object = $1 
            WHERE id = $2
            """
            
            await conn.execute(update_query, asset_uri, section_id)
            updated_count += 1
            print(f"   ✅ Updated video_object to: {asset_uri}")
        
        print(f"\n🎉 Successfully updated {updated_count} sections")
        
        # Verify the fix
        verify_query = """
        SELECT 
            ts.id as section_id,
            ts.title as section_title,
            ts.video_object,
            a.uri as asset_uri
        FROM trainingsection ts
        LEFT JOIN asset a ON ts.asset_id = a.id
        WHERE a.kind = 'video' 
        AND ts.video_object IS NOT NULL 
        AND ts.video_object != ''
        ORDER BY ts.id;
        """
        
        fixed_sections = await conn.fetch(verify_query)
        print(f"✅ Verification: {len(fixed_sections)} sections now have video_object set")
        
        for section in fixed_sections:
            print(f"   - {section['section_title']}: {section['video_object']}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        if 'conn' in locals():
            await conn.close()
            print("🔌 Database connection closed")

if __name__ == "__main__":
    asyncio.run(fix_video_object_ids())
