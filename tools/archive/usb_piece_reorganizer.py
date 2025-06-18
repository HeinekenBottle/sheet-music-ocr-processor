#!/usr/bin/env python3
"""
USB Piece-First Reorganizer
Specifically designed to reorganize existing USB collections into piece-first structure
"""
import os
import sys
import re
import json
import time
import shutil
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from collections import defaultdict

# Import the main processor for OCR functionality
try:
    from multi_piece_processor import MultiPieceSheetMusicProcessor, MusicPieceInfo
except ImportError:
    print("Error: multi_piece_processor.py not found in same directory")
    sys.exit(1)

@dataclass
class ReorganizationPlan:
    """Plan for reorganizing files"""
    source_file: Path
    target_path: Path
    piece_name: str
    instrument: str
    part: Optional[str] = None
    key: Optional[str] = None
    confidence: str = 'medium'

class USBPieceReorganizer:
    """Reorganizes existing USB structure to piece-first organization"""
    
    def __init__(self, usb_path: Path, api_key: str = None):
        self.usb_path = usb_path
        self.sheet_music_dir = usb_path / "SheetMusic"
        self.backup_dir = usb_path / f"backup_{int(time.time())}"
        self.reorganization_plans: List[ReorganizationPlan] = []
        
        # Initialize the main processor for OCR
        self.processor = MultiPieceSheetMusicProcessor(
            api_key=api_key,
            organization_mode="piece_first",
            max_batch_size=50
        )
        
        self.setup_logging()
    
    def setup_logging(self):
        """Setup logging"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.StreamHandler(sys.stdout),
                logging.FileHandler('/tmp/usb_reorganizer.log')
            ]
        )
        self.logger = logging.getLogger(__name__)
    
    def scan_existing_structure(self) -> Dict:
        """Scan the existing USB structure and catalog all files"""
        catalog = {
            'organized_files': [],  # Files already in instrument folders
            'unknown_files': [],    # Files in Unknown folder
            'archive_files': [],    # Files in archive
            'total_files': 0
        }
        
        if not self.sheet_music_dir.exists():
            self.logger.error(f"SheetMusic directory not found: {self.sheet_music_dir}")
            return catalog
        
        # Scan organized instrument directories
        for item in self.sheet_music_dir.iterdir():
            if not item.is_dir() or item.name in ['Unknown', 'archive']:
                continue
            
            # This is an instrument directory
            for pdf_file in item.rglob("*.pdf"):
                catalog['organized_files'].append(pdf_file)
                catalog['total_files'] += 1
        
        # Scan Unknown directory
        unknown_dir = self.sheet_music_dir / 'Unknown'
        if unknown_dir.exists():
            for pdf_file in unknown_dir.glob("*.pdf"):
                catalog['unknown_files'].append(pdf_file)
                catalog['total_files'] += 1
        
        # Scan archive (but don't reorganize these)
        archive_dir = self.sheet_music_dir / 'archive'
        if archive_dir.exists():
            for pdf_file in archive_dir.rglob("*.pdf"):
                catalog['archive_files'].append(pdf_file)
        
        self.logger.info(f"Scanned USB: {catalog['total_files']} files total")
        self.logger.info(f"  Organized: {len(catalog['organized_files'])}")
        self.logger.info(f"  Unknown: {len(catalog['unknown_files'])}")
        self.logger.info(f"  Archive: {len(catalog['archive_files'])}")
        
        return catalog
    
    def analyze_files_for_pieces(self, files: List[Path], batch_size: int = 10) -> Dict[str, List[Path]]:
        """Analyze files and group them by detected pieces"""
        piece_groups = defaultdict(list)
        
        self.logger.info(f"Analyzing {len(files)} files for piece detection...")
        
        # Process files in batches to avoid overwhelming OCR API
        for i in range(0, len(files), batch_size):
            batch_files = files[i:i + batch_size]
            self.logger.info(f"Processing batch {i//batch_size + 1}: {len(batch_files)} files")
            
            for file_path in batch_files:
                try:
                    # Use the main processor to analyze the file
                    ocr_success, ocr_text = self.processor.extract_text_from_pdf(file_path)
                    
                    if ocr_success:
                        # Parse music information
                        music_info = self.processor.parse_enhanced_music_info(ocr_text, file_path.name)
                        piece_info = music_info['piece_info']
                        
                        # Determine piece name
                        piece_name = self.determine_piece_name(piece_info, file_path, ocr_text)
                        piece_groups[piece_name].append(file_path)
                        
                        self.logger.info(f"  {file_path.name} → {piece_name}")
                    else:
                        # Fallback: use filename/path analysis
                        piece_name = self.guess_piece_from_filename(file_path)
                        piece_groups[piece_name].append(file_path)
                        
                        self.logger.warning(f"  {file_path.name} → {piece_name} (OCR failed)")
                    
                    # Rate limiting
                    time.sleep(0.5)
                    
                except Exception as e:
                    self.logger.error(f"Error analyzing {file_path.name}: {e}")
                    piece_groups['Unknown_Piece'].append(file_path)
        
        return dict(piece_groups)
    
    def determine_piece_name(self, piece_info: MusicPieceInfo, file_path: Path, ocr_text: str) -> str:
        """Determine the best piece name for a file"""
        # Priority order for piece naming
        if piece_info.title and len(piece_info.title) > 3:
            # Clean up the title for use as folder name
            clean_title = re.sub(r'[^\w\s\-]', '', piece_info.title)
            clean_title = re.sub(r'\s+', '_', clean_title)
            return clean_title
        
        elif piece_info.composer and piece_info.style:
            return f"{piece_info.composer}_{piece_info.style}"
        
        elif piece_info.style:
            return piece_info.style
        
        else:
            # Try to extract from OCR text
            return self.extract_piece_from_ocr(ocr_text, file_path)
    
    def extract_piece_from_ocr(self, ocr_text: str, file_path: Path) -> str:
        """Extract piece name from OCR text using pattern matching"""
        text_lines = ocr_text.split('\n')[:5]  # Look at first few lines
        
        # Look for known piece patterns
        for line in text_lines:
            line_clean = line.strip().lower()
            
            # French Comedy Overture
            if 'french' in line_clean and 'comedy' in line_clean:
                return 'French_Comedy_Overture'
            
            # Feodora Overture
            if 'feodora' in line_clean:
                return 'Feodora_Ouverture'
            
            # Generic overtures
            if 'overture' in line_clean or 'ouverture' in line_clean or 'ouvertüre' in line_clean:
                # Try to get the specific overture name
                words = line_clean.split()
                if len(words) >= 2:
                    overture_words = []
                    for word in words:
                        if word not in ['overture', 'ouverture', 'ouvertüre']:
                            overture_words.append(word.capitalize())
                        else:
                            break
                    if overture_words:
                        return f"{'_'.join(overture_words)}_Overture"
            
            # Marches
            if 'march' in line_clean or 'marsch' in line_clean:
                words = line_clean.split()
                march_words = []
                for word in words:
                    if word not in ['march', 'marsch']:
                        march_words.append(word.capitalize())
                    else:
                        break
                if march_words:
                    return f"{'_'.join(march_words)}_March"
        
        # Fallback to filename analysis
        return self.guess_piece_from_filename(file_path)
    
    def guess_piece_from_filename(self, file_path: Path) -> str:
        """Guess piece from filename and path"""
        path_str = str(file_path).lower()
        filename = file_path.name.lower()
        
        # Look for piece indicators in path/filename
        if 'french' in path_str and 'comedy' in path_str:
            return 'French_Comedy_Overture'
        elif 'feodora' in path_str:
            return 'Feodora_Ouverture'
        elif 'wedding' in path_str:
            return 'Wedding_March'
        elif 'waltz' in path_str:
            return 'Waltz_Collection'
        elif re.search(r'\b\d+\.pdf$', filename):  # numbered files like 3.pdf, 4.pdf
            return 'Numbered_Collection'
        elif 'test' in filename:
            return 'Test_Files'
        else:
            return 'Unknown_Piece'
    
    def create_reorganization_plan(self, piece_groups: Dict[str, List[Path]]) -> List[ReorganizationPlan]:
        """Create detailed reorganization plan"""
        plans = []
        
        for piece_name, files in piece_groups.items():
            self.logger.info(f"Planning reorganization for {piece_name}: {len(files)} files")
            
            for file_path in files:
                try:
                    # Get music info for this file
                    ocr_success, ocr_text = self.processor.extract_text_from_pdf(file_path)
                    
                    if ocr_success:
                        music_info = self.processor.parse_enhanced_music_info(ocr_text, file_path.name)
                        instrument = music_info['instrument'] or 'Unknown_Instrument'
                        part = music_info['part']
                        key = music_info['key']
                    else:
                        # Try to get instrument from current path
                        instrument = self.guess_instrument_from_path(file_path)
                        part = None
                        key = None
                    
                    # Build target path: Piece/Instrument/Part/Key/
                    target_path = self.sheet_music_dir / piece_name / instrument
                    if part:
                        target_path = target_path / part
                    if key and instrument in ['Clarinet', 'Saxophone', 'Horn', 'Trumpet', 'Cornet']:
                        target_path = target_path / key
                    
                    # Create filename
                    filename_parts = [piece_name]
                    if part:
                        filename_parts.append(part)
                    if key:
                        filename_parts.append(key)
                    filename_parts.append(instrument)
                    
                    new_filename = "_".join(filename_parts) + ".pdf"
                    target_file = target_path / new_filename
                    
                    plan = ReorganizationPlan(
                        source_file=file_path,
                        target_path=target_file,
                        piece_name=piece_name,
                        instrument=instrument,
                        part=part,
                        key=key,
                        confidence='high' if ocr_success else 'low'
                    )
                    
                    plans.append(plan)
                    
                except Exception as e:
                    self.logger.error(f"Error planning {file_path.name}: {e}")
        
        return plans
    
    def guess_instrument_from_path(self, file_path: Path) -> str:
        """Guess instrument from current file path"""
        path_parts = file_path.parts
        
        # Look for instrument directory in path
        instruments = ['Bassoon', 'Clarinet', 'Flute', 'Trumpet', 'Horn', 'Trombone', 'Tuba', 'Timpani', 'Percussion']
        
        for part in path_parts:
            if part in instruments:
                return part
        
        # Fallback to filename analysis
        filename_lower = file_path.name.lower()
        for instrument in instruments:
            if instrument.lower() in filename_lower:
                return instrument
        
        return 'Unknown_Instrument'
    
    def execute_reorganization(self, plans: List[ReorganizationPlan], dry_run: bool = True) -> Dict:
        """Execute the reorganization plan"""
        result = {
            'moved_files': 0,
            'created_directories': 0,
            'errors': 0,
            'error_messages': [],
            'piece_summary': defaultdict(int)
        }
        
        if not dry_run:
            # Create backup first
            self.logger.info(f"Creating backup at {self.backup_dir}")
            shutil.copytree(self.sheet_music_dir, self.backup_dir)
        
        for plan in plans:
            try:
                if not dry_run:
                    # Create target directory
                    plan.target_path.parent.mkdir(parents=True, exist_ok=True)
                    result['created_directories'] += 1
                    
                    # Move the file
                    shutil.move(plan.source_file, plan.target_path)
                
                result['moved_files'] += 1
                result['piece_summary'][plan.piece_name] += 1
                
                self.logger.info(f"{'MOVED' if not dry_run else 'WOULD MOVE'}: {plan.source_file.name} → {plan.target_path.relative_to(self.sheet_music_dir)}")
                
            except Exception as e:
                result['errors'] += 1
                result['error_messages'].append(f"{plan.source_file.name}: {e}")
                self.logger.error(f"Error processing {plan.source_file.name}: {e}")
        
        return result
    
    def reorganize_usb(self, dry_run: bool = True) -> Dict:
        """Main method to reorganize entire USB"""
        self.logger.info("Starting USB reorganization...")
        
        # Step 1: Scan existing structure
        catalog = self.scan_existing_structure()
        if catalog['total_files'] == 0:
            return {'error': 'No files found to reorganize'}
        
        # Step 2: Combine all files for analysis
        all_files = catalog['organized_files'] + catalog['unknown_files']
        
        # Step 3: Analyze files and group by pieces
        piece_groups = self.analyze_files_for_pieces(all_files)
        
        # Step 4: Create reorganization plan
        plans = self.create_reorganization_plan(piece_groups)
        
        # Step 5: Execute reorganization
        result = self.execute_reorganization(plans, dry_run)
        
        # Step 6: Add summary information
        result['total_files_found'] = catalog['total_files']
        result['pieces_detected'] = len(piece_groups)
        result['piece_groups'] = {name: len(files) for name, files in piece_groups.items()}
        
        return result

def main():
    """Command line interface"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="USB Piece-First Reorganizer",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
