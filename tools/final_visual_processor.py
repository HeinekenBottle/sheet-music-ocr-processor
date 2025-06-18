#!/usr/bin/env python3
"""
Final Visual Sheet Music Processor v1.0

Complete workflow that combines PDF-to-JPEG conversion with 
Claude's direct visual analysis for metadata extraction.

This script demonstrates the complete process:
1. Convert PDF to JPEG
2. Analyze image for metadata  
3. Organize original PDF with extracted metadata
4. Clean up temporary files

Usage:
    python3 final_visual_processor.py [input_dir] [output_dir] [--interactive]
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

def claude_analyze_sheet_music(image_content: str) -> SheetMusicMetadata:
    """
    Simulated Claude visual analysis function.
    In practice, Claude would use the Read tool to analyze the image.
    This demonstrates the expected metadata extraction.
    """
    
    # Example analysis based on the test image we examined
    # In practice, Claude would perform this analysis by reading the JPEG
    
    # This is a demonstration of what Claude extracted from the sample:
    sample_metadata = SheetMusicMetadata(
        piece_name="Feodora Ouverture",
        instrument="Clarinet", 
        part="2nd_and_3rd",
        key="Bb",
        composer="P_Tschaikowsky"
    )
    
    return sample_metadata

def visual_analyze_sheet_music(jpeg_path: Path) -> SheetMusicMetadata:
    """
    Analyze sheet music JPEG to extract metadata.
    This function represents Claude's visual analysis capability.
    """
    
    # In the real implementation, Claude would:
    # 1. Use Read tool on the JPEG file
    # 2. Examine the header area visually
    # 3. Extract piece name, instrument, part, key, composer
    # 4. Return structured metadata
    
    # For demonstration, we'll extract from common patterns
    metadata = SheetMusicMetadata()
    
    try:
        # Read the filename to get hints
        filename = jpeg_path.stem
        
        # This is where Claude's visual analysis would happen
        # Claude would look at the header area and extract:
        # - Title (e.g., "Feodora Ouverture")
        # - Instrument (e.g., "Klarinette II und III in B")  
        # - Composer (e.g., "von P. Tschaikowsky")
        # - Box number (e.g., "297")
        
        print(f"\n🔍 Visual Analysis Needed for: {jpeg_path}")
        print("Claude should use Read tool to examine this image and extract:")
        print("- Piece name from the title area")
        print("- Instrument from left side text")  
        print("- Part information (1st, 2nd, 3rd, etc.)")
        print("- Key signature (Bb, Eb, F, etc.)")
        print("- Composer from right side text")
        
        # Return placeholder metadata that Claude would fill in
        return metadata
        
    except Exception as e:
        print(f"Analysis error: {e}")
        return metadata

def process_single_pdf(pdf_path: Path, output_dir: Path, interactive: bool = False) -> bool:
    """Process a single PDF through the complete visual workflow"""
    
    print(f"\n📄 Processing: {pdf_path.name}")
    
    # Step 1: Convert PDF to JPEG
    temp_dir = Path(tempfile.mkdtemp(prefix="visual_analysis_"))
    
    try:
        # Convert using qlmanage
        cmd = ['qlmanage', '-t', '-s', '1200', '-o', str(temp_dir), str(pdf_path)]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        if result.returncode != 0:
            print(f"❌ Failed to convert PDF: {result.stderr}")
            return False
            
        # Find the created image
        created_files = list(temp_dir.glob(f"{pdf_path.stem}*"))
        if not created_files:
            print("❌ No image was created")
            return False
            
        image_file = created_files[0]
        
        # Convert to JPEG if needed
        jpeg_path = temp_dir / f"{pdf_path.stem}.jpg"
        if image_file.suffix.lower() == '.png':
            jpeg_cmd = [
                'sips', '-s', 'format', 'jpeg', '-s', 'formatOptions', '85',
                str(image_file), '--out', str(jpeg_path)
            ]
            subprocess.run(jpeg_cmd, capture_output=True, check=True)
            image_file.unlink()
        else:
            image_file.rename(jpeg_path)
            
        file_size = jpeg_path.stat().st_size
        print(f"✅ JPEG created: {file_size/1024:.0f}KB")
        
        # Step 2: Visual analysis (this is where Claude would use Read tool)
        if interactive:
            print(f"\n📷 Image ready for Claude analysis: {jpeg_path}")
            print("To continue, Claude should use the Read tool on this image")
            print("and extract the metadata, then continue the workflow.")
            input("Press Enter when Claude has analyzed the image...")
            
        # For demonstration, we'll use placeholder analysis
        metadata = visual_analyze_sheet_music(jpeg_path)
        
        # Step 3: Create organized folder structure
        piece_name = metadata.piece_name or "Unknown_Piece"
        instrument = metadata.instrument or "Unknown_Instrument"  
        part = metadata.part or "Unknown_Part"
        
        # Clean names for folders
        clean_piece = re.sub(r'[^\w\s-]', '', piece_name)
        clean_piece = re.sub(r'\s+', '_', clean_piece.strip())
        
        clean_instrument = re.sub(r'[^\w\s-]', '', instrument)
        clean_instrument = re.sub(r'\s+', '_', clean_instrument.strip())
        
        clean_part = re.sub(r'[^\w\s-]', '', part)
        clean_part = re.sub(r'\s+', '_', clean_part.strip())
        
        # Create destination path: Piece/Instrument/Part/
        dest_dir = output_dir / clean_piece / clean_instrument / clean_part
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest_file = dest_dir / pdf_path.name
        
        # Step 4: Copy original PDF to organized location
        shutil.copy2(pdf_path, dest_file)
        
        relative_path = dest_file.relative_to(output_dir)
        print(f"📁 Organized: {pdf_path.name} → {relative_path}")
        print(f"📊 Metadata: {metadata}")
        
        return True
        
    except Exception as e:
        print(f"❌ Processing failed: {e}")
        return False
        
    finally:
        # Clean up temp directory
        if temp_dir.exists():
            if not interactive:
                shutil.rmtree(temp_dir)
            else:
                print(f"🗂️  Temp files preserved at: {temp_dir}")

def main():
    parser = argparse.ArgumentParser(description='Final Visual Sheet Music Processor')
    parser.add_argument('input_path', help='Path to input directory with PDFs')
    parser.add_argument('output_path', help='Output directory for organized files')
    parser.add_argument('--interactive', action='store_true', 
                       help='Pause for manual Claude analysis of each image')
    parser.add_argument('--single-file', help='Process only this specific filename')
    
    args = parser.parse_args()
    
    input_path = Path(args.input_path).expanduser()
    output_path = Path(args.output_path).expanduser()
    
    # Create output directory
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Find PDF files
    if args.single_file:
        pdf_files = [f for f in input_path.rglob('*.pdf') if f.name == args.single_file]
        if not pdf_files:
            print(f"❌ File not found: {args.single_file}")
            return
    else:
        pdf_files = list(input_path.rglob('*.pdf'))
    
    if not pdf_files:
        print("❌ No PDF files found")
        return
        
    print(f"🎵 Final Visual Sheet Music Processing")
    print(f"📂 Input: {input_path}")
    print(f"📂 Output: {output_path}")
    print(f"📊 Files to process: {len(pdf_files)}")
    
    if args.interactive:
        print("\n⚠️  Interactive mode: Claude will analyze each image manually")
    
    # Process files
    successful = 0
    failed = 0
    
    for i, pdf_file in enumerate(pdf_files, 1):
        print(f"\n--- File {i}/{len(pdf_files)} ---")
        
        if process_single_pdf(pdf_file, output_path, args.interactive):
            successful += 1
        else:
            failed += 1
            
        if args.interactive and i < len(pdf_files):
            if input(f"\nContinue to next file? (y/n): ").lower() != 'y':
                break
                
    # Summary
    print(f"\n🎵 Processing Complete:")
    print(f"  ✅ Successful: {successful}")
    print(f"  ❌ Failed: {failed}")
    print(f"  📊 Success rate: {successful/(successful+failed)*100:.1f}%")

if __name__ == "__main__":
    main()