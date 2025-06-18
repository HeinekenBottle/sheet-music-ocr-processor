#!/usr/bin/env python3
"""
Claude Visual Sheet Music Processor v1.0

Direct visual processing workflow using Claude's image analysis:
1. Convert PDF first page to JPEG image
2. Use Claude's Read tool to visually analyze the sheet music
3. Extract metadata directly from visual inspection
4. Organize original PDF based on extracted metadata
5. Clean up temporary JPEG files

Usage:
    python3 claude_visual_processor.py [input_dir] [output_dir] [--single-file filename]
"""

import os
import sys
import subprocess
import tempfile
import shutil
import json
import argparse
import re
from pathlib import Path
from datetime import datetime
from typing import List, Optional, Tuple, Dict
from dataclasses import dataclass

@dataclass
class SheetMusicMetadata:
    """Metadata extracted from sheet music"""
    piece_name: Optional[str] = None
    instrument: Optional[str] = None
    part: Optional[str] = None
    key: Optional[str] = None
    composer: Optional[str] = None
    
    def __str__(self) -> str:
        parts = []
        if self.piece_name:
            parts.append(f"Piece: {self.piece_name}")
        if self.instrument:
            parts.append(f"Instrument: {self.instrument}")
        if self.part:
            parts.append(f"Part: {self.part}")
        if self.key:
            parts.append(f"Key: {self.key}")
        if self.composer:
            parts.append(f"Composer: {self.composer}")
        return " | ".join(parts) if parts else "No metadata"

@dataclass 
class ProcessingResult:
    """Result of processing a single file"""
    original_file: str
    success: bool
    metadata: Optional[SheetMusicMetadata] = None
    final_path: Optional[str] = None
    error: Optional[str] = None
    warnings: List[str] = None
    jpeg_path: Optional[str] = None
    
    def __post_init__(self):
        if self.warnings is None:
            self.warnings = []

