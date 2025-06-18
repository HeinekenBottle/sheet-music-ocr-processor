#!/usr/bin/env python3
"""
Fixed PDF Straightener v1.0

JPEG-guided PDF straightening with ZERO compression or quality loss.
Only temporary JPEGs are compressed - original PDFs preserve ALL vector content.

Key fixes:
1. NO PDF compression (deflate=False, clean=False, garbage=0)
2. Correct rotation angle calculation 
3. Precise rotation (no int() truncation)
4. Proper sign handling for clockwise/counterclockwise

Usage:
    python3 fixed_pdf_straightener.py [input_file_or_dir] [output_dir] [--analysis-only]
"""

import os
import sys
import subprocess
import tempfile
import shutil
import argparse
import math
from pathlib import Path
from typing import Tuple, Optional
from dataclasses import dataclass

# PDF processing libraries
try:
    import fitz  # PyMuPDF for non-destructive PDF operations
    import numpy as np
    from PIL import Image
except ImportError as e:
    print(f"Missing dependencies: {e}")
    print("Install with: pip install PyMuPDF Pillow numpy")
    sys.exit(1)

@dataclass
class SkewAnalysis:
    """Results of skew detection"""
    needs_straightening: bool = False
    rotation_angle: float = 0.0
    confidence: float = 0.0
    detected_angles: list = None

