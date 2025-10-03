#!/usr/bin/env python3
"""
Check interaction sessions in database
"""

import psycopg2
import json
import os
from datetime import datetime

# Database connection
DATABASE_URL = "postgresql://lxplayer:lxplayer123@localhost:5433/lxplayer"

def check_interaction_sessions():
    """Check interaction sessions and their metadata"""
    
    print("🔍 Checking Interaction Sessions in Database")
    print("=" * 50)
    
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        # Get recent interaction sessions
        cursor.execute("""
            SELECT id, training_id, user_id, status, created_at, metadata_json 
            FROM interactionsession 
            ORDER BY created_at DESC 
            LIMIT 5
        """)
        
        sessions = cursor.fetchall()
        
        if not sessions:
            print("❌ No interaction sessions found")
            return
        
        print(f"✅ Found {len(sessions)} recent interaction sessions:")
        print()
        
        for session in sessions:
            session_id, training_id, user_id, status, created_at, metadata_json = session
            
            print(f"📋 Session ID: {session_id}")
            print(f"   Training ID: {training_id}")
            print(f"   User ID: {user_id}")
            print(f"   Status: {status}")
            print(f"   Created: {created_at}")
            
            if metadata_json:
                try:
                    metadata = json.loads(metadata_json)
                    print(f"   Metadata: {json.dumps(metadata, indent=2)}")
                    
                    # Check for ElevenLabs conversation_id
                    if "elevenlabs_conversation_id" in metadata:
                        print(f"   ✅ ElevenLabs conversation_id found: {metadata['elevenlabs_conversation_id']}")
                    else:
                        print(f"   ❌ No ElevenLabs conversation_id in metadata")
                        
                except json.JSONDecodeError:
                    print(f"   ⚠️ Invalid JSON in metadata: {metadata_json}")
            else:
                print(f"   ❌ No metadata")
            
            print("-" * 40)
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Database error: {e}")

if __name__ == "__main__":
    check_interaction_sessions()