class ClaudeVisualProcessor:
    """Sheet music processor using Claude's direct visual analysis"""
    
    def __init__(self, input_path: str, output_path: str):
        self.input_path = Path(input_path).expanduser()
        self.output_path = Path(output_path).expanduser()
        self.temp_dir = Path(tempfile.mkdtemp(prefix="claude_visual_processor_"))
        
        # Create output directory
        self.output_path.mkdir(parents=True, exist_ok=True)
        
        # Setup logging
        self.setup_logging()
        
        # Processing stats
        self.stats = {
            'processed': 0,
            'successful': 0,
            'failed': 0,
            'organized': 0
        }
        
        # Check dependencies
        self.check_dependencies()
        
    def setup_logging(self):
        """Setup logging configuration"""
        import logging
        
        log_dir = Path("reports")
        log_dir.mkdir(exist_ok=True)
        
        self.logger = logging.getLogger(__name__)
        self.logger.setLevel(logging.INFO)
        
        # Clear existing handlers
        self.logger.handlers = []
        
        # File handler
        file_handler = logging.FileHandler(
            log_dir / f"claude_visual_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
        )
        file_handler.setLevel(logging.INFO)
        
        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        
        # Formatter
        formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
        file_handler.setFormatter(formatter)
        console_handler.setFormatter(formatter)
        
        self.logger.addHandler(file_handler)
        self.logger.addHandler(console_handler)
        
    def check_dependencies(self):
        """Check for required tools"""
        # Check macOS tools
        required_tools = ['sips', 'qlmanage']
        missing = []
        
        for tool in required_tools:
            try:
                subprocess.run([tool, '--help'], 
                             capture_output=True, check=False, timeout=5)
            except (subprocess.TimeoutExpired, FileNotFoundError):
                missing.append(tool)
                
        if missing:
            self.logger.error(f"Missing required tools: {', '.join(missing)}")
            raise RuntimeError("Install Xcode Command Line Tools: xcode-select --install")
            
    def find_pdf_files(self) -> List[Path]:
        """Find all PDF files for processing (including subdirectories)"""
        pdf_files = []
        for pattern in ['*.pdf', '*.PDF']:
            pdf_files.extend(self.input_path.rglob(pattern))  # Recursive search
        
        self.logger.info(f"Found {len(pdf_files)} PDF files")
        return sorted(pdf_files)
        
    def convert_pdf_to_jpeg(self, pdf_path: Path) -> Optional[Path]:
        """Convert PDF first page to JPEG for Claude's visual analysis"""
        try:
            # Create JPEG path
            jpeg_path = self.temp_dir / f"{pdf_path.stem}.jpg"
            
            # Step 1: Convert PDF first page to image
            cmd = [
                'qlmanage', '-t', '-s', '1200', 
                '-o', str(self.temp_dir), str(pdf_path)
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            if result.returncode != 0:
                raise RuntimeError(f"qlmanage failed: {result.stderr}")
                
            # Find created file
            created_files = list(self.temp_dir.glob(f"{pdf_path.stem}*"))
            if not created_files:
                raise RuntimeError("No image created by qlmanage")
                
            created_file = created_files[0]
            
            # Convert to JPEG if needed
            if created_file.suffix.lower() == '.png':
                jpeg_cmd = [
                    'sips', '-s', 'format', 'jpeg', '-s', 'formatOptions', '85',
                    str(created_file), '--out', str(jpeg_path)
                ]
                subprocess.run(jpeg_cmd, capture_output=True, check=True)
                created_file.unlink()
            else:
                created_file.rename(jpeg_path)
                
            return jpeg_path
            
        except Exception as e:
            self.logger.error(f"JPEG conversion failed for {pdf_path.name}: {e}")
            return None
    
    def analyze_sheet_music_image(self, image_path: Path) -> SheetMusicMetadata:
        """
        Placeholder for Claude's visual analysis.
        In practice, Claude will use the Read tool to view the image
        and extract metadata directly through visual inspection.
        """
        # This function would be replaced by Claude directly using the Read tool
        # For now, return empty metadata as placeholder
        metadata = SheetMusicMetadata()
        
        # Save the image path for Claude to analyze
        self.logger.info(f"  JPEG ready for analysis: {image_path}")
        
        return metadata
        
    def organize_file(self, file_path: Path, metadata: SheetMusicMetadata) -> Optional[Path]:
        """Organize original file based on extracted metadata"""
        # Use piece name or default to "Unknown_Piece"
        piece_name = metadata.piece_name or "Unknown_Piece"
        
        # Clean piece name for folder
        clean_piece = re.sub(r'[^\w\s-]', '', piece_name)
        clean_piece = re.sub(r'\s+', '_', clean_piece.strip())
        
        # Create organized path: Piece/Instrument/Part/
        path_parts = [clean_piece]
        
        if metadata.instrument:
            path_parts.append(metadata.instrument)
        else:
            path_parts.append("Unknown_Instrument")
            
        if metadata.part:
            path_parts.append(metadata.part)
        elif metadata.key:
            # If no part but we have key, use key as part-like info
            path_parts.append(f"in_{metadata.key}")
        else:
            path_parts.append("Unknown_Part")
            
        dest_dir = self.output_path
        for part in path_parts:
            dest_dir = dest_dir / part
        
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest_file = dest_dir / file_path.name
        
        # Copy original file to destination
        try:
            shutil.copy2(file_path, dest_file)
            self.logger.info(f"Organized: {file_path.name} → {dest_file.relative_to(self.output_path)}")
            return dest_file
        except Exception as e:
            self.logger.error(f"Failed to copy {file_path} to {dest_file}: {e}")
            return None
            
    def process_file(self, file_path: Path) -> ProcessingResult:
        """Process a single PDF file through Claude visual workflow"""
        result = ProcessingResult(original_file=str(file_path), success=False)
        
        try:
            self.logger.info(f"Processing: {file_path.name}")
            
            # Step 1: Convert to JPEG
            jpeg_path = self.convert_pdf_to_jpeg(file_path)
            if not jpeg_path:
                result.error = "Failed to convert to JPEG"
                return result
                
            file_size = jpeg_path.stat().st_size
            result.jpeg_path = str(jpeg_path)
            self.logger.info(f"  JPEG created: {file_size/1024:.0f}KB at {jpeg_path}")
            
            # Step 2: Analyze with Claude (placeholder - Claude will do this manually)
            metadata = self.analyze_sheet_music_image(jpeg_path)
            result.metadata = metadata
            
            # Step 3: Organize original file
            final_path = self.organize_file(file_path, metadata)
            if final_path:
                result.final_path = str(final_path)
                result.success = True
                self.stats['successful'] += 1
                self.stats['organized'] += 1
            else:
                result.error = "Failed to organize file"
                
        except Exception as e:
            result.error = f"Processing failed: {e}"
            self.logger.error(f"Error processing {file_path}: {e}")
                    
        return result
        
    def process_single_file(self, filename: str) -> Optional[ProcessingResult]:
        """Process a single specific file"""
        pdf_files = self.find_pdf_files()
        target_file = None
        
        for pdf_file in pdf_files:
            if pdf_file.name == filename:
                target_file = pdf_file
                break
                
        if not target_file:
            self.logger.error(f"File not found: {filename}")
            return None
            
        self.logger.info(f"Processing single file: {filename}")
        self.stats['processed'] += 1
        result = self.process_file(target_file)
        
        if not result.success:
            self.stats['failed'] += 1
            
        return result
        
    def process_all(self, batch_size: int = 5) -> List[ProcessingResult]:
        """Process all PDF files through Claude visual workflow"""
        pdf_files = self.find_pdf_files()
        results = []
        
        if not pdf_files:
            self.logger.info("No PDF files found")
            return results
            
        self.logger.info(f"Starting Claude visual processing workflow")
        self.logger.info(f"Input: {self.input_path}")
        self.logger.info(f"Output: {self.output_path}")
        self.logger.info(f"Workflow: PDF → JPEG → Claude Visual Analysis → Organize Original")
        
        for i, file_path in enumerate(pdf_files):
            self.stats['processed'] += 1
            result = self.process_file(file_path)
            results.append(result)
            
            if not result.success:
                self.stats['failed'] += 1
                
            # Progress update
            if (i + 1) % batch_size == 0:
                self.logger.info(f"Progress: {i + 1}/{len(pdf_files)} files processed")
                
        return results
        
    def cleanup(self):
        """Clean up temporary directory"""
        if self.temp_dir.exists():
            shutil.rmtree(self.temp_dir)
            
    def save_report(self, results: List[ProcessingResult]) -> Path:
        """Save processing report"""
        report_data = {
            'timestamp': datetime.now().isoformat(),
            'stats': self.stats,
            'temp_dir': str(self.temp_dir),
            'results': [
                {
                    'original_file': r.original_file,
                    'success': r.success,
                    'metadata': {
                        'piece_name': r.metadata.piece_name if r.metadata else None,
                        'instrument': r.metadata.instrument if r.metadata else None,
                        'part': r.metadata.part if r.metadata else None,
                        'key': r.metadata.key if r.metadata else None,
                        'composer': r.metadata.composer if r.metadata else None,
                    } if r.metadata else None,
                    'final_path': r.final_path,
                    'jpeg_path': r.jpeg_path,
                    'error': r.error,
                    'warnings': r.warnings
                }
                for r in results
            ]
        }
        
        report_path = Path("reports") / f"claude_visual_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_path, 'w') as f:
            json.dump(report_data, f, indent=2)
            
        self.logger.info(f"Report saved to: {report_path}")
        return report_path

def main():
    parser = argparse.ArgumentParser(description='Claude Visual Sheet Music Processor')
    parser.add_argument('input_path', help='Path to input directory with PDFs')
    parser.add_argument('output_path', help='Output directory for organized files')
    parser.add_argument('--single-file', help='Process only this specific filename')
    parser.add_argument('--batch-size', type=int, default=5, help='Batch size for processing')
    
    args = parser.parse_args()
    
    # Create processor
    processor = ClaudeVisualProcessor(args.input_path, args.output_path)
    
    try:
        # Process files
        if args.single_file:
            result = processor.process_single_file(args.single_file)
            results = [result] if result else []
        else:
            results = processor.process_all(args.batch_size)
        
        # Save report
        if results:
            report_path = processor.save_report(results)
            
            # Print summary
            print(f"\n🎵 Claude Visual Sheet Music Processing:")
            print(f"  Total files: {processor.stats['processed']}")
            print(f"  Successful: {processor.stats['successful']}")
            print(f"  Failed: {processor.stats['failed']}")
            print(f"  Organized: {processor.stats['organized']}")
            print(f"  Success rate: {processor.stats['successful']/processor.stats['processed']*100:.1f}%")
            print(f"  Report: {report_path}")
            
            # Show temp directory for Claude analysis
            if processor.temp_dir.exists():
                jpeg_files = list(processor.temp_dir.glob("*.jpg"))
                if jpeg_files:
                    print(f"\n📷 {len(jpeg_files)} JPEG files ready for Claude analysis in:")
                    print(f"  {processor.temp_dir}")
                    print(f"\nNext step: Use Claude's Read tool on JPEG files to extract metadata")
        
    finally:
        # Don't cleanup so Claude can analyze images
        print(f"\nTemp directory preserved for analysis: {processor.temp_dir}")

if __name__ == "__main__":
    main()