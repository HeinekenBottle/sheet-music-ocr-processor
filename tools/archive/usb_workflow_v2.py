#!/usr/bin/env python3
"""
USB Workflow System v2.0
Auto-detects raw scans on USB and processes them with the refactored system
"""
import os
import sys
import subprocess
from pathlib import Path
try:
    from .main_processor import UnifiedSheetMusicProcessor
except ImportError:
    from main_processor import UnifiedSheetMusicProcessor

class USBWorkflowManager:
    """Manages USB-to-USB workflow for sheet music processing"""
    
    def __init__(self):
        self.usb_patterns = [
            "STORE N GO",
            "USB",
            "MUSIC",
            "SHEETS"
        ]
        
        self.raw_scan_patterns = [
            r"raw",
            r"scan",
            r"unprocessed", 
            r"new",
            r"inbox",
            r"temp"
        ]
    
    def find_usb_drives(self) -> list:
        """Find all USB drives on the system"""
        usb_drives = []
        volumes_path = Path("/Volumes")
        
        if volumes_path.exists():
            for drive in volumes_path.iterdir():
                if drive.is_dir() and not drive.name.startswith('.'):
                    usb_drives.append(drive)
        
        return usb_drives
    
    def find_main_usb(self) -> Path:
        """Find the main USB drive for sheet music"""
        usb_drives = self.find_usb_drives()
        
        # Look for our known USB drive first
        for drive in usb_drives:
            if any(pattern.lower() in drive.name.lower() for pattern in self.usb_patterns):
                sheet_music_dir = drive / "SheetMusic"
                if sheet_music_dir.exists():
                    return drive
        
        # Fallback: any drive with SheetMusic folder
        for drive in usb_drives:
            sheet_music_dir = drive / "SheetMusic"
            if sheet_music_dir.exists():
                return drive
        
        return None
    
    def find_raw_scan_directories(self, usb_drive: Path) -> list:
        """Find directories containing raw scanned files"""
        raw_dirs = []
        
        # Check for pattern-based directories
        for item in usb_drive.iterdir():
            if item.is_dir():
                dir_name_lower = item.name.lower()
                if any(pattern in dir_name_lower for pattern in self.raw_scan_patterns):
                    # Check if it contains PDF files
                    pdf_files = list(item.glob("*.pdf"))
                    if pdf_files:
                        raw_dirs.append(item)
        
        # Check for numbered directories (like scan sessions)
        for item in usb_drive.iterdir():
            if item.is_dir() and item.name.isdigit():
                pdf_files = list(item.glob("*.pdf"))
                if pdf_files:
                    raw_dirs.append(item)
        
        # Check root of USB for loose PDFs
        root_pdfs = list(usb_drive.glob("*.pdf"))
        if root_pdfs:
            raw_dirs.append(usb_drive)
        
        return raw_dirs
    
    def preview_workflow(self, usb_drive: Path = None) -> dict:
        """Preview what would be processed in the workflow"""
        if not usb_drive:
            usb_drive = self.find_main_usb()
            if not usb_drive:
                return {"error": "No USB drive found with SheetMusic folder"}
        
        raw_dirs = self.find_raw_scan_directories(usb_drive)
        sheet_music_dir = usb_drive / "SheetMusic"
        
        preview = {
            "usb_drive": str(usb_drive),
            "sheet_music_dir": str(sheet_music_dir),
            "raw_directories": [],
            "total_files": 0
        }
        
        for raw_dir in raw_dirs:
            pdf_files = list(raw_dir.glob("*.pdf"))
            preview["raw_directories"].append({
                "path": str(raw_dir),
                "file_count": len(pdf_files),
                "files": [f.name for f in pdf_files[:5]]  # Show first 5
            })
            preview["total_files"] += len(pdf_files)
        
        return preview
    
    def execute_workflow(self, usb_drive: Path = None, dry_run: bool = False) -> dict:
        """Execute the complete USB workflow"""
        if not usb_drive:
            usb_drive = self.find_main_usb()
            if not usb_drive:
                return {"error": "No USB drive found with SheetMusic folder"}
        
        raw_dirs = self.find_raw_scan_directories(usb_drive)
        sheet_music_dir = usb_drive / "SheetMusic"
        
        if not raw_dirs:
            return {"error": "No raw scan directories found"}
        
        # Ensure SheetMusic directory exists
        sheet_music_dir.mkdir(exist_ok=True)
        
        # Initialize processor
        processor = UnifiedSheetMusicProcessor(log_level="INFO")
        
        workflow_results = {
            "usb_drive": str(usb_drive),
            "processed_directories": [],
            "total_files": 0,
            "total_successful": 0,
            "total_failed": 0,
            "total_ocr_success": 0
        }
        
        # Process each raw directory
        for raw_dir in raw_dirs:
            print(f"\n🔄 Processing directory: {raw_dir.name}")
            print("-" * 50)
            
            result = processor.process_batch(
                input_dir=raw_dir,
                output_dir=sheet_music_dir,
                move_files=True,  # Clean up raw scans
                dry_run=dry_run
            )
            
            dir_result = {
                "directory": str(raw_dir),
                "files_processed": result.total_files,
                "successful": result.successful,
                "failed": result.failed,
                "ocr_success": result.ocr_success,
                "processing_time": result.processing_time
            }
            
            workflow_results["processed_directories"].append(dir_result)
            workflow_results["total_files"] += result.total_files
            workflow_results["total_successful"] += result.successful
            workflow_results["total_failed"] += result.failed
            workflow_results["total_ocr_success"] += result.ocr_success
            
            # Clean up empty directories after processing
            if not dry_run and not list(raw_dir.glob("*")):
                try:
                    raw_dir.rmdir()
                    print(f"🧹 Cleaned up empty directory: {raw_dir.name}")
                except:
                    pass
        
        return workflow_results
    
    def show_usb_status(self):
        """Show current USB drive status"""
        print("🔍 USB Drive Status")
        print("=" * 50)
        
        usb_drives = self.find_usb_drives()
        if not usb_drives:
            print("No USB drives found")
            return
        
        for drive in usb_drives:
            print(f"📁 {drive.name} ({drive})")
            
            # Check for SheetMusic directory
            sheet_music_dir = drive / "SheetMusic"
            if sheet_music_dir.exists():
                organized_files = len(list(sheet_music_dir.rglob("*.pdf")))
                print(f"   📂 SheetMusic: {organized_files} organized files")
            
            # Check for raw scan directories
            raw_dirs = self.find_raw_scan_directories(drive)
            if raw_dirs:
                total_raw = sum(len(list(d.glob("*.pdf"))) for d in raw_dirs)
                print(f"   📄 Raw scans: {total_raw} files in {len(raw_dirs)} directories")
                for raw_dir in raw_dirs:
                    file_count = len(list(raw_dir.glob("*.pdf")))
                    print(f"      → {raw_dir.name}: {file_count} files")
            
            print()

