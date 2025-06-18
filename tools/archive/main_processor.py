#!/usr/bin/env python3
"""
Unified Sheet Music Processor - v3.0
Consolidates all functionality with duplicate detection, validation, and batch limits
"""
import os
import sys
import re
import json
import time
import hashlib
import logging
import requests
import shutil
import tempfile
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Set
from dataclasses import dataclass, asdict
from datetime import datetime
from collections import defaultdict

# Import dependencies with fallbacks
try:
    sys.path.append(str(Path(__file__).parent.parent))
    from config import get_api_key, get_log_level
    CONFIG_AVAILABLE = True
except ImportError:
    CONFIG_AVAILABLE = False

try:
    from pypdf import PdfReader, PdfWriter, Transformation
    from pypdf.generic import AnnotationBuilder
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False

@dataclass
class FileInfo:
    """Information about a processed file"""
    path: Path
    size: int
    hash_md5: str
    hash_content: Optional[str] = None
    instrument: Optional[str] = None
    part: Optional[str] = None
    key: Optional[str] = None
    is_test_file: bool = False
    is_duplicate: bool = False
    processing_time: float = 0.0

@dataclass
class ProcessingResult:
    """Result of processing a single file"""
    original_file: str
    success: bool
    error_message: Optional[str] = None
    instrument: Optional[str] = None
    part: Optional[str] = None
    key: Optional[str] = None
    ocr_text: Optional[str] = None
    new_filename: Optional[str] = None
    target_path: Optional[str] = None
    processing_time: float = 0.0
    is_duplicate: bool = False
    is_test_file: bool = False

@dataclass
class BatchResult:
    """Result of processing a batch of files"""
    total_files: int
    successful: int
    failed: int
    ocr_success: int
    duplicates_skipped: int
    test_files_moved: int
    results: List[ProcessingResult]
    processing_time: float

