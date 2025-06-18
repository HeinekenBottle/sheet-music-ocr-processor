#!/usr/bin/env python3
"""
Final cleanup - move all files out of Unknown folders and organize properly
"""

import shutil
from pathlib import Path

def final_cleanup():
    """Move all files out of Unknown folders to their parent instrument folders"""
    usb_path = Path('/Volumes/STORE N GO')
    
    if not usb_path.exists():
        print("❌ USB drive not found")
        return
    
    print("🔧 Final cleanup - eliminating Unknown folders...")
    
    # Find all Unknown folders
    unknown_folders = list(usb_path.rglob('Unknown'))
    
    for unknown_folder in unknown_folders:
        if not unknown_folder.is_dir():
            continue
            
        print(f"\n📁 Processing: {unknown_folder}")
        
        # Get parent directory (should be instrument folder)
        instrument_folder = unknown_folder.parent
        
        # Move all files from Unknown to parent instrument folder
        files_moved = 0
        for file_path in unknown_folder.rglob('*.pdf'):
            try:
                # Create descriptive name based on path structure
                path_parts = file_path.parts
                
                # Extract piece name from path
                piece_name = "Unknown"
                for part in path_parts:
                    if part in ['French_Comedy_Overture', 'Feodora_Ouverture', 'Military_Band_Music_Selections']:
                        piece_name = part
                        break
                
                # Get instrument from parent folder name
                instrument_name = instrument_folder.name
                
                # Create better filename
                if piece_name != "Unknown" and not file_path.name.startswith(piece_name):
                    base_name = file_path.stem
                    if not any(piece_word in base_name for piece_word in piece_name.split('_')):
                        new_name = f"{piece_name}_{instrument_name}_{base_name}.pdf"
                    else:
                        new_name = file_path.name
                else:
                    new_name = file_path.name
                
                # Move to parent instrument folder
                destination = instrument_folder / new_name
                
                # Avoid naming conflicts
                counter = 1
                while destination.exists():
                    name_parts = destination.stem, counter, destination.suffix
                    destination = instrument_folder / f"{name_parts[0]}_{name_parts[1]}{name_parts[2]}"
                    counter += 1
                
                file_path.rename(destination)
                print(f"  ✅ Moved: {file_path.name} → {destination.name}")
                files_moved += 1
                
            except Exception as e:
                print(f"  ❌ Failed to move {file_path.name}: {e}")
        
        # Remove the empty Unknown folder
        try:
            if files_moved > 0:
                # Check if folder is now empty
                remaining_files = list(unknown_folder.rglob('*'))
                if not remaining_files:
                    unknown_folder.rmdir()
                    print(f"  ✅ Removed empty Unknown folder")
                else:
                    print(f"  ⚠️  Unknown folder still has {len(remaining_files)} items")
        except Exception as e:
            print(f"  ❌ Failed to remove Unknown folder: {e}")
    
    print("\n🎵 Final cleanup complete!")
    
    # Show updated structure
    print("\n📂 Final organized structure:")
    for piece_dir in sorted(usb_path.glob('*')):
        if (piece_dir.is_dir() and 
            not piece_dir.name.startswith('.') and 
            piece_dir.name not in ['System Volume Information', 'Archive_Pre_Organization', 
                                  'headers', 'SheetMusic', 'SheetMusic_backup_quick', 
                                  'SheetMusic_old_structure', 'STORE N GO', '9']):
            
            total_files = len(list(piece_dir.rglob('*.pdf')))
            print(f"📁 {piece_dir.name}/ ({total_files} files total)")
            
            for instrument_dir in sorted(piece_dir.glob('*')):
                if instrument_dir.is_dir():
                    pdf_files = list(instrument_dir.glob('*.pdf'))
                    part_folders = [d for d in instrument_dir.glob('*') if d.is_dir()]
                    
                    if pdf_files:
                        print(f"   ├── {instrument_dir.name}/ ({len(pdf_files)} files)")
                        for pdf in sorted(pdf_files)[:3]:  # Show first 3 files
                            print(f"   │   └── {pdf.name}")
                        if len(pdf_files) > 3:
                            print(f"   │   └── ... and {len(pdf_files) - 3} more")
                    
                    for part_dir in sorted(part_folders):
                        part_files = list(part_dir.rglob('*.pdf'))
                        if part_files:
                            print(f"   ├── {instrument_dir.name}/{part_dir.name}/ ({len(part_files)} files)")
                            for pdf in sorted(part_files):
                                print(f"   │   └── {pdf.name}")

if __name__ == "__main__":
    final_cleanup()