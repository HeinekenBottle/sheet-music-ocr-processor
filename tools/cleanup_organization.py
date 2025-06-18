#!/usr/bin/env python3
"""
Cleanup and improve USB drive organization
- Fix "Unknown" folders when instrument/part is clear
- Rename files with descriptive names
- Consolidate duplicate folders
- Re-analyze poorly organized files
"""

import json
import shutil
import re
import os
from pathlib import Path

def clean_filename_for_folder(name):
    """Clean a name to be safe for folder names"""
    clean = re.sub(r'[^\w\s\-\.]', '', str(name))
    clean = re.sub(r'\s+', '_', clean.strip())
    return clean

def create_descriptive_filename(piece, instrument, part, original_name):
    """Create a descriptive filename from metadata"""
    # Clean components
    clean_piece = clean_filename_for_folder(piece) if piece != "Unknown" else ""
    clean_instrument = clean_filename_for_folder(instrument) if instrument != "Unknown" else ""
    clean_part = clean_filename_for_folder(part) if part != "Unknown" else ""
    
    # Build descriptive name
    name_parts = []
    if clean_piece:
        name_parts.append(clean_piece)
    if clean_instrument:
        name_parts.append(clean_instrument)
    if clean_part:
        name_parts.append(clean_part)
    
    if name_parts:
        base_name = "_".join(name_parts)
        return f"{base_name}.pdf"
    else:
        # Fall back to original name
        return original_name

def analyze_filename_for_metadata(filename):
    """Extract metadata from filename patterns"""
    metadata = {
        'piece_name': 'Unknown',
        'instrument': 'Unknown', 
        'part': 'Unknown',
        'key_signature': 'Unknown',
        'composer': 'Unknown'
    }
    
    filename_lower = filename.lower()
    
    # French Comedy Overture detection
    if 'french_comedy' in filename_lower or 'french comedy' in filename_lower:
        metadata['piece_name'] = 'French_Comedy_Overture'
        metadata['composer'] = 'Keler_Bela'
    
    # Feodora detection  
    if 'feodora' in filename_lower or 'SKM_C257i25061716380' in filename:
        metadata['piece_name'] = 'Feodora_Ouverture'
        metadata['composer'] = 'P_Tschaikowsky'
    
    # Instrument detection
    instruments = {
        'trombone': 'Trombone',
        'cornet': 'Cornet', 
        'clarinet': 'Clarinet',
        'flute': 'Flute',
        'bassoon': 'Bassoon',
        'euphonium': 'Euphonium',
        'baritone': 'Baritone',
        'timpani': 'Timpani',
        'saxophone': 'Saxophone',
        'oboe': 'Oboe'
    }
    
    for pattern, instrument in instruments.items():
        if pattern in filename_lower:
            metadata['instrument'] = instrument
            break
    
    # Part detection
    parts = {
        '1st': '1st',
        'first': '1st', 
        '2nd': '2nd',
        'second': '2nd',
        '3rd': '3rd', 
        'third': '3rd',
        'solo': 'Solo'
    }
    
    for pattern, part in parts.items():
        if pattern in filename_lower:
            metadata['part'] = part
            break
    
    # Key signature detection
    if 'bb' in filename_lower or '_bb_' in filename_lower:
        metadata['key_signature'] = 'Bb'
    elif 'eb' in filename_lower:
        metadata['key_signature'] = 'Eb'
    elif '_c_' in filename_lower or filename_lower.endswith('_c'):
        metadata['key_signature'] = 'C'
    elif '_f_' in filename_lower or filename_lower.endswith('_f'):
        metadata['key_signature'] = 'F'
    
    return metadata

def cleanup_usb_organization():
    """Main cleanup function"""
    usb_path = Path('/Volumes/STORE N GO')
    
    if not usb_path.exists():
        print("❌ USB drive not found")
        return
    
    print("🔧 Starting USB drive cleanup...")
    
    # Key fixes needed based on the screenshot
    fixes = [
        {
            'description': 'Rename SKM_C257i25061716380.pdf to descriptive name',
            'source': usb_path / 'Feodora_Ouverture/Clarinet/2nd_and_3rd/SKM_C257i25061716380.pdf',
            'new_name': 'Feodora_Ouverture_Clarinet_2nd_3rd.pdf'
        },
        {
            'description': 'Move Trombone.pdf out of Unknown folder',
            'source': usb_path / 'French_Comedy_Overture/Trombone/Unknown/Trombone.pdf',
            'destination': usb_path / 'French_Comedy_Overture/Trombone/French_Comedy_Overture_Trombone.pdf'
        },
        {
            'description': 'Move French_Comedy_Overture_Trombone.pdf out of Unknown',
            'source': usb_path / 'French_Comedy_Overture/Trombone/Unknown/French_Comedy_Overture_Trombone.pdf', 
            'destination': usb_path / 'French_Comedy_Overture/Trombone/French_Comedy_Overture_Trombone.pdf'
        },
        {
            'description': 'Move Euphonium.pdf out of Unknown (rename to descriptive)',
            'source': usb_path / 'French_Comedy_Overture/Baritone/Unknown/Euphonium.pdf',
            'destination': usb_path / 'French_Comedy_Overture/Euphonium/French_Comedy_Overture_Euphonium.pdf'
        }
    ]
    
    # Apply specific fixes
    for fix in fixes:
        try:
            source = fix['source']
            if source.exists():
                if 'new_name' in fix:
                    # Rename in place
                    new_path = source.parent / fix['new_name']
                    source.rename(new_path)
                    print(f"✅ Renamed: {source.name} → {fix['new_name']}")
                elif 'destination' in fix:
                    # Move and ensure destination directory exists
                    dest = fix['destination']
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    source.rename(dest)
                    print(f"✅ Moved: {source} → {dest}")
            else:
                print(f"⚠️  File not found: {source}")
        except Exception as e:
            print(f"❌ Failed to apply fix '{fix['description']}': {e}")
    
    # Remove empty "Unknown" folders
    print("\n🗂️  Removing empty Unknown folders...")
    for unknown_dir in usb_path.rglob('Unknown'):
        if unknown_dir.is_dir():
            try:
                # Check if folder is empty
                if not any(unknown_dir.iterdir()):
                    unknown_dir.rmdir()
                    print(f"✅ Removed empty folder: {unknown_dir}")
                else:
                    print(f"⚠️  Folder not empty: {unknown_dir}")
            except Exception as e:
                print(f"❌ Failed to remove {unknown_dir}: {e}")
    
    # Clean up duplicate Euphonium folders
    print("\n🔧 Consolidating duplicate instrument folders...")
    
    # Move files from Baritone to Euphonium folder
    baritone_dir = usb_path / 'French_Comedy_Overture/Baritone'
    euphonium_dir = usb_path / 'French_Comedy_Overture/Euphonium'
    
    if baritone_dir.exists():
        euphonium_dir.mkdir(parents=True, exist_ok=True)
        
        # Move all files from Baritone to Euphonium
        for item in baritone_dir.rglob('*'):
            if item.is_file():
                relative_path = item.relative_to(baritone_dir)
                dest = euphonium_dir / relative_path
                dest.parent.mkdir(parents=True, exist_ok=True)
                item.rename(dest)
                print(f"✅ Moved: {item.name} from Baritone to Euphonium")
        
        # Remove empty Baritone folder structure
        try:
            shutil.rmtree(baritone_dir)
            print("✅ Removed duplicate Baritone folder")
        except Exception as e:
            print(f"⚠️  Could not remove Baritone folder: {e}")
    
    # Final cleanup - improve file naming for remaining files
    print("\n📝 Improving file names...")
    
    for pdf_file in usb_path.rglob('*.pdf'):
        if pdf_file.name.startswith('._'):
            continue
        
        # Skip files we already renamed
        if any(desc_word in pdf_file.name.lower() for desc_word in ['feodora', 'french_comedy']):
            continue
        
        # Analyze filename for better metadata
        metadata = analyze_filename_for_metadata(pdf_file.name)
        
        # Get current folder structure for context
        path_parts = pdf_file.parts
        
        # Extract piece and instrument from path
        for part in reversed(path_parts):
            if part in ['French_Comedy_Overture', 'Feodora_Ouverture']:
                metadata['piece_name'] = part
                break
        
        # Find instrument folder in path
        instruments = ['Trombone', 'Cornet', 'Clarinet', 'Flute', 'Bassoon', 'Euphonium', 'Timpani', 'Saxophone', 'Oboe']
        for part in path_parts:
            if part in instruments:
                metadata['instrument'] = part
                break
        
        # Create better filename if we have good metadata
        if metadata['piece_name'] != 'Unknown' and metadata['instrument'] != 'Unknown':
            new_name = create_descriptive_filename(
                metadata['piece_name'],
                metadata['instrument'], 
                metadata['part'],
                pdf_file.name
            )
            
            if new_name != pdf_file.name:
                new_path = pdf_file.parent / new_name
                if not new_path.exists():  # Avoid conflicts
                    pdf_file.rename(new_path)
                    print(f"✅ Renamed: {pdf_file.name} → {new_name}")
    
    print("\n🎵 USB drive cleanup complete!")
    
    # Show final structure
    print("\n📂 Final structure:")
    for piece_dir in sorted(usb_path.glob('*')):
        if piece_dir.is_dir() and not piece_dir.name.startswith('.') and piece_dir.name not in ['System Volume Information', 'Archive_Pre_Organization', 'headers', 'SheetMusic', 'SheetMusic_backup_quick', 'SheetMusic_old_structure', 'STORE N GO', '9']:
            print(f"📁 {piece_dir.name}/")
            for instrument_dir in sorted(piece_dir.glob('*')):
                if instrument_dir.is_dir():
                    file_count = len(list(instrument_dir.rglob('*.pdf')))
                    print(f"   └── {instrument_dir.name}/ ({file_count} files)")

if __name__ == "__main__":
    cleanup_usb_organization()