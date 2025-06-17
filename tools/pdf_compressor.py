#!/usr/bin/env python3
"""
PDF Compression Module for OCR Processing
Compresses PDFs to under 1MB for OCR while preserving originals
"""
import os
import sys
import shutil
import tempfile
from pathlib import Path
from typing import Tuple, Optional
import logging

try:
    from pypdf import PdfReader, PdfWriter, Transformation
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False

class PDFCompressor:
    """Handles PDF compression for OCR processing"""
    
    def __init__(self, target_size_mb: float = 0.8):
        """Initialize with target size well under 1MB for safety"""
        self.target_size_bytes = int(target_size_mb * 1024 * 1024)
        self.logger = logging.getLogger(__name__)
        
    def get_file_size(self, file_path: Path) -> int:
        """Get file size in bytes"""
        return file_path.stat().st_size
    
    def needs_compression(self, file_path: Path) -> bool:
        """Check if file needs compression for OCR"""
        return self.get_file_size(file_path) > self.target_size_bytes
    
    def compress_pdf_basic(self, input_path: Path, output_path: Path) -> bool:
        """Basic PDF compression using PyPDF"""
        if not PDF_AVAILABLE:
            self.logger.error("PyPDF not available for compression")
            return False
            
        try:
            reader = PdfReader(input_path)
            writer = PdfWriter()
            
            # Add pages with basic compression
            for page in reader.pages:
                # Remove annotations and form fields to reduce size
                if '/Annots' in page:
                    del page['/Annots']
                if '/AcroForm' in page:
                    del page['/AcroForm']
                
                writer.add_page(page)
            
            # Apply compression
            writer.compress_identical_objects()
            
            # Write compressed version
            with open(output_path, 'wb') as output_file:
                writer.write(output_file)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Basic compression failed: {e}")
            return False
    
    def compress_pdf_aggressive(self, input_path: Path, output_path: Path) -> bool:
        """Aggressive compression with quality reduction"""
        if not PDF_AVAILABLE:
            return False
            
        try:
            reader = PdfReader(input_path)
            writer = PdfWriter()
            
            # Scale down pages if needed
            scale_factor = 0.75  # Reduce to 75% size
            
            for page in reader.pages:
                # Remove unnecessary elements
                if '/Annots' in page:
                    del page['/Annots']
                if '/AcroForm' in page:
                    del page['/AcroForm']
                
                # Scale down the page
                transformation = Transformation().scale(sx=scale_factor, sy=scale_factor)
                page.add_transformation(transformation)
                
                writer.add_page(page)
            
            # Apply all compression options
            writer.compress_identical_objects()
            for page in writer.pages:
                page.compress_content_streams()
            
            with open(output_path, 'wb') as output_file:
                writer.write(output_file)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Aggressive compression failed: {e}")
            return False
    
    def create_compressed_copy(self, original_path: Path) -> Optional[Path]:
        """Create a compressed temporary copy for OCR processing"""
        if not self.needs_compression(original_path):
            self.logger.info(f"{original_path.name} already under size limit")
            return original_path
        
        # Create temporary file
        temp_dir = Path(tempfile.gettempdir()) / "sheet_music_compression"
        temp_dir.mkdir(exist_ok=True)
        
        temp_file = temp_dir / f"compressed_{original_path.name}"
        
        original_size = self.get_file_size(original_path)
        self.logger.info(f"Compressing {original_path.name} ({original_size/1024/1024:.1f}MB)")
        
        # Try basic compression first
        if self.compress_pdf_basic(original_path, temp_file):
            new_size = self.get_file_size(temp_file)
            self.logger.info(f"Basic compression: {new_size/1024/1024:.1f}MB")
            
            if new_size <= self.target_size_bytes:
                return temp_file
        
        # If basic compression wasn't enough, try aggressive
        self.logger.info("Trying aggressive compression...")
        if self.compress_pdf_aggressive(original_path, temp_file):
            new_size = self.get_file_size(temp_file)
            self.logger.info(f"Aggressive compression: {new_size/1024/1024:.1f}MB")
            
            if new_size <= self.target_size_bytes:
                return temp_file
        
        # If still too large, create a single-page sample
        try:
            self.logger.info("Creating single-page sample for OCR...")
            reader = PdfReader(original_path)
            writer = PdfWriter()
            
            # Just take the first page
            if len(reader.pages) > 0:
                page = reader.pages[0]
                
                # Remove annotations and scale down more aggressively
                if '/Annots' in page:
                    del page['/Annots']
                
                # More aggressive scaling for OCR
                transformation = Transformation().scale(sx=0.4, sy=0.4)
                page.add_transformation(transformation)
                
                writer.add_page(page)
                writer.compress_identical_objects()
                
                with open(temp_file, 'wb') as output_file:
                    writer.write(output_file)
                
                final_size = self.get_file_size(temp_file)
                self.logger.info(f"Single-page sample: {final_size/1024/1024:.1f}MB")
                return temp_file
                
        except Exception as e:
            self.logger.error(f"Single-page sample creation failed: {e}")
        
        # Cleanup failed attempt
        if temp_file.exists():
            temp_file.unlink()
        
        self.logger.warning(f"Could not compress {original_path.name} sufficiently")
        return None
    
    def cleanup_temp_file(self, temp_path: Path):
        """Clean up temporary compressed file"""
        if temp_path and temp_path.exists():
            try:
                # Only delete if it's in our temp directory
                if "sheet_music_compression" in str(temp_path):
                    temp_path.unlink()
                    self.logger.debug(f"Cleaned up temporary file: {temp_path.name}")
            except Exception as e:
                self.logger.warning(f"Could not clean up {temp_path}: {e}")
    
    def cleanup_temp_directory(self):
        """Clean up entire temporary compression directory"""
        temp_dir = Path(tempfile.gettempdir()) / "sheet_music_compression"
        if temp_dir.exists():
            try:
                shutil.rmtree(temp_dir)
                self.logger.info("Cleaned up compression temp directory")
            except Exception as e:
                self.logger.warning(f"Could not clean up temp directory: {e}")

def main():
    """Test compression functionality"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Test PDF compression")
    parser.add_argument('input_file', help='Input PDF file')
    parser.add_argument('--target-size', type=float, default=0.9, help='Target size in MB')
    
    args = parser.parse_args()
    
    logging.basicConfig(level=logging.INFO)
    
    compressor = PDFCompressor(target_size_mb=args.target_size)
    input_path = Path(args.input_file)
    
    if not input_path.exists():
        print(f"File not found: {input_path}")
        sys.exit(1)
    
    original_size = compressor.get_file_size(input_path)
    print(f"Original size: {original_size/1024/1024:.1f}MB")
    
    compressed_path = compressor.create_compressed_copy(input_path)
    
    if compressed_path:
        compressed_size = compressor.get_file_size(compressed_path)
        print(f"Compressed size: {compressed_size/1024/1024:.1f}MB")
        print(f"Compression ratio: {compressed_size/original_size*100:.1f}%")
        print(f"Compressed file: {compressed_path}")
    else:
        print("Compression failed")

if __name__ == "__main__":
    main()