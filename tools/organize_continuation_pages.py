#!/usr/bin/env python3
"""
Organize the continuation pages that were identified
"""

import shutil
from pathlib import Path

def organize_continuation_pages():
    """Move continuation pages to their proper instrument folders"""
    
    usb_path = Path('/Volumes/STORE N GO')
    unidentified_dir = usb_path / 'Unidentified_Files'
    
    # Feodora Ouverture continuation pages
    feodora_pages = {
        'SKM_C257i25061716380.pdf': {
            'destination': 'Feodora_Ouverture/Clarinet/2nd_and_3rd',
            'new_name': 'Feodora_Ouverture_Clarinet_2nd_3rd_Page29.pdf'
        },
        'SKM_C257i25061716391.pdf': {
            'destination': 'Feodora_Ouverture/Clarinet/2nd_and_3rd', 
            'new_name': 'Feodora_Ouverture_Clarinet_2nd_3rd_Page22.pdf'
        },
        'SKM_C257i25061716431.pdf': {
            'destination': 'Feodora_Ouverture/Baritone',
            'new_name': 'Feodora_Ouverture_Baritone_Page71.pdf'
        },
        'SKM_C257i25061716451.pdf': {
            'destination': 'Feodora_Ouverture/Tenor_Horn/1st',
            'new_name': 'Feodora_Ouverture_Tenor_Horn_1st_Page35.pdf'
        },
        'SKM_C257i25061716461.pdf': {
            'destination': 'Feodora_Ouverture/Tenor_Horn/1st',
            'new_name': 'Feodora_Ouverture_Tenor_Horn_1st_Page37.pdf'
        },
        'SKM_C257i25061716490.pdf': {
            'destination': 'Feodora_Ouverture/Trumpet/1st',
            'new_name': 'Feodora_Ouverture_Trumpet_1st_Page38.pdf'
        },
        'SKM_C257i25061716510.pdf': {
            'destination': 'Feodora_Ouverture/Clarinet/2nd_and_3rd',
            'new_name': 'Feodora_Ouverture_Clarinet_2nd_3rd_Page23.pdf'
        },
        'SKM_C257i25061716520.pdf': {
            'destination': 'Feodora_Ouverture/Clarinet/1st',
            'new_name': 'Feodora_Ouverture_Clarinet_1st_Page72.pdf'
        },
        'SKM_C257i25061716560.pdf': {
            'destination': 'Feodora_Ouverture/Trumpet/1st',
            'new_name': 'Feodora_Ouverture_Trumpet_1st_Page44.pdf'
        },
        'SKM_C257i25061716570.pdf': {
            'destination': 'Feodora_Ouverture/Bass',
            'new_name': 'Feodora_Ouverture_Bass_Page73.pdf'
        }
    }
    
    # French Comedy Overture additional parts
    french_comedy_parts = {
        'SKM_C257i25061716130.pdf': {
            'destination': 'French_Comedy_Overture/Trombone/2nd',
            'new_name': 'French_Comedy_Overture_Trombone_2nd.pdf'
        },
        'SKM_C257i25061716170.pdf': {
            'destination': 'French_Comedy_Overture/Euphonium',
            'new_name': 'French_Comedy_Overture_Euphonium_Baritone.pdf'
        },
        'SKM_C257i25061716190.pdf': {
            'destination': 'French_Comedy_Overture/Bass',
            'new_name': 'French_Comedy_Overture_Basses.pdf'
        }
    }
    
    print("🎵 Organizing continuation pages and additional parts...")
    
    moved_count = 0
    
    # Process Feodora continuation pages
    for filename, info in feodora_pages.items():
        source_file = unidentified_dir / filename
        
        if source_file.exists():
            dest_dir = usb_path / info['destination']
            dest_dir.mkdir(parents=True, exist_ok=True)
            
            dest_file = dest_dir / info['new_name']
            source_file.rename(dest_file)
            
            print(f"✅ Feodora: {filename} → {info['destination']}/{info['new_name']}")
            moved_count += 1
        else:
            print(f"⚠️  File not found: {filename}")
    
    # Process French Comedy additional parts
    for filename, info in french_comedy_parts.items():
        source_file = unidentified_dir / filename
        
        if source_file.exists():
            dest_dir = usb_path / info['destination']
            dest_dir.mkdir(parents=True, exist_ok=True)
            
            dest_file = dest_dir / info['new_name']
            source_file.rename(dest_file)
            
            print(f"✅ French Comedy: {filename} → {info['destination']}/{info['new_name']}")
            moved_count += 1
        else:
            print(f"⚠️  File not found: {filename}")
    
    # Check remaining files
    remaining_files = list(unidentified_dir.glob('*.pdf'))
    print(f"\n🎵 Organization complete: {moved_count} files moved")
    print(f"📁 Remaining unidentified files: {len(remaining_files)}")
    
    if remaining_files:
        print("Remaining files:")
        for f in remaining_files:
            print(f"  - {f.name}")
    else:
        print("🎉 All files have been identified and organized!")

if __name__ == "__main__":
    organize_continuation_pages()