def main():
    """Command line interface for USB workflow"""
    manager = USBWorkflowManager()
    
    if len(sys.argv) < 2:
        print("🎵 USB Workflow Manager v2.0")
        print("Auto-detect and process raw sheet music scans on USB")
        print("")
        print("Commands:")
        print("  status                    Show USB drive status")
        print("  preview [usb_path]        Preview what would be processed")
        print("  process [usb_path]        Process all raw scans")
        print("  process --dry-run         Preview processing without moving files")
        print("")
        print("Examples:")
        print("  python3 usb_workflow_v2.py status")
        print("  python3 usb_workflow_v2.py preview")
        print("  python3 usb_workflow_v2.py process")
        print("  python3 usb_workflow_v2.py process '/Volumes/MY_USB'")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "status":
        manager.show_usb_status()
    
    elif command == "preview":
        usb_path = Path(sys.argv[2]) if len(sys.argv) > 2 else None
        result = manager.preview_workflow(usb_path)
        
        if "error" in result:
            print(f"❌ {result['error']}")
            sys.exit(1)
        
        print("🔍 USB Workflow Preview")
        print("=" * 50)
        print(f"USB Drive: {result['usb_drive']}")
        print(f"Target: {result['sheet_music_dir']}")
        print(f"Total files to process: {result['total_files']}")
        print("")
        
        for raw_dir in result["raw_directories"]:
            print(f"📁 {Path(raw_dir['path']).name}")
            print(f"   Files: {raw_dir['file_count']}")
            if raw_dir['files']:
                print(f"   Sample: {', '.join(raw_dir['files'][:3])}")
                if len(raw_dir['files']) > 3:
                    print(f"           ... and {raw_dir['file_count'] - 3} more")
            print()
    
    elif command == "process":
        dry_run = "--dry-run" in sys.argv
        usb_path = None
        
        # Look for USB path in arguments
        for arg in sys.argv[2:]:
            if not arg.startswith("--") and Path(arg).exists():
                usb_path = Path(arg)
                break
        
        print("🚀 Starting USB Workflow")
        print("=" * 50)
        
        result = manager.execute_workflow(usb_path, dry_run)
        
        if "error" in result:
            print(f"❌ {result['error']}")
            sys.exit(1)
        
        # Print final summary
        print("\n" + "=" * 60)
        print("USB WORKFLOW COMPLETE")
        print("=" * 60)
        print(f"USB Drive: {result['usb_drive']}")
        print(f"Directories processed: {len(result['processed_directories'])}")
        print(f"Total files: {result['total_files']}")
        print(f"Successful: {result['total_successful']}")
        print(f"Failed: {result['total_failed']}")
        if result['total_files'] > 0:
            print(f"OCR success rate: {result['total_ocr_success']/result['total_files']*100:.1f}%")
        
        if dry_run:
            print("\n📋 This was a dry run - no files were moved")
        else:
            print("\n✅ All raw scans have been processed and organized")
    
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)

if __name__ == "__main__":
    main()