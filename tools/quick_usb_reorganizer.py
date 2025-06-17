#!/usr/bin/env python3
"""
Quick USB Reorganizer - Optimized for immediate results
Focuses on Unknown folder first with smart batching
"""
import os
import sys
import re
import time
import shutil
import logging
from pathlib import Path
from typing import Dict, List, Optional
from collections import defaultdict

# Import the main processor for OCR functionality
try:
    from multi_piece_processor import MultiPieceSheetMusicProcessor
except ImportError:
    print("Error: multi_piece_processor.py not found in same directory")
    sys.exit(1)

class QuickUSBReorganizer:
    """Quick reorganizer focused on results"""
    
    def __init__(self, usb_path: Path, api_key: str = None):
        self.usb_path = usb_path
        self.sheet_music_dir = usb_path / "SheetMusic"
        
        # Initialize processor
        self.processor = MultiPieceSheetMusicProcessor(
            api_key=api_key,
            organization_mode="piece_first",
            max_batch_size=10  # Smaller batches for faster feedback
        )
        
        self.setup_logging()
    
    def setup_logging(self):
        """Setup logging"""
        logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
        self.logger = logging.getLogger(__name__)
    
    def analyze_unknown_folder(self, max_files: int = 10) -> Dict:
        """Focus on Unknown folder first - most bang for buck"""
        unknown_dir = self.sheet_music_dir / 'Unknown'
        
        if not unknown_dir.exists():
            return {'error': 'No Unknown folder found'}
        
        pdf_files = list(unknown_dir.glob("*.pdf"))[:max_files]
        
        print(f"🔍 Analyzing {len(pdf_files)} files from Unknown folder...")
        
        piece_groups = defaultdict(list)
        processed_count = 0
        
        for i, pdf_file in enumerate(pdf_files, 1):
            print(f"[{i}/{len(pdf_files)}] Processing {pdf_file.name}...")
            
            try:
                # Quick pattern matching first (no OCR delay)
                piece_name = self.quick_piece_detection(pdf_file)
                
                # Only do OCR for small files or if quick detection failed
                if piece_name == 'Unknown_Piece' and pdf_file.stat().st_size < 1024*1024:  # < 1MB
                    print(f"  Running OCR on {pdf_file.name}...")
                    ocr_success, ocr_text = self.processor.extract_text_from_pdf(pdf_file)
                    
                    if ocr_success:
                        piece_name = self.extract_piece_from_ocr(ocr_text)
                        print(f"  OCR detected: {piece_name}")
                    
                    time.sleep(0.5)  # Rate limiting
                
                piece_groups[piece_name].append(pdf_file)
                processed_count += 1
                
                print(f"  → {piece_name}")
                
            except Exception as e:
                print(f"  Error: {e}")
                piece_groups['Unknown_Piece'].append(pdf_file)
        
        return {
            'piece_groups': dict(piece_groups),
            'processed_count': processed_count,
            'total_files': len(pdf_files)
        }
    
    def quick_piece_detection(self, file_path: Path) -> str:
        """Quick piece detection without OCR"""
        filename = file_path.name.lower()
        path_str = str(file_path).lower()
        
        # Check for obvious patterns in filename
        if 'french' in filename and 'comedy' in filename:
            return 'French_Comedy_Overture'
        elif 'feodora' in filename:
            return 'Feodora_Ouverture'
        elif 'test' in filename:
            return 'Test_Files'
        elif re.match(r'^\d+\.pdf$', filename):  # 3.pdf, 4.pdf, etc.
            return 'Numbered_Collection'
        elif filename.startswith('15'):  # 15_xxx files
            return 'Large_Work_15_Series'
        elif 'skm_' in filename or 'km_' in filename:
            # Scanner files - group by date
            date_match = re.search(r'(\d{8})', filename)
            if date_match:
                return f'Scan_Session_{date_match.group(1)}'
            return 'Scanner_Files'
        
        return 'Unknown_Piece'
    
    def extract_piece_from_ocr(self, ocr_text: str) -> str:
        """Extract piece from OCR text"""
        text_lower = ocr_text.lower()
        
        # Look for known pieces
        if 'french comedy' in text_lower or ('french' in text_lower and 'comedy' in text_lower):
            return 'French_Comedy_Overture'
        elif 'feodora' in text_lower:
            return 'Feodora_Ouverture'
        elif 'kéler béla' in text_lower or 'keler bela' in text_lower:
            return 'Keler_Bela_Collection'
        elif 'tschaikowsky' in text_lower or 'tchaikovsky' in text_lower:
            return 'Tchaikovsky_Collection'
        elif 'overture' in text_lower or 'ouverture' in text_lower:
            return 'Unknown_Overture'
        elif 'march' in text_lower or 'marsch' in text_lower:
            return 'Unknown_March'
        
        return 'Unknown_Piece'
    
    def create_piece_first_structure(self, piece_groups: Dict, dry_run: bool = True) -> Dict:
        """Create the piece-first directory structure"""
        result = {
            'moves_planned': 0,
            'directories_created': 0,
            'piece_summary': {},
            'moves': []
        }
        
        new_base = self.sheet_music_dir / 'reorganized' if dry_run else self.sheet_music_dir
        
        for piece_name, files in piece_groups.items():
            if piece_name == 'Test_Files':
                # Move test files to archive
                target_dir = new_base / 'archive' / 'test_files'
            else:
                target_dir = new_base / piece_name
            
            result['piece_summary'][piece_name] = len(files)
            
            for file_path in files:
                # Determine instrument from current location or filename
                instrument = self.guess_instrument(file_path)
                
                if instrument:
                    final_target = target_dir / instrument
                else:
                    final_target = target_dir / 'Mixed_Instruments'
                
                # Create filename
                new_filename = f"{piece_name}_{instrument}_{file_path.name}" if instrument else file_path.name
                target_file = final_target / new_filename
                
                move_plan = {
                    'source': file_path,
                    'target': target_file,
                    'piece': piece_name,
                    'instrument': instrument
                }
                
                result['moves'].append(move_plan)
                result['moves_planned'] += 1
                
                if not dry_run:
                    # Actually create directories and move files
                    final_target.mkdir(parents=True, exist_ok=True)
                    shutil.move(file_path, target_file)
                    result['directories_created'] += 1
        
        return result
    
    def guess_instrument(self, file_path: Path) -> Optional[str]:
        """Guess instrument from path or filename"""
        # Check current directory structure
        path_parts = file_path.parts
        instruments = ['Bassoon', 'Clarinet', 'Flute', 'Trumpet', 'Horn', 'Trombone', 'Tuba', 'Timpani', 'Percussion', 'Euphonium', 'Cornet']
        
        for part in path_parts:
            if part in instruments:
                return part
        
        # Check filename
        filename_lower = file_path.name.lower()
        for instrument in instruments:
            if instrument.lower() in filename_lower:
                return instrument
        
        return None
    
    def reorganize_unknown_folder(self, dry_run: bool = True, max_files: int = 10) -> Dict:
        """Main method to reorganize Unknown folder"""
        print("🎵 Quick USB Reorganizer - Unknown Folder Focus")
        print("=" * 50)
        
        # Step 1: Analyze Unknown folder
        analysis = self.analyze_unknown_folder(max_files)
        
        if 'error' in analysis:
            return analysis
        
        print(f"\n📊 Analysis Results:")
        for piece, files in analysis['piece_groups'].items():
            print(f"   • {piece}: {len(files)} files")
        
        # Step 2: Create reorganization plan
        print(f"\n🔄 Creating reorganization plan...")
        result = self.create_piece_first_structure(analysis['piece_groups'], dry_run)
        
        print(f"\n📋 Reorganization Plan:")
        print(f"   Files to move: {result['moves_planned']}")
        print(f"   Pieces detected: {len(result['piece_summary'])}")
        
        print(f"\n📁 New Structure Preview:")
        for piece, count in result['piece_summary'].items():
            print(f"   /{piece}/ → {count} files")
        
        if dry_run:
            print(f"\n💡 This was a dry run. Add --execute to apply changes.")
        else:
            print(f"\n✅ Reorganization completed!")
        
        return result

def main():
    """Quick command line interface"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Quick USB Reorganizer - Unknown Folder Focus")
    parser.add_argument('usb_path', help='Path to USB drive')
    parser.add_argument('--execute', action='store_true', help='Actually move files (default is dry-run)')
    parser.add_argument('--max-files', type=int, default=15, help='Maximum files to process (default: 15)')
    parser.add_argument('--api-key', help='OCR.space API key')
    
    args = parser.parse_args()
    
    usb_path = Path(args.usb_path)
    if not usb_path.exists():
        print(f"❌ Error: USB path '{usb_path}' does not exist")
        sys.exit(1)
    
    reorganizer = QuickUSBReorganizer(usb_path, args.api_key)
    
    result = reorganizer.reorganize_unknown_folder(
        dry_run=not args.execute,
        max_files=args.max_files
    )
    
    if 'error' in result:
        print(f"❌ Error: {result['error']}")
        sys.exit(1)

if __name__ == "__main__":
    main()