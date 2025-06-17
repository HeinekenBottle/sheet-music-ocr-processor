#!/usr/bin/env python3
"""
Sheet Music Digitization Workflow - Main Orchestrator
Combines all tools into a unified workflow for processing sheet music
"""
import os
import sys
import argparse
from pathlib import Path
from tools.main_processor import UnifiedSheetMusicProcessor
from tools.usb_workflow_v2 import USBWorkflowManager

def main():
    """Main workflow orchestrator"""
    parser = argparse.ArgumentParser(
        description="Sheet Music Digitization Workflow",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Process raw scans from staging to organized
  python3 workflow.py staging-to-organized
  
  # Process files via USB workflow (auto-detect USB)
  python3 workflow.py usb-workflow
  
  # Process specific directory
  python3 workflow.py process ~/Desktop ~/organized --move
  
  # Preview what would be processed
  python3 workflow.py process ~/Desktop ~/organized --dry-run
  
  # USB status and preview
  python3 workflow.py usb-status
        """
    )
    
    parser.add_argument('command', choices=[
        'staging-to-organized', 'usb-workflow', 'usb-status', 'process'
    ], help='Workflow command to execute')
    
    parser.add_argument('input_dir', nargs='?', help='Input directory (for process command)')
    parser.add_argument('output_dir', nargs='?', help='Output directory (for process command)')
    
    parser.add_argument('--dry-run', action='store_true', help='Preview only, no file operations')
    parser.add_argument('--move', action='store_true', help='Move files instead of copying')
    parser.add_argument('--api-key', default='helloworld', help='OCR.space API key')
    parser.add_argument('--log-level', default='INFO', choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'])
    
    args = parser.parse_args()
    
    # Set up project paths
    project_root = Path(__file__).parent
    staging_dir = project_root / 'staging' / 'raw_scans'
    organized_dir = project_root / 'organized'
    
    if args.command == 'staging-to-organized':
        print("🎵 Processing staging files to organized directory")
        print("=" * 60)
        
        processor = UnifiedSheetMusicProcessor(api_key=args.api_key, log_level=args.log_level)
        result = processor.process_batch(
            input_dir=staging_dir,
            output_dir=organized_dir,
            move_files=args.move,
            dry_run=args.dry_run
        )
        
        print(f"\n✅ Processed {result.successful}/{result.total_files} files successfully")
        
    elif args.command == 'usb-workflow':
        print("🔄 USB Workflow - Auto-detecting and processing")
        print("=" * 60)
        
        manager = USBWorkflowManager()
        result = manager.execute_workflow(dry_run=args.dry_run)
        
        if 'error' in result:
            print(f"❌ {result['error']}")
            sys.exit(1)
        
        print(f"\n✅ USB workflow completed: {result['total_successful']}/{result['total_files']} files")
        
    elif args.command == 'usb-status':
        print("🔍 USB Drive Status")
        print("=" * 60)
        
        manager = USBWorkflowManager()
        manager.show_usb_status()
        
    elif args.command == 'process':
        if not args.input_dir or not args.output_dir:
            print("❌ Error: process command requires input_dir and output_dir")
            sys.exit(1)
        
        input_path = Path(args.input_dir)
        output_path = Path(args.output_dir)
        
        if not input_path.exists():
            print(f"❌ Error: Input directory '{input_path}' does not exist")
            sys.exit(1)
        
        print(f"🎵 Processing {input_path} → {output_path}")
        print("=" * 60)
        
        processor = UnifiedSheetMusicProcessor(api_key=args.api_key, log_level=args.log_level)
        result = processor.process_batch(
            input_dir=input_path,
            output_dir=output_path,
            move_files=args.move,
            dry_run=args.dry_run
        )
        
        print(f"\n✅ Processed {result.successful}/{result.total_files} files successfully")

if __name__ == "__main__":
    main()