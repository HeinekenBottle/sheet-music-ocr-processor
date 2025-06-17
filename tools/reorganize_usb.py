#!/usr/bin/env python3
"""
USB Reorganization Script
Reorganizes existing USB structure to support multiple pieces
"""
import os
import sys
import shutil
from pathlib import Path
from typing import Dict, List
import logging

class USBReorganizer:
    """Reorganizes existing USB structure for multi-piece support"""
    
    def __init__(self, usb_path: Path):
        self.usb_path = usb_path
        self.sheet_music_dir = usb_path / "SheetMusic"
        self.backup_dir = usb_path / "backup_before_reorganization"
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
    
    def analyze_current_structure(self) -> Dict:
        """Analyze current USB structure"""
        analysis = {
            'total_files': 0,
            'by_instrument': {},
            'potential_pieces': set(),
            'unknown_files': []
        }
        
        if not self.sheet_music_dir.exists():
            return analysis
        
        for instrument_dir in self.sheet_music_dir.iterdir():
            if not instrument_dir.is_dir() or instrument_dir.name in ['archive', 'Unknown']:
                continue
            
            instrument_files = []
            for pdf_file in instrument_dir.rglob("*.pdf"):
                instrument_files.append(pdf_file)
                analysis['total_files'] += 1
                
                # Try to detect piece names from filenames
                filename = pdf_file.name.lower()
                if 'french' in filename or 'comedy' in filename:
                    analysis['potential_pieces'].add('French_Comedy_Overture')
                elif 'feodora' in filename:
                    analysis['potential_pieces'].add('Feodora_Ouverture')
                elif 'wedding' in filename or 'march' in filename:
                    analysis['potential_pieces'].add('Wedding_March')
            
            analysis['by_instrument'][instrument_dir.name] = len(instrument_files)
        
        # Check Unknown folder
        unknown_dir = self.sheet_music_dir / 'Unknown'
        if unknown_dir.exists():
            for pdf_file in unknown_dir.glob("*.pdf"):
                analysis['unknown_files'].append(pdf_file.name)
                analysis['total_files'] += 1
        
        return analysis
    
    def create_backup(self) -> bool:
        """Create backup of current structure"""
        try:
            if self.backup_dir.exists():
                shutil.rmtree(self.backup_dir)
            
            self.logger.info(f"Creating backup at {self.backup_dir}")
            shutil.copytree(self.sheet_music_dir, self.backup_dir)
            return True
        except Exception as e:
            self.logger.error(f"Backup failed: {e}")
            return False
    
    def suggest_reorganization_plan(self, analysis: Dict) -> Dict:
        """Suggest reorganization strategy based on analysis"""
        plan = {
            'strategy': 'piece_first',  # vs 'instrument_first'
            'detected_pieces': list(analysis['potential_pieces']),
            'moves_required': [],
            'new_structure': {}
        }
        
        # If we can't detect pieces well, suggest keeping current structure
        if len(analysis['potential_pieces']) < 2:
            plan['strategy'] = 'keep_current'
            plan['recommendation'] = 'Continue with current instrument-first structure for now'
            return plan
        
        # Suggest piece-first reorganization
        for piece in analysis['potential_pieces']:
            plan['new_structure'][piece] = {}
            for instrument in analysis['by_instrument']:
                plan['new_structure'][piece][instrument] = f"{piece}/{instrument}/"
        
        plan['recommendation'] = f"Reorganize to piece-first structure with {len(analysis['potential_pieces'])} detected pieces"
        return plan
    
    def reorganize_to_piece_first(self, dry_run: bool = True) -> Dict:
        """Reorganize USB to piece-first structure"""
        result = {
            'files_moved': 0,
            'errors': 0,
            'new_structure': [],
            'error_messages': []
        }
        
        # Create new structure directories
        new_base = self.sheet_music_dir / "reorganized"
        
        if not dry_run:
            new_base.mkdir(exist_ok=True)
        
        # Process each instrument directory
        for instrument_dir in self.sheet_music_dir.iterdir():
            if not instrument_dir.is_dir() or instrument_dir.name in ['archive', 'Unknown', 'reorganized']:
                continue
            
            instrument_name = instrument_dir.name
            
            # Process all PDF files in this instrument directory
            for pdf_file in instrument_dir.rglob("*.pdf"):
                try:
                    # Determine piece based on filename or path
                    piece_name = self.detect_piece_from_path(pdf_file)
                    
                    # Determine new path
                    relative_path = pdf_file.relative_to(instrument_dir)
                    new_path = new_base / piece_name / instrument_name / relative_path
                    
                    if not dry_run:
                        new_path.parent.mkdir(parents=True, exist_ok=True)
                        shutil.move(pdf_file, new_path)
                    
                    result['new_structure'].append(f"{piece_name}/{instrument_name}/{relative_path}")
                    result['files_moved'] += 1
                    
                except Exception as e:
                    result['errors'] += 1
                    result['error_messages'].append(f"Error moving {pdf_file}: {e}")
        
        return result
    
    def detect_piece_from_path(self, file_path: Path) -> str:
        """Detect piece name from file path or name"""
        path_str = str(file_path).lower()
        filename = file_path.name.lower()
        
        # Simple heuristic detection
        if any(term in path_str for term in ['french', 'comedy']):
            return 'French_Comedy_Overture'
        elif 'feodora' in path_str:
            return 'Feodora_Ouverture'
        elif any(term in path_str for term in ['wedding', 'march']):
            return 'Wedding_March'
        elif 'waltz' in path_str:
            return 'Waltz_Collection'
        elif 'polka' in path_str:
            return 'Polka_Collection'
        else:
            return 'Unknown_Piece'
    
    def create_migration_script(self) -> str:
        """Create a script to safely migrate to new structure"""
        script_content = f'''#!/bin/bash
# USB Reorganization Migration Script
# Generated for {self.usb_path}

echo "🔄 Starting USB reorganization..."

# Step 1: Create backup
echo "📦 Creating backup..."
cp -r "{self.sheet_music_dir}" "{self.backup_dir}"

# Step 2: Run reorganization
echo "🎵 Reorganizing to piece-first structure..."
python3 multi_piece_processor.py \\
    "{self.sheet_music_dir}" \\
    "{self.sheet_music_dir}/reorganized" \\
    --org-mode piece_first \\
    --max-batch 10 \\
    --dry-run

echo "📋 Review the dry-run results above"
echo "💡 If satisfied, rerun without --dry-run to apply changes"
echo "🔙 Backup available at: {self.backup_dir}"
'''
        
        script_path = self.usb_path / "reorganize_script.sh"
        with open(script_path, 'w') as f:
            f.write(script_content)
        
        # Make executable
        os.chmod(script_path, 0o755)
        
        return str(script_path)

def main():
    """Main reorganization interface"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="USB Sheet Music Reorganization Tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
This tool helps reorganize existing USB sheet music collections
to support multiple pieces without file overwrites.

Examples:
  python3 reorganize_usb.py "/Volumes/STORE N GO" --analyze
  python3 reorganize_usb.py "/Volumes/STORE N GO" --reorganize --dry-run
  python3 reorganize_usb.py "/Volumes/STORE N GO" --create-script
        """
    )
    
    parser.add_argument('usb_path', help='Path to USB drive')
    parser.add_argument('--analyze', action='store_true', help='Analyze current structure')
    parser.add_argument('--reorganize', action='store_true', help='Reorganize to piece-first structure')
    parser.add_argument('--create-script', action='store_true', help='Create migration script')
    parser.add_argument('--dry-run', action='store_true', help='Preview changes without applying')
    
    args = parser.parse_args()
    
    usb_path = Path(args.usb_path)
    if not usb_path.exists():
        print(f"❌ Error: USB path '{usb_path}' does not exist")
        sys.exit(1)
    
    reorganizer = USBReorganizer(usb_path)
    
    if args.analyze:
        print("🔍 Analyzing current USB structure...")
        analysis = reorganizer.analyze_current_structure()
        
        print(f"\n📊 Analysis Results:")
        print(f"   Total files: {analysis['total_files']}")
        print(f"   Instruments: {len(analysis['by_instrument'])}")
        print(f"   Detected pieces: {len(analysis['potential_pieces'])}")
        print(f"   Unknown files: {len(analysis['unknown_files'])}")
        
        if analysis['potential_pieces']:
            print(f"\n🎵 Detected pieces:")
            for piece in analysis['potential_pieces']:
                print(f"   • {piece}")
        
        print(f"\n📁 Files by instrument:")
        for instrument, count in analysis['by_instrument'].items():
            print(f"   • {instrument}: {count} files")
        
        plan = reorganizer.suggest_reorganization_plan(analysis)
        print(f"\n💡 Recommendation: {plan['recommendation']}")
    
    elif args.create_script:
        print("📝 Creating reorganization script...")
        script_path = reorganizer.create_migration_script()
        print(f"✅ Migration script created: {script_path}")
        print(f"💡 Review and run the script when ready")
    
    elif args.reorganize:
        print("🔄 Starting reorganization...")
        
        if not args.dry_run:
            print("📦 Creating backup first...")
            if not reorganizer.create_backup():
                print("❌ Backup failed - aborting reorganization")
                sys.exit(1)
        
        result = reorganizer.reorganize_to_piece_first(dry_run=args.dry_run)
        
        print(f"\n📊 Reorganization Results:")
        print(f"   Files processed: {result['files_moved']}")
        print(f"   Errors: {result['errors']}")
        
        if result['error_messages']:
            print(f"\n❌ Errors:")
            for error in result['error_messages'][:5]:  # Show first 5
                print(f"   • {error}")
        
        if args.dry_run:
            print(f"\n💡 This was a dry run - no files were moved")
            print(f"🔄 Remove --dry-run to apply changes")
        else:
            print(f"\n✅ Reorganization completed!")
    
    else:
        print("❓ Please specify an action: --analyze, --reorganize, or --create-script")
        parser.print_help()

if __name__ == "__main__":
    main()