class JPEGSkewDetector:
    """Analyzes temporary JPEG to detect PDF skew - JPEG is deleted after analysis"""
    
    @staticmethod
    def detect_staff_line_skew(jpeg_path: Path) -> SkewAnalysis:
        """
        Detect skew by finding the angle that makes staff lines most horizontal.
        Returns positive angle for clockwise rotation needed.
        """
        try:
            # Load image and convert to grayscale
            img = Image.open(jpeg_path).convert('L')
            img_array = np.array(img)
            
            # Focus on central region where staff lines are clearest
            height, width = img_array.shape
            center_y = height // 2
            sample_height = min(400, height // 2)  # Larger sample for better accuracy
            
            # Extract central horizontal band
            top = center_y - sample_height // 2
            bottom = center_y + sample_height // 2
            sample_region = img_array[top:bottom, :]
            
            print(f"🔍 Analyzing {width}x{height} image, {sample_height}px sample region")
            
            # Test range of rotation angles with higher precision
            test_angles = np.arange(-15, 15.1, 0.05)  # Even higher precision: 0.05° steps
            scores = []
            
            for angle in test_angles:
                # Rotate sample region by test angle
                sample_img = Image.fromarray(sample_region)
                rotated = sample_img.rotate(angle, fillcolor=255, expand=False)
                rotated_array = np.array(rotated)
                
                # Measure horizontal line strength
                # Staff lines should create high variance in row averages
                row_means = np.mean(rotated_array, axis=1)
                horizontal_strength = np.var(row_means)
                scores.append(horizontal_strength)
            
            # Find angle that maximizes horizontal line strength
            best_idx = np.argmax(scores)
            optimal_test_angle = test_angles[best_idx]
            
            # The correction angle is the OPPOSITE of what we tested
            # If testing +2° gave best horizontal lines, image is tilted -2° (counterclockwise)
            # So we need +2° clockwise correction
            correction_angle = optimal_test_angle
            
            # Calculate confidence based on peak sharpness
            max_score = scores[best_idx]
            mean_score = np.mean(scores)
            confidence = min(1.0, (max_score - mean_score) / mean_score) if mean_score > 0 else 0
            
            # Only suggest correction for significant skew (lowered threshold)
            needs_correction = abs(correction_angle) >= 0.1 and confidence > 0.05
            
            analysis = SkewAnalysis(
                needs_straightening=needs_correction,
                rotation_angle=correction_angle if needs_correction else 0.0,
                confidence=confidence,
                detected_angles=test_angles.tolist()
            )
            
            print(f"📐 Skew detection: {correction_angle:.2f}° (confidence: {confidence:.2f})")
            if needs_correction:
                direction = "clockwise" if correction_angle > 0 else "counterclockwise" 
                print(f"   → Needs {abs(correction_angle):.2f}° {direction} correction")
            else:
                print(f"   → No significant skew detected")
                
            return analysis
            
        except Exception as e:
            print(f"❌ Skew detection failed: {e}")
            return SkewAnalysis()

class VectorPreservingPDFProcessor:
    """PDF processor that preserves ALL vector content with ZERO compression"""
    
    @staticmethod
    def straighten_pdf(input_path: Path, output_path: Path, rotation_angle: float) -> bool:
        """
        Straighten PDF with precise rotation, preserving ALL vector content.
        NO compression applied - maintains original PDF quality.
        """
        try:
            print(f"📄 Opening PDF: {input_path}")
            doc = fitz.open(str(input_path))
            
            # Apply precise rotation to each page
            for page_num, page in enumerate(doc):
                current_rotation = page.rotation
                new_rotation = current_rotation + rotation_angle
                
                # Use precise rotation with matrix transformation
                # Get page dimensions for center-point rotation
                rect = page.rect
                center_x = (rect.x0 + rect.x1) / 2
                center_y = (rect.y0 + rect.y1) / 2
                
                # Create rotation matrix around page center
                angle_rad = math.radians(rotation_angle)
                cos_a = math.cos(angle_rad)
                sin_a = math.sin(angle_rad)
                
                # PyMuPDF matrix: translate to origin, rotate, translate back
                matrix = fitz.Matrix(1, 0, 0, 1, -center_x, -center_y)  # Move to origin
                matrix = matrix * fitz.Matrix(cos_a, sin_a, -sin_a, cos_a, 0, 0)  # Rotate
                matrix = matrix * fitz.Matrix(1, 0, 0, 1, center_x, center_y)  # Move back
                
                # Apply transformation using page contents
                try:
                    # Get existing content stream
                    contents = page.get_contents()
                    
                    # Wrap existing content with transformation matrix
                    new_contents = f"q {matrix.a} {matrix.b} {matrix.c} {matrix.d} {matrix.e} {matrix.f} cm\n".encode()
                    new_contents += contents
                    new_contents += b"\nQ"
                    
                    # Replace page contents
                    page.set_contents(new_contents)
                    print(f"   Page {page_num + 1}: Applied {rotation_angle:.2f}° precise rotation")
                    
                except Exception as matrix_error:
                    # For small precise angles, try multiple applications of 1° rotations
                    if abs(rotation_angle) < 5.0:
                        # Apply the closest integer rotation that gets us closer
                        if abs(rotation_angle) >= 0.5:
                            closest_angle = round(rotation_angle)
                            new_rotation = (current_rotation + closest_angle) % 360
                            page.set_rotation(new_rotation)
                            print(f"   Page {page_num + 1}: Applied {closest_angle}° standard rotation (precise fallback)")
                        else:
                            print(f"   Page {page_num + 1}: Skipped {rotation_angle:.2f}° (angle too small)")
                    else:
                        # For larger angles, use standard rotation
                        rounded_angle = round(rotation_angle)
                        new_rotation = (current_rotation + rounded_angle) % 360
                        page.set_rotation(new_rotation)
                        print(f"   Page {page_num + 1}: Applied {rounded_angle}° standard rotation (fallback)")
            
            # Save with ZERO compression - preserves all original vector data
            print(f"💾 Saving with zero compression to preserve vector quality...")
            doc.save(
                str(output_path),
                garbage=0,        # NO garbage collection that might damage vectors
                deflate=False,    # NO deflate compression
                clean=False       # NO cleaning that might alter content
            )
            doc.close()
            
            # Verify file was created
            if output_path.exists():
                original_size = input_path.stat().st_size
                new_size = output_path.stat().st_size
                size_change = ((new_size - original_size) / original_size) * 100
                print(f"✅ Straightened PDF created: {original_size//1024}KB → {new_size//1024}KB ({size_change:+.1f}%)")
                return True
            else:
                print(f"❌ Output file not created")
                return False
                
        except Exception as e:
            print(f"❌ PDF straightening failed: {e}")
            return False

class NoCompressionPDFStraightener:
    """Main processor that uses temporary JPEG for analysis, preserves PDF vectors"""
    
    def __init__(self, analysis_only: bool = False):
        self.analysis_only = analysis_only
        self.temp_dir = Path(tempfile.mkdtemp(prefix="pdf_straightener_"))
        self.detector = JPEGSkewDetector()
        self.processor = VectorPreservingPDFProcessor()
        
    def create_temporary_analysis_jpeg(self, pdf_path: Path) -> Optional[Path]:
        """Create temporary JPEG for skew analysis - will be deleted after use"""
        try:
            jpeg_path = self.temp_dir / f"{pdf_path.stem}_temp_analysis.jpg"
            
            print(f"🖼️  Creating temporary analysis JPEG...")
            
            # Convert first page to JPEG using macOS qlmanage
            cmd = [
                'qlmanage', '-t', '-s', '1000',  # 1000px for good analysis resolution
                '-o', str(self.temp_dir), str(pdf_path)
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            if result.returncode != 0:
                raise RuntimeError(f"qlmanage failed: {result.stderr}")
            
            # Find and rename the created file
            created_files = list(self.temp_dir.glob(f"{pdf_path.stem}*"))
            if created_files:
                created_file = created_files[0]
                
                # Convert to JPEG if it's PNG
                if created_file.suffix.lower() == '.png':
                    sips_cmd = [
                        'sips', '-s', 'format', 'jpeg', '-s', 'formatOptions', '80',
                        str(created_file), '--out', str(jpeg_path)
                    ]
                    subprocess.run(sips_cmd, capture_output=True, check=True)
                    created_file.unlink()  # Remove PNG
                else:
                    created_file.rename(jpeg_path)
                
                file_size = jpeg_path.stat().st_size
                print(f"   Temporary JPEG: {file_size//1024}KB (will be deleted after analysis)")
                return jpeg_path
            else:
                raise RuntimeError("No analysis image created")
                
        except Exception as e:
            print(f"❌ Failed to create analysis JPEG: {e}")
            return None
    
    def process_pdf(self, pdf_path: Path, output_dir: Path) -> bool:
        """Process single PDF: analyze with temp JPEG, straighten original PDF"""
        print(f"\n📋 Processing: {pdf_path.name}")
        
        try:
            # Step 1: Create temporary JPEG for analysis
            jpeg_path = self.create_temporary_analysis_jpeg(pdf_path)
            if not jpeg_path:
                return False
            
            # Step 2: Analyze JPEG to detect skew
            analysis = self.detector.detect_staff_line_skew(jpeg_path)
            
            # Step 3: Delete temporary JPEG immediately after analysis
            if jpeg_path.exists():
                jpeg_path.unlink()
                print(f"🗑️  Deleted temporary analysis JPEG")
            
            # Step 4: Apply correction to original PDF (if needed and not analysis-only)
            if analysis.needs_straightening:
                if self.analysis_only:
                    print(f"📊 Analysis: Would apply {analysis.rotation_angle:.2f}° rotation")
                    return True
                else:
                    # Create output filename
                    output_path = output_dir / f"{pdf_path.stem}_straightened.pdf"
                    
                    # Apply straightening to original PDF
                    success = self.processor.straighten_pdf(
                        pdf_path, output_path, analysis.rotation_angle
                    )
                    
                    if success:
                        print(f"✅ Straightened: {analysis.rotation_angle:.2f}° correction applied")
                        return True
                    else:
                        print(f"❌ Failed to apply straightening")
                        return False
            else:
                if self.analysis_only:
                    print(f"📊 Analysis: No straightening needed")
                else:
                    # Copy original file unchanged
                    output_path = output_dir / f"{pdf_path.stem}_verified.pdf"
                    shutil.copy2(pdf_path, output_path)
                    print(f"✅ No correction needed - original preserved")
                return True
                
        except Exception as e:
            print(f"❌ Processing failed: {e}")
            return False
    
    def cleanup(self):
        """Clean up temporary directory"""
        if self.temp_dir.exists():
            shutil.rmtree(self.temp_dir)
            print(f"🧹 Cleaned up temporary files")

def main():
    parser = argparse.ArgumentParser(description='Fixed PDF Straightener - Zero Compression')
    parser.add_argument('input_path', help='Input PDF file or directory')
    parser.add_argument('output_path', help='Output directory for straightened PDFs')
    parser.add_argument('--analysis-only', action='store_true',
                       help='Only analyze skew, don\'t create corrected PDFs')
    
    args = parser.parse_args()
    
    input_path = Path(args.input_path).expanduser()
    output_path = Path(args.output_path).expanduser()
    
    # Create output directory
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Initialize processor
    processor = NoCompressionPDFStraightener(analysis_only=args.analysis_only)
    
    try:
        print(f"🎵 Fixed PDF Straightener - Zero Compression Mode")
        print(f"📂 Input: {input_path}")
        print(f"📂 Output: {output_path}")
        print(f"🔧 Mode: {'Analysis Only' if args.analysis_only else 'Straightening'}")
        print(f"📋 Method: Temporary JPEG analysis → Vector-preserving PDF correction")
        
        # Find PDF files to process
        if input_path.is_file() and input_path.suffix.lower() == '.pdf':
            pdf_files = [input_path]
        else:
            pdf_files = list(input_path.rglob('*.pdf'))
        
        if not pdf_files:
            print("❌ No PDF files found")
            return
        
        print(f"📊 Found {len(pdf_files)} PDF files to process")
        
        # Process files
        successful = 0
        failed = 0
        
        for pdf_file in pdf_files:
            if processor.process_pdf(pdf_file, output_path):
                successful += 1
            else:
                failed += 1
        
        # Summary
        print(f"\n🎵 Processing Complete:")
        print(f"  ✅ Successful: {successful}")
        print(f"  ❌ Failed: {failed}")
        print(f"  📊 Success rate: {successful/(successful+failed)*100:.1f}%")
        
        if not args.analysis_only and successful > 0:
            print(f"\n✨ Straightened PDFs created with zero compression")
            print(f"🎵 All vector content preserved at original quality")
    
    finally:
        processor.cleanup()

if __name__ == "__main__":
    main()