This tool reorganizes your existing USB sheet music collection
into piece-first structure: /Piece/Instrument/Part/Key/

Examples:
  python3 usb_piece_reorganizer.py "/Volumes/STORE N GO" --analyze
  python3 usb_piece_reorganizer.py "/Volumes/STORE N GO" --reorganize --dry-run
  python3 usb_piece_reorganizer.py "/Volumes/STORE N GO" --reorganize --api-key YOUR_KEY
        """
    )
    
    parser.add_argument('usb_path', help='Path to USB drive')
    parser.add_argument('--analyze', action='store_true', help='Analyze current structure only')
    parser.add_argument('--reorganize', action='store_true', help='Reorganize to piece-first structure')
    parser.add_argument('--dry-run', action='store_true', help='Preview changes without applying')
    parser.add_argument('--api-key', help='OCR.space API key for piece detection')
    
    args = parser.parse_args()
    
    usb_path = Path(args.usb_path)
    if not usb_path.exists():
        print(f"❌ Error: USB path '{usb_path}' does not exist")
        sys.exit(1)
    
    reorganizer = USBPieceReorganizer(usb_path, args.api_key)
    
    if args.analyze:
        print("🔍 Analyzing USB structure...")
        catalog = reorganizer.scan_existing_structure()
        
        print(f"\n📊 USB Analysis:")
        print(f"   Total files: {catalog['total_files']}")
        print(f"   Organized files: {len(catalog['organized_files'])}")
        print(f"   Unknown files: {len(catalog['unknown_files'])}")
        print(f"   Archive files: {len(catalog['archive_files'])}")
        
    elif args.reorganize:
        print("🔄 Starting USB reorganization...")
        
        result = reorganizer.reorganize_usb(dry_run=args.dry_run)
        
        if 'error' in result:
            print(f"❌ Error: {result['error']}")
            sys.exit(1)
        
        print(f"\n📊 Reorganization Results:")
        print(f"   Files processed: {result['moved_files']}")
        print(f"   Pieces detected: {result['pieces_detected']}")
        print(f"   Errors: {result['errors']}")
        
        print(f"\n🎵 Pieces found:")
        for piece, count in result['piece_groups'].items():
            print(f"   • {piece}: {count} files")
        
        if result['error_messages']:
            print(f"\n❌ Errors encountered:")
            for error in result['error_messages'][:5]:
                print(f"   • {error}")
        
        if args.dry_run:
            print(f"\n💡 This was a dry run - no files were moved")
            print(f"🔄 Remove --dry-run to apply changes")
        else:
            print(f"\n✅ Reorganization completed!")
            print(f"📦 Backup available at: {reorganizer.backup_dir}")
    
    else:
        print("❓ Please specify --analyze or --reorganize")
        parser.print_help()

if __name__ == "__main__":
    main()