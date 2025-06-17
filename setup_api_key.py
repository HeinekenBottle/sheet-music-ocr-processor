#!/usr/bin/env python3
"""
Setup script for configuring OCR.space API key
"""
import os
import sys
from pathlib import Path

def setup_api_key():
    """Interactive setup for API key"""
    project_root = Path(__file__).parent
    env_file = project_root / '.env'
    
    print("🎵 Sheet Music Processor - API Key Setup")
    print("=" * 50)
    print()
    
    # Check current configuration
    current_key = None
    if env_file.exists():
        with open(env_file, 'r') as f:
            for line in f:
                if line.strip().startswith('OCR_API_KEY='):
                    current_key = line.strip().split('=', 1)[1]
                    break
    
    if current_key and current_key != 'your_api_key_here':
        print(f"Current API key: {current_key[:8]}...")
        update = input("Update API key? (y/N): ").lower().strip()
        if update != 'y':
            print("No changes made.")
            return
    
    print("Please enter your OCR.space API key:")
    print("(Get one free at: https://ocr.space/ocrapi)")
    print()
    
    api_key = input("API Key: ").strip()
    
    if not api_key:
        print("❌ No API key provided. Exiting.")
        return
    
    # Update .env file
    lines = []
    key_updated = False
    
    if env_file.exists():
        with open(env_file, 'r') as f:
            for line in f:
                if line.strip().startswith('OCR_API_KEY='):
                    lines.append(f'OCR_API_KEY={api_key}\n')
                    key_updated = True
                else:
                    lines.append(line)
    
    if not key_updated:
        lines.append(f'OCR_API_KEY={api_key}\n')
    
    with open(env_file, 'w') as f:
        f.writelines(lines)
    
    print()
    print("✅ API key configured successfully!")
    print()
    print("Test your setup with:")
    print("  python3 tools/sheet_music_processor.py staging/raw_scans /tmp/test --dry-run")
    print()
    print("Or test OCR on a single file:")
    print("  ~/process-music-v2 staging/raw_scans /tmp/test --dry-run")

if __name__ == "__main__":
    try:
        setup_api_key()
    except KeyboardInterrupt:
        print("\n\nSetup cancelled.")
        sys.exit(1)