#!/usr/bin/env python3
"""
Reorganize the German Feodora Ouverture files that were misidentified
"""

import shutil
from pathlib import Path

def reorganize_german_files():
    """Move German Feodora files to proper organization"""
    
    usb_path = Path('/Volumes/STORE N GO')
    unidentified_dir = usb_path / 'Unidentified_Files'
    feodora_dir = usb_path / 'Feodora_Ouverture'
    
    # German file mappings based on visual analysis
    german_files = {
        'SKM_C257i25061716381.pdf': {
            'instrument': 'Clarinet', 
            'part': '1st',
            'key': 'Bb',
            'new_name': 'Feodora_Ouverture_Clarinet_1st_Bb.pdf'
        },
        'SKM_C257i25061716390.pdf': {
            'instrument': 'Oboe',
            'part': 'Unknown',
            'key': 'C',
            'new_name': 'Feodora_Ouverture_Oboe.pdf'
        },
        'SKM_C257i25061716400.pdf': {
            'instrument': 'Trumpet',
            'part': '1st_2nd_3rd',
            'key': 'Bb',
            'new_name': 'Feodora_Ouverture_Trumpet_1st_2nd_3rd_Bb.pdf'
        },
        'SKM_C257i25061716410.pdf': {
            'instrument': 'Trombone',
            'part': '1st_2nd',
            'key': 'C',
            'new_name': 'Feodora_Ouverture_Trombone_1st_2nd.pdf'
        },
        'SKM_C257i25061716430.pdf': {
            'instrument': 'Clarinet',
            'part': 'Eb',
            'key': 'Eb',
            'new_name': 'Feodora_Ouverture_Clarinet_Eb.pdf'
        },
        'SKM_C257i25061716450.pdf': {
            'instrument': 'Alto_Saxophone',
            'part': 'Unknown',
            'key': 'Eb',
            'new_name': 'Feodora_Ouverture_Alto_Saxophone_Eb.pdf'
        },
        'SKM_C257i25061716460.pdf': {
            'instrument': 'Tenor_Horn',
            'part': '2nd_3rd',
            'key': 'Bb',
            'new_name': 'Feodora_Ouverture_Tenor_Horn_2nd_3rd_Bb.pdf'
        },
        'SKM_C257i25061716470.pdf': {
            'instrument': 'Horn',
            'part': '1st_2nd',
            'key': 'Eb',
            'new_name': 'Feodora_Ouverture_Horn_1st_2nd_Eb.pdf'
        },
        'SKM_C257i25061716480.pdf': {
            'instrument': 'Flugelhorn',
            'part': '1st',
            'key': 'Bb',
            'new_name': 'Feodora_Ouverture_Flugelhorn_1st_Bb.pdf'
        },
        'SKM_C257i25061716550.pdf': {
            'instrument': 'Score',
            'part': 'Conductor',
            'key': 'C',
            'new_name': 'Feodora_Ouverture_Conductor_Score.pdf'
        },
        'SKM_C257i25061716580.pdf': {
            'instrument': 'Baritone',
            'part': 'Unknown',
            'key': 'Bb',
            'new_name': 'Feodora_Ouverture_Baritone_Bb.pdf'
        }
    }
    
    print("🎵 Reorganizing German Feodora Ouverture files...")
    
    reorganized_count = 0
    
    for filename, metadata in german_files.items():
        source_file = unidentified_dir / filename
        
        if source_file.exists():
            # Create destination directory
            instrument = metadata['instrument']
            part = metadata['part']
            
            if part in ['Unknown', 'Conductor']:
                dest_dir = feodora_dir / instrument
            else:
                dest_dir = feodora_dir / instrument / part
            
            dest_dir.mkdir(parents=True, exist_ok=True)
            
            # Move and rename file
            dest_file = dest_dir / metadata['new_name']
            source_file.rename(dest_file)
            
            print(f"✅ Moved: {filename} → {dest_file.relative_to(usb_path)}")
            reorganized_count += 1
        else:
            print(f"⚠️  File not found: {filename}")
    
    print(f"\n🎵 Reorganization complete: {reorganized_count} German files moved")
    
    # Check remaining unidentified files
    remaining_files = list(unidentified_dir.glob('*.pdf'))
    print(f"📁 Remaining unidentified files: {len(remaining_files)}")
    
    if remaining_files:
        print("Remaining files:")
        for f in remaining_files[:5]:
            print(f"  - {f.name}")
        if len(remaining_files) > 5:
            print(f"  ... and {len(remaining_files) - 5} more")

if __name__ == "__main__":
    reorganize_german_files()