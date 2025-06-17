#!/usr/bin/env python3
"""
Test File Cleanup Utility
Moves test files, dirty scans, and miscellaneous files to archive/test_files/
"""
import os
import sys
import shutil
import re
from pathlib import Path
from typing import List, Dict

class TestFileCleanup:
    """Utility to clean up test files and organize them"""
    
    TEST_PATTERNS = [
        r'\btest\b',
        r'\bdirty\b',
        r'\bsample\b',
        r'\bdemo\b',
        r'\btrial\b',
        r'\bexample\b',
        r'\b(?:un)?sorted\b',
        r'\bmixed\b',
        r'\btemp\b',
        r'\btmp\b',
        r'\bscrap\b',
        r'\bgarbage\b',
        r'\bbad\b',
        r'\berror\b',
        r'\bwrong\b',
        r'\bbroken\b',
        r'\bcorrupt\b'
    ]
    
    def __init__(self):
        self.moved_files = []
        self.errors = []
    
    def is_test_file(self, filename: str) -> bool:
        """Check if filename indicates a test/temporary file"""
        filename_lower = filename.lower()
        return any(re.search(pattern, filename_lower, re.IGNORECASE) 
                  for pattern in self.TEST_PATTERNS)
    
    def find_test_files(self, directory: Path) -> List[Path]:
        """Find all test files in directory and subdirectories"""
        test_files = []
        
        if not directory.exists():
            return test_files
        
        # Search for PDF files recursively
        for pdf_file in directory.rglob("*.pdf"):
            if self.is_test_file(pdf_file.name):
                test_files.append(pdf_file)
        
        return test_files
    
    def move_test_files(self, source_dir: Path, archive_dir: Path, dry_run: bool = False) -> Dict:
        """Move test files to archive directory"""
        test_files = self.find_test_files(source_dir)
        
        if not test_files:
            return {
                "found": 0,
                "moved": 0,
                "errors": 0,
                "files": []
            }
        
        # Create archive directory
        archive_test_dir = archive_dir / "test_files"
        if not dry_run:
            archive_test_dir.mkdir(parents=True, exist_ok=True)
        
        moved_count = 0
        error_count = 0
        moved_files = []
        
        print(f"Found {len(test_files)} test files:")
        
        for test_file in test_files:
            print(f"  📄 {test_file.relative_to(source_dir)}")
            
            # Create unique filename in archive if needed
            target_file = archive_test_dir / test_file.name
            counter = 1
            while target_file.exists() and not dry_run:
                stem = test_file.stem
                suffix = test_file.suffix
                target_file = archive_test_dir / f"{stem}_{counter}{suffix}"
                counter += 1
            
            try:
                if not dry_run:
                    shutil.move(test_file, target_file)
                    print(f"    → Moved to archive/test_files/{target_file.name}")
                else:
                    print(f"    → Would move to archive/test_files/{target_file.name}")
                
                moved_files.append({
                    "original": str(test_file.relative_to(source_dir)),
                    "archived": str(target_file.relative_to(archive_dir))
                })
                moved_count += 1
                
            except Exception as e:
                print(f"    ❌ Error moving {test_file.name}: {e}")
                self.errors.append(f"{test_file.name}: {e}")
                error_count += 1
        
        return {
            "found": len(test_files),
            "moved": moved_count,
            "errors": error_count,
            "files": moved_files
        }
    
    def clean_empty_directories(self, directory: Path, dry_run: bool = False):
        """Remove empty directories after cleanup"""
        removed_dirs = []
        
        # Walk from deepest to shallowest
        for dirpath in sorted(directory.rglob("*"), key=lambda p: len(p.parts), reverse=True):
            if dirpath.is_dir() and dirpath != directory:
                try:
                    # Check if directory is empty
                    if not any(dirpath.iterdir()):
                        if not dry_run:
                            dirpath.rmdir()
                            print(f"🗑️  Removed empty directory: {dirpath.relative_to(directory)}")
                        else:
                            print(f"🗑️  Would remove empty directory: {dirpath.relative_to(directory)}")
                        removed_dirs.append(str(dirpath.relative_to(directory)))
                except OSError:
                    # Directory not empty or other error
                    pass
        
        return removed_dirs
    
    def generate_cleanup_report(self, results: Dict, archive_dir: Path):
        """Generate report of cleanup operations"""
        report_content = []
        report_content.append("TEST FILE CLEANUP REPORT")
        report_content.append("=" * 40)
        report_content.append(f"Date: {os.popen('date').read().strip()}")
        report_content.append(f"Files found: {results['found']}")
        report_content.append(f"Files moved: {results['moved']}")
        report_content.append(f"Errors: {results['errors']}")
        report_content.append("")
        
        if results['files']:
            report_content.append("MOVED FILES:")
            report_content.append("-" * 20)
            for file_info in results['files']:
                report_content.append(f"  {file_info['original']} → {file_info['archived']}")
            report_content.append("")
        
        if self.errors:
            report_content.append("ERRORS:")
            report_content.append("-" * 20)
            for error in self.errors:
                report_content.append(f"  {error}")
        
        # Save report
        report_file = archive_dir / "cleanup_report.txt"
        with open(report_file, 'w') as f:
            f.write('\n'.join(report_content))
        
        print(f"\n📄 Cleanup report saved: {report_file}")