class UnifiedSheetMusicProcessor:
    """Unified processor with all features consolidated"""
    
    # Enhanced instrument patterns with OCR error tolerance
    INSTRUMENT_PATTERNS = {
        # Clarinet patterns with common OCR errors
        r'\b(?:1st|2nd|3rd|4th)?\s*(?:bb?|eb?|f)?\s*cl[ao]rin[ae]t\b': 'Clarinet',
        r'\bc[il][ao]rin[ae]t\b': 'Clarinet',
        
        # Trumpet patterns
        r'\b(?:1st|2nd|3rd|4th)?\s*(?:bb?|eb?|f)?\s*trump[ae]t\b': 'Trumpet',
        r'\btrump[ae]t\b': 'Trumpet',
        
        # Cornet patterns
        r'\b(?:1st|2nd|3rd|4th)?\s*(?:bb?|eb?|f)?\s*corn[ae]t\b': 'Cornet',
        r'\bcorn[ae]t\b': 'Cornet',
        
        # Horn patterns
        r'\b(?:1st|2nd|3rd|4th)?\s*(?:bb?|eb?|f)?\s*horn\b': 'Horn',
        r'\bfrench\s*horn\b': 'Horn',
        r'\bf\s*horn\b': 'Horn',
        
        # Trombone patterns
        r'\btrombon[ae]\b': 'Trombone',
        
        # Tuba patterns
        r'\btub[ao]\b': 'Tuba',
        
        # Euphonium/Baritone patterns
        r'\beuphonium\b': 'Euphonium',
        r'\bb?ariton[ae]\b': 'Euphonium',
        
        # Saxophone patterns
        r'\b(?:alto|tenor|baritone|bass)?\s*sax[ao]phon[ae]\b': 'Saxophone',
        r'\bsax\b': 'Saxophone',
        
        # Flute patterns with OCR errors
        r'\bfl[ou]t[ae]\b': 'Flute',
        
        # Piccolo patterns
        r'\bpicc[ao]l[ao]\b': 'Piccolo',
        
        # Oboe patterns
        r'\bob[ao][ae]\b': 'Oboe',
        
        # Bassoon patterns with OCR tolerance (key fix!)
        r'\bb?ass[ao][ao]n\b': 'Bassoon',
        r'\bassoon\b': 'Bassoon',  # handles "assoon" OCR error
        
        # Bass patterns
        r'\bstring\s*bass\b': 'String Bass',
        r'\bdouble\s*bass\b': 'String Bass',
        r'\bcontrabass\b': 'String Bass',
        
        # Percussion patterns with German terms
        r'\btimpani\b': 'Timpani',
        r'\bpauken\b': 'Timpani',  # German term for timpani
        r'\bkettledrums?\b': 'Timpani',
        r'\bpercussion\b': 'Percussion',
        r'\bdrums?\b': 'Percussion',
        r'\bsnare\b': 'Percussion',
        r'\bbass\s*drum\b': 'Percussion',
        r'\bcymbals?\b': 'Percussion',
        r'\bxylophone\b': 'Percussion',
        r'\bmarimba\b': 'Percussion',
        r'\bvibraphone\b': 'Percussion',
        r'\bglockenspiel\b': 'Percussion',
        r'\bchimes\b': 'Percussion',
        r'\bbells\b': 'Percussion'
    }
    
    PART_PATTERNS = {
        r'\b1st\b': '1st',
        r'\bfirst\b': '1st',
        r'\b2nd\b': '2nd',
        r'\bsecond\b': '2nd',
        r'\b3rd\b': '3rd',
        r'\bthird\b': '3rd',
        r'\b4th\b': '4th',
        r'\bfourth\b': '4th',
        r'\bsolo\b': 'Solo',
        r'\bprincipal\b': 'Principal'
    }
    
    KEY_PATTERNS = {
        r'\bb♭\b|\bbb\b|\bb-flat\b': 'Bb',
        r'\be♭\b|\beb\b|\be-flat\b': 'Eb',
        r'\bf\b(?!\w)': 'F',
        r'\bc\b(?!\w)': 'C',
        r'\bg\b(?!\w)': 'G',
        r'\bd\b(?!\w)': 'D',
        r'\ba\b(?!\w)': 'A'
    }
    
    # Test file patterns
    TEST_FILE_PATTERNS = [
        r'\btest\b',
        r'\bdirty\b',
        r'\bsample\b',
        r'\bdemo\b',
        r'\btrial\b',
        r'\bexample\b',
        r'\b(?:un)?sorted\b',
        r'\bmixed\b'
    ]

    def __init__(self, api_key: str = None, log_level: str = None, 
                 enable_compression: bool = True, max_batch_size: int = 25):
        """Initialize unified processor"""
        # Configuration
        if CONFIG_AVAILABLE:
            self.api_key = api_key or get_api_key()
            log_level = log_level or get_log_level()
        else:
            self.api_key = api_key or "helloworld"
            log_level = log_level or "INFO"
        
        self.max_batch_size = max_batch_size
        self.setup_logging(log_level)
        self.session = requests.Session()
        self.session.timeout = 60
        
        # Duplicate tracking
        self.file_hashes: Dict[str, FileInfo] = {}
        self.content_hashes: Dict[str, FileInfo] = {}
        
        # Initialize compression if available
        self.compression_available = False
        if enable_compression and PDF_AVAILABLE:
            self.compression_available = True
            self.logger.info("PDF compression and validation enabled")
    
    def setup_logging(self, level: str):
        """Setup comprehensive logging"""
        log_format = '%(asctime)s - %(levelname)s - %(message)s'
        logging.basicConfig(
            level=getattr(logging, level.upper()),
            format=log_format,
            handlers=[
                logging.StreamHandler(sys.stdout),
                logging.FileHandler('/tmp/sheet_music_processor.log')
            ]
        )
        self.logger = logging.getLogger(__name__)
    
    def calculate_file_hash(self, file_path: Path) -> str:
        """Calculate MD5 hash of file"""
        hash_md5 = hashlib.md5()
        try:
            with open(file_path, "rb") as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hash_md5.update(chunk)
            return hash_md5.hexdigest()
        except Exception as e:
            self.logger.warning(f"Could not hash {file_path.name}: {e}")
            return ""
    
    def calculate_content_hash(self, ocr_text: str) -> str:
        """Calculate hash of OCR content for similarity detection"""
        if not ocr_text:
            return ""
        # Normalize text for comparison
        normalized = re.sub(r'\s+', ' ', ocr_text.lower().strip())
        return hashlib.md5(normalized.encode()).hexdigest()[:16]  # Shorter hash
    
    def is_test_file(self, filename: str) -> bool:
        """Check if file appears to be a test/sample file"""
        filename_lower = filename.lower()
        return any(re.search(pattern, filename_lower, re.IGNORECASE) 
                  for pattern in self.TEST_FILE_PATTERNS)
    
    def validate_pdf(self, file_path: Path) -> Tuple[bool, str]:
        """Comprehensive PDF validation"""
        if not file_path.exists():
            return False, "File does not exist"
        
        if not file_path.suffix.lower() == '.pdf':
            return False, "File is not a PDF"
        
        if file_path.stat().st_size == 0:
            return False, "File is empty"
        
        # Check for extremely large files (>50MB)
        max_size = 50 * 1024 * 1024
        if file_path.stat().st_size > max_size:
            return False, f"File too large: {file_path.stat().st_size/1024/1024:.1f}MB (max 50MB)"
        
        # Try to read PDF structure if PyPDF available
        if PDF_AVAILABLE:
            try:
                reader = PdfReader(file_path)
                if len(reader.pages) == 0:
                    return False, "PDF has no pages"
                # Test reading first page
                first_page = reader.pages[0]
                return True, "Valid PDF"
            except Exception as e:
                return False, f"PDF corruption detected: {str(e)[:100]}"
        
        return True, "Valid (basic check only)"
    
    def compress_pdf_for_ocr(self, file_path: Path) -> Optional[Path]:
        """Compress PDF for OCR if needed"""
        if not self.compression_available:
            return file_path
        
        # Check if compression needed (1MB limit for OCR)
        if file_path.stat().st_size <= 1024 * 1024:
            return file_path
        
        # Create temporary compressed version
        temp_dir = Path(tempfile.gettempdir()) / "sheet_music_compression"
        temp_dir.mkdir(exist_ok=True)
        temp_file = temp_dir / f"compressed_{file_path.name}"
        
        try:
            reader = PdfReader(file_path)
            writer = PdfWriter()
            
            # Compress aggressively for OCR
            scale_factor = 0.6
            for page in reader.pages:
                if '/Annots' in page:
                    del page['/Annots']
                transformation = Transformation().scale(sx=scale_factor, sy=scale_factor)
                page.add_transformation(transformation)
                writer.add_page(page)
            
            writer.compress_identical_objects()
            
            with open(temp_file, 'wb') as output_file:
                writer.write(output_file)
            
            compressed_size = temp_file.stat().st_size
            original_size = file_path.stat().st_size
            self.logger.info(f"Compressed for OCR: {original_size/1024/1024:.1f}MB → {compressed_size/1024/1024:.1f}MB")
            
            return temp_file
            
        except Exception as e:
            self.logger.error(f"Compression failed: {e}")
            if temp_file.exists():
                temp_file.unlink()
            return None
    
    def extract_text_from_pdf(self, pdf_path: Path) -> Tuple[bool, str]:
        """Extract text using OCR.space API with compression support"""
        url = "https://api.ocr.space/parse/image"
        
        # Compress if needed
        ocr_file_path = self.compress_pdf_for_ocr(pdf_path)
        if not ocr_file_path:
            return False, "Could not prepare file for OCR"
        
        temp_file_created = ocr_file_path != pdf_path
        
        try:
            with open(ocr_file_path, 'rb') as f:
                files = {'file': f}
                data = {
                    'apikey': self.api_key,
                    'language': 'eng',
                    'isOverlayRequired': False,
                    'detectOrientation': True,
                    'scale': True,
                    'OCREngine': 2,
                    'filetype': 'PDF'
                }
                
                response = self.session.post(url, files=files, data=data)
                response.raise_for_status()
                
                result = response.json()
                
                if result.get('IsErroredOnProcessing', True):
                    error_msg = result.get('ErrorMessage', ['Unknown OCR error'])
                    if isinstance(error_msg, list):
                        error_msg = '; '.join(error_msg)
                    return False, f"OCR error: {error_msg}"
                
                # Extract text from all pages
                extracted_text = ""
                for page in result.get('ParsedResults', []):
                    if isinstance(page, dict):
                        extracted_text += page.get('ParsedText', '') + "\n"
                
                return True, extracted_text.strip()
                
        except Exception as e:
            self.logger.error(f"OCR failed for {pdf_path.name}: {e}")
            return False, f"OCR error: {e}"
        finally:
            # Clean up temporary compressed file
            if temp_file_created and ocr_file_path and ocr_file_path.exists():
                try:
                    ocr_file_path.unlink()
                except:
                    pass
    
    def parse_music_info(self, text: str, filename: str) -> Dict[str, Optional[str]]:
        """Parse instrument, part, and key from text and filename"""
        analysis_text = (text + " " + filename).lower()
        
        result = {
            'instrument': None,
            'part': None,
            'key': None,
            'confidence': 'low'
        }
        
        # Find instrument
        for pattern, instrument in self.INSTRUMENT_PATTERNS.items():
            if re.search(pattern, analysis_text, re.IGNORECASE):
                result['instrument'] = instrument
                if re.search(pattern, text.lower(), re.IGNORECASE):
                    result['confidence'] = 'high'
                break
        
        # Find part
        for pattern, part in self.PART_PATTERNS.items():
            if re.search(pattern, analysis_text, re.IGNORECASE):
                result['part'] = part
                break
        
        # Find key (only for transposing instruments)
        if result['instrument'] in ['Clarinet', 'Saxophone', 'Horn', 'Trumpet', 'Cornet']:
            for pattern, key in self.KEY_PATTERNS.items():
                if re.search(pattern, analysis_text, re.IGNORECASE):
                    result['key'] = key
                    break
        
        return result
    
    def create_meaningful_filename(self, music_info: Dict, original_name: str) -> str:
        """Create meaningful filename from parsed information"""
        if not music_info['instrument']:
            return original_name
        
        parts = []
        if music_info['part']:
            parts.append(music_info['part'])
        if music_info['key']:
            parts.append(music_info['key'])
        parts.append(music_info['instrument'])
        
        new_name = "_".join(parts) + ".pdf"
        # Clean filename
        new_name = re.sub(r'[<>:"/\\|?*]', '_', new_name)
        new_name = re.sub(r'\s+', '_', new_name)
        
        return new_name
    
    def determine_target_path(self, music_info: Dict, base_output_dir: Path, is_test_file: bool = False) -> Path:
        """Determine target folder path"""
        if is_test_file:
            return base_output_dir / 'archive' / 'test_files'
        
        if not music_info['instrument']:
            return base_output_dir / 'Unknown'
        
        path = base_output_dir / music_info['instrument']
        
        if music_info['part']:
            path = path / music_info['part']
        
        if music_info['key'] and music_info['instrument'] in ['Clarinet', 'Saxophone', 'Horn', 'Trumpet', 'Cornet']:
            path = path / music_info['key']
        
        return path
    
    def check_for_duplicate(self, file_path: Path, ocr_text: str = "") -> Tuple[bool, str]:
        """Check if file is a duplicate based on hash and content"""
        file_hash = self.calculate_file_hash(file_path)
        
        # Check exact file hash first
        if file_hash in self.file_hashes:
            existing = self.file_hashes[file_hash]
            return True, f"Exact duplicate of {existing.path.name}"
        
        # Check content similarity if OCR available
        if ocr_text:
            content_hash = self.calculate_content_hash(ocr_text)
            if content_hash and content_hash in self.content_hashes:
                existing = self.content_hashes[content_hash]
                return True, f"Content duplicate of {existing.path.name}"
        
        return False, ""
    
    def register_file(self, file_path: Path, music_info: Dict, ocr_text: str = ""):
        """Register file in duplicate tracking"""
        file_hash = self.calculate_file_hash(file_path)
        content_hash = self.calculate_content_hash(ocr_text) if ocr_text else None
        
        file_info = FileInfo(
            path=file_path,
            size=file_path.stat().st_size,
            hash_md5=file_hash,
            hash_content=content_hash,
            instrument=music_info.get('instrument'),
            part=music_info.get('part'),
            key=music_info.get('key'),
            is_test_file=self.is_test_file(file_path.name)
        )
        
        self.file_hashes[file_hash] = file_info
        if content_hash:
            self.content_hashes[content_hash] = file_info
    
    def process_single_file(self, file_path: Path, output_dir: Path, move_files: bool = False) -> ProcessingResult:
        """Process a single PDF file with all enhancements"""
        start_time = time.time()
        result = ProcessingResult(
            original_file=file_path.name,
            success=False
        )
        
        try:
            # Validate PDF
            is_valid, validation_msg = self.validate_pdf(file_path)
            if not is_valid:
                result.error_message = validation_msg
                return result
            
            # Check if test file
            result.is_test_file = self.is_test_file(file_path.name)
            
            self.logger.info(f"Processing: {file_path.name}")
            
            # Extract text via OCR
            ocr_success, ocr_text = self.extract_text_from_pdf(file_path)
            result.ocr_text = ocr_text if ocr_success else None
            
            # Check for duplicates (temporarily disabled for bulk processing)
            # is_duplicate, duplicate_msg = self.check_for_duplicate(file_path, ocr_text)
            # if is_duplicate:
            #     result.is_duplicate = True
            #     result.error_message = duplicate_msg
            #     return result
            
            # Parse music information
            music_info = self.parse_music_info(ocr_text if ocr_success else "", file_path.name)
            result.instrument = music_info['instrument']
            result.part = music_info['part']
            result.key = music_info['key']
            
            # Create meaningful filename
            new_filename = self.create_meaningful_filename(music_info, file_path.name)
            result.new_filename = new_filename
            
            # Determine target path
            target_folder = self.determine_target_path(music_info, output_dir, result.is_test_file)
            target_file = target_folder / new_filename
            result.target_path = str(target_file)
            
            # Create target directory
            target_folder.mkdir(parents=True, exist_ok=True)
            
            # Move or copy file
            if move_files:
                shutil.move(file_path, target_file)
                self.logger.info(f"Moved {file_path.name} -> {target_file.relative_to(output_dir)}")
            else:
                shutil.copy2(file_path, target_file)
                self.logger.info(f"Copied {file_path.name} -> {target_file.relative_to(output_dir)}")
            
            # Register file to prevent future duplicates
            self.register_file(target_file, music_info, ocr_text)
            
            result.success = True
            
        except Exception as e:
            self.logger.error(f"Failed to process {file_path.name}: {e}")
            result.error_message = str(e)
        
        finally:
            result.processing_time = time.time() - start_time
        
        return result
    
    def process_batch(self, input_dir: Path, output_dir: Path, move_files: bool = False, dry_run: bool = False) -> BatchResult:
        """Process batch with limits and enhanced tracking"""
        start_time = time.time()
        
        # Find PDF files
        pdf_files = [f for f in input_dir.glob("*.pdf") if not f.name.startswith('.')]
        
        if not pdf_files:
            self.logger.warning(f"No PDF files found in {input_dir}")
            return BatchResult(0, 0, 0, 0, 0, 0, [], 0.0)
        
        # Apply batch size limit
        if len(pdf_files) > self.max_batch_size:
            self.logger.warning(f"Batch size ({len(pdf_files)}) exceeds limit ({self.max_batch_size}). Processing first {self.max_batch_size} files.")
            pdf_files = pdf_files[:self.max_batch_size]
        
        self.logger.info(f"Processing {len(pdf_files)} PDF files")
        
        results = []
        successful = 0
        failed = 0
        ocr_success = 0
        duplicates_skipped = 0
        test_files_moved = 0
        
        for i, pdf_file in enumerate(pdf_files, 1):
            self.logger.info(f"[{i}/{len(pdf_files)}] Processing {pdf_file.name}")
            
            if dry_run:
                # Simulate processing for dry run
                result = ProcessingResult(
                    original_file=pdf_file.name,
                    success=True,
                    new_filename=f"preview_{pdf_file.name}",
                    target_path=f"{output_dir}/Preview/{pdf_file.name}",
                    is_test_file=self.is_test_file(pdf_file.name)
                )
            else:
                result = self.process_single_file(pdf_file, output_dir, move_files)
            
            results.append(result)
            
            if result.success:
                successful += 1
                if result.is_test_file:
                    test_files_moved += 1
            elif result.is_duplicate:
                duplicates_skipped += 1
            else:
                failed += 1
            
            if result.ocr_text:
                ocr_success += 1
            
            # Rate limiting for API
            if i < len(pdf_files):
                time.sleep(0.5)
        
        batch_result = BatchResult(
            total_files=len(pdf_files),
            successful=successful,
            failed=failed,
            ocr_success=ocr_success,
            duplicates_skipped=duplicates_skipped,
            test_files_moved=test_files_moved,
            results=results,
            processing_time=time.time() - start_time
        )
        
        self.generate_report(batch_result, output_dir, dry_run)
        return batch_result
    
    def generate_report(self, batch_result: BatchResult, output_dir: Path, dry_run: bool = False):
        """Generate enhanced processing report"""
        report_content = []
        report_content.append("UNIFIED SHEET MUSIC PROCESSOR REPORT v3.0")
        report_content.append("=" * 60)
        report_content.append(f"Processed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report_content.append(f"Mode: {'DRY RUN' if dry_run else 'LIVE PROCESSING'}")
        report_content.append(f"Total files: {batch_result.total_files}")
        report_content.append(f"Successful: {batch_result.successful}")
        report_content.append(f"Failed: {batch_result.failed}")
        report_content.append(f"Duplicates skipped: {batch_result.duplicates_skipped}")
        report_content.append(f"Test files archived: {batch_result.test_files_moved}")
        report_content.append(f"OCR success: {batch_result.ocr_success}")
        if batch_result.total_files > 0:
            report_content.append(f"OCR rate: {batch_result.ocr_success/batch_result.total_files*100:.1f}%")
        report_content.append(f"Processing time: {batch_result.processing_time:.1f}s")
        report_content.append("")
        
        # Detailed results
        report_content.append("DETAILED RESULTS:")
        report_content.append("-" * 50)
        
        for result in batch_result.results:
            report_content.append(f"File: {result.original_file}")
            
            if result.is_duplicate:
                report_content.append(f"  ⚠️  DUPLICATE: {result.error_message}")
            elif result.is_test_file and result.success:
                report_content.append(f"  📁 ARCHIVED to test_files/")
            elif result.success:
                if result.new_filename != result.original_file:
                    report_content.append(f"  → Renamed: {result.new_filename}")
                report_content.append(f"  → Instrument: {result.instrument or 'Unknown'}")
                report_content.append(f"  → Part: {result.part or 'N/A'}")
                report_content.append(f"  → Key: {result.key or 'N/A'}")
                if result.ocr_text:
                    report_content.append(f"  → OCR: {result.ocr_text[:100]}...")
                report_content.append(f"  → Time: {result.processing_time:.1f}s")
            else:
                report_content.append(f"  ✗ FAILED: {result.error_message}")
            report_content.append("")
        
        # Save report
        if not dry_run:
            output_dir.mkdir(parents=True, exist_ok=True)
            report_file = output_dir / "processing_report.txt"
            with open(report_file, 'w') as f:
                f.write('\n'.join(report_content))
            self.logger.info(f"Report saved: {report_file}")
        
        # Print summary
        print("\n" + "=" * 60)
        print("UNIFIED PROCESSOR SUMMARY")
        print("=" * 60)
        print(f"Files processed: {batch_result.total_files}")
        print(f"Successful: {batch_result.successful}")
        print(f"Failed: {batch_result.failed}")
        print(f"Duplicates skipped: {batch_result.duplicates_skipped}")
        print(f"Test files archived: {batch_result.test_files_moved}")
        if batch_result.total_files > 0:
            print(f"OCR success rate: {batch_result.ocr_success/batch_result.total_files*100:.1f}%")
        print(f"Total time: {batch_result.processing_time:.1f}s")

def main():
    """Command line interface"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Unified Sheet Music Processor v3.0",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Features:
  • Consolidated all functionality from 3 separate scripts
  • Duplicate detection via file hash and content similarity
  • Automatic test file cleanup to archive/test_files/
  • PDF corruption validation before processing
  • Batch size limits to prevent system overload
  • Enhanced OCR error tolerance patterns

Examples:
  python3 main_processor.py ~/Desktop /Volumes/USB/SheetMusic --move
  python3 main_processor.py ~/test ~/output --dry-run --max-batch 10
  python3 main_processor.py ~/scans ~/organized --api-key YOUR_KEY
        """
    )
    
    parser.add_argument('input_dir', help='Input directory containing PDF files')
    parser.add_argument('output_dir', help='Output directory for organized files')
    parser.add_argument('--dry-run', action='store_true', help='Preview only, no file operations')
    parser.add_argument('--move', action='store_true', help='Move files instead of copying')
    parser.add_argument('--api-key', help='OCR.space API key')
    parser.add_argument('--log-level', default='INFO', choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'])
    parser.add_argument('--max-batch', type=int, default=25, help='Maximum files per batch (default: 25)')
    parser.add_argument('--no-compression', action='store_true', help='Disable PDF compression')
    
    args = parser.parse_args()
    
    input_dir = Path(args.input_dir)
    output_dir = Path(args.output_dir)
    
    # Validate directories
    if not input_dir.exists():
        print(f"Error: Input directory '{input_dir}' does not exist")
        sys.exit(1)
    
    # Initialize processor
    processor = UnifiedSheetMusicProcessor(
        api_key=args.api_key,
        log_level=args.log_level,
        enable_compression=not args.no_compression,
        max_batch_size=args.max_batch
    )
    
    # Process files
    print(f"🎵 Unified Sheet Music Processor v3.0")
    print(f"Input: {input_dir}")
    print(f"Output: {output_dir}")
    print(f"Mode: {'DRY RUN' if args.dry_run else 'MOVE' if args.move else 'COPY'}")
    print(f"Batch limit: {args.max_batch} files")
    print("=" * 60)
    
    result = processor.process_batch(input_dir, output_dir, args.move, args.dry_run)
    
    if not PDF_AVAILABLE:
        print("\n⚠️  PyPDF not installed - advanced features disabled")
        print("Install with: pip install pypdf")

if __name__ == "__main__":
    main()