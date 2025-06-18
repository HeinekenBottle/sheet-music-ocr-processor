#!/usr/bin/env python3
"""
Organize PDFs using extracted visual metadata
"""

import json
import shutil
import re
from pathlib import Path

def clean_filename_for_folder(name):
    """Clean a name to be safe for folder names"""
    # Remove special characters, keep only alphanumeric, spaces, and basic punctuation
    clean = re.sub(r'[^\w\s\-\.]', '', str(name))
    # Replace spaces with underscores and remove multiple spaces
    clean = re.sub(r'\s+', '_', clean.strip())
    return clean

def organize_pdfs_with_metadata():
    """Organize original PDFs using extracted metadata"""
    
    # Load metadata
    metadata_file = Path('/Users/jack/sheet-music-project/tools/sheet_music_metadata.json')
    with open(metadata_file, 'r') as f:
        metadata = json.load(f)
    
    # Source and destination paths
    usb_path = Path('/Volumes/STORE N GO')
    output_path = Path('/Users/jack/sheet-music-project/organized_final')
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Key known metadata (manually corrected based on visual analysis)
    corrected_metadata = {
        'SKM_C257i25061716380.pdf': {
            'piece_name': 'Feodora_Ouverture',
            'instrument': 'Clarinet',
            'part': '2nd_and_3rd',
            'key_signature': 'Bb',
            'composer': 'P_Tschaikowsky'
        }
    }
    
    # Track results
    organized_count = 0
    failed_count = 0
    
    print("🎵 Organizing PDFs with extracted metadata...")
    
    # Find all PDF files recursively
    pdf_files = list(usb_path.rglob('*.pdf'))
    print(f"Found {len(pdf_files)} PDF files")
    
    for pdf_file in pdf_files:
        try:
            # Skip system files
            if pdf_file.name.startswith('._'):
                continue
                
            # Get corresponding JPEG metadata
            jpeg_name = pdf_file.stem + '.jpg'
            file_metadata = None
            
            # Check if we have corrected metadata for this file
            if pdf_file.name in corrected_metadata:
                file_metadata = corrected_metadata[pdf_file.name]
                print(f"✅ Using corrected metadata for {pdf_file.name}")
            elif jpeg_name in metadata:
                file_metadata = metadata[jpeg_name]
                # Skip files with no useful metadata
                if file_metadata.get('piece_name') == 'Unknown':
                    print(f"⚠️  Skipping {pdf_file.name} - no metadata available")
                    continue
            else:
                print(f"⚠️  No metadata found for {pdf_file.name}")
                continue
            
            # Extract metadata
            piece_name = file_metadata.get('piece_name', 'Unknown_Piece')
            instrument = file_metadata.get('instrument', 'Unknown_Instrument')
            part = file_metadata.get('part', 'Unknown_Part')
            key_signature = file_metadata.get('key_signature', '')
            composer = file_metadata.get('composer', 'Unknown_Composer')
            
            # Clean names for folder structure
            clean_piece = clean_filename_for_folder(piece_name)
            clean_instrument = clean_filename_for_folder(instrument)
            clean_part = clean_filename_for_folder(part)
            
            # Create folder structure: Piece/Instrument/Part/
            dest_dir = output_path / clean_piece / clean_instrument / clean_part
            dest_dir.mkdir(parents=True, exist_ok=True)
            
            # Copy file
            dest_file = dest_dir / pdf_file.name
            shutil.copy2(pdf_file, dest_file)
            
            relative_path = dest_file.relative_to(output_path)
            print(f"📁 {pdf_file.name} → {relative_path}")
            organized_count += 1
            
        except Exception as e:
            print(f"❌ Failed to organize {pdf_file.name}: {e}")
            failed_count += 1
    
    print(f"\n🎵 Organization Complete:")
    print(f"  ✅ Organized: {organized_count}")
    print(f"  ❌ Failed: {failed_count}")
    print(f"  📂 Output: {output_path}")

if __name__ == "__main__":
    organize_pdfs_with_metadata()