def main():
    """Command line interface for test file cleanup"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Clean up test files and move them to archive",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Test File Patterns Detected:
  • Files containing: test, dirty, sample, demo, trial, example
  • Files containing: temp, tmp, scrap, garbage, bad, error
  • Files containing: wrong, broken, corrupt, unsorted, mixed

Examples:
  python3 cleanup_test_files.py /Volumes/USB/SheetMusic
  python3 cleanup_test_files.py ~/sheet-music-project/organized --dry-run
  python3 cleanup_test_files.py ~/Desktop ~/archive --archive-dir ~/archive
        """
    )
    
    parser.add_argument('source_dir', help='Directory to clean up')
    parser.add_argument('archive_dir', nargs='?', help='Archive directory (default: source_dir/archive)')
    parser.add_argument('--dry-run', action='store_true', help='Preview only, no file operations')
    parser.add_argument('--clean-empty-dirs', action='store_true', help='Remove empty directories after cleanup')
    
    args = parser.parse_args()
    
    source_dir = Path(args.source_dir)
    
    if not source_dir.exists():
        print(f"❌ Error: Source directory '{source_dir}' does not exist")
        sys.exit(1)
    
    # Determine archive directory
    if args.archive_dir:
        archive_dir = Path(args.archive_dir)
    else:
        archive_dir = source_dir / "archive"
    
    print("🧹 Test File Cleanup Utility")
    print("=" * 40)
    print(f"Source: {source_dir}")
    print(f"Archive: {archive_dir}")
    print(f"Mode: {'DRY RUN' if args.dry_run else 'LIVE'}")
    print()
    
    # Initialize cleanup
    cleanup = TestFileCleanup()
    
    # Move test files
    results = cleanup.move_test_files(source_dir, archive_dir, args.dry_run)
    
    print(f"\n📊 Summary:")
    print(f"  Files found: {results['found']}")
    print(f"  Files moved: {results['moved']}")
    print(f"  Errors: {results['errors']}")
    
    # Clean empty directories if requested
    if args.clean_empty_dirs and results['moved'] > 0:
        print(f"\n🗑️  Cleaning empty directories...")
        removed_dirs = cleanup.clean_empty_directories(source_dir, args.dry_run)
        print(f"  Directories removed: {len(removed_dirs)}")
    
    # Generate report
    if not args.dry_run and results['moved'] > 0:
        cleanup.generate_cleanup_report(results, archive_dir)
    
    if args.dry_run:
        print(f"\n💡 Run without --dry-run to actually move files")
    elif results['moved'] > 0:
        print(f"\n✅ Cleanup completed successfully")
    else:
        print(f"\n✅ No test files found - directory is clean")

if __name__ == "__main__":
    main()