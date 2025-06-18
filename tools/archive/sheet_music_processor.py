#!/usr/bin/env python3
"""
Sheet Music Processing System - Refactored
A robust, error-handled system for OCR, organization, and PDF labeling
"""
import os
import sys
import re
import json
import time
import logging
import requests
import shutil
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime

# Import config if available
try:
    sys.path.append(str(Path(__file__).parent.parent))
    from config import get_api_key, get_log_level
    CONFIG_AVAILABLE = True
except ImportError:
    CONFIG_AVAILABLE = False

# Import PDF compressor
try:
    from pdf_compressor import PDFCompressor
    COMPRESSION_AVAILABLE = True
except ImportError:
    COMPRESSION_AVAILABLE = False

# PDF handling imports
try:
    from pypdf import PdfReader, PdfWriter
    from pypdf.generic import AnnotationBuilder
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False

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

@dataclass
class BatchResult:
    """Result of processing a batch of files"""
    total_files: int
    successful: int
    failed: int
    ocr_success: int
    results: List[ProcessingResult]
    processing_time: float

class SheetMusicProcessor:
    """Main processor for sheet music PDFs"""
    
    # Instrument patterns with OCR error tolerance
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

    def __init__(self, api_key: str = None, log_level: str = None, enable_compression: bool = True):
        """Initialize the processor with configuration"""
        # Use config file if available and no explicit params provided
        if CONFIG_AVAILABLE:
            self.api_key = api_key or get_api_key()
            log_level = log_level or get_log_level()
        else:
            self.api_key = api_key or "helloworld"
            log_level = log_level or "INFO"
        
        self.setup_logging(log_level)
        self.session = requests.Session()
        self.session.timeout = 60
        
        # Initialize PDF compressor if available
        self.compressor = None
        if enable_compression and COMPRESSION_AVAILABLE:
            self.compressor = PDFCompressor()
            self.logger.info("PDF compression enabled for large files")
        elif enable_compression:
            self.logger.warning("PDF compression requested but pdf_compressor module not available")
        
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
    
    def validate_file(self, file_path: Path) -> Tuple[bool, str]:
        """Validate PDF file before processing"""
        if not file_path.exists():
            return False, "File does not exist"
        
        if not file_path.suffix.lower() == '.pdf':
            return False, "File is not a PDF"
        
        if file_path.stat().st_size == 0:
            return False, "File is empty"
        
        # With compression support, we can handle larger files
        # Only reject extremely large files (>50MB)
        max_size = 50 * 1024 * 1024  # 50MB
        if file_path.stat().st_size > max_size:
            return False, f"File too large: {file_path.stat().st_size/1024/1024:.1f}MB (max 50MB)"
        
        return True, "Valid"
    
    def extract_text_from_pdf(self, pdf_path: Path) -> Tuple[bool, str]:
        """Extract text from PDF using OCR.space API with compression support"""
        url = "https://api.ocr.space/parse/image"
        
        # Check if compression is needed and available
        ocr_file_path = pdf_path
        temp_compressed_path = None
        
        if self.compressor and self.compressor.needs_compression(pdf_path):
            self.logger.info(f"Creating compressed copy for OCR: {pdf_path.name}")
            temp_compressed_path = self.compressor.create_compressed_copy(pdf_path)
            
            if temp_compressed_path:
                ocr_file_path = temp_compressed_path
                original_size = self.compressor.get_file_size(pdf_path)
                compressed_size = self.compressor.get_file_size(temp_compressed_path)
                self.logger.info(f"Using compressed copy: {original_size/1024/1024:.1f}MB → {compressed_size/1024/1024:.1f}MB")
            else:
                self.logger.warning(f"Compression failed for {pdf_path.name}, skipping OCR")
                return False, "Compression failed - file too large for OCR"
        
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
                
                self.logger.debug(f"Sending OCR request for {ocr_file_path.name}")
                response = self.session.post(url, files=files, data=data)
                response.raise_for_status()
                
                try:
                    result = response.json()
                except ValueError as e:
                    self.logger.error(f"Invalid JSON response: {e}")
                    return False, "Invalid API response"
                
                if not isinstance(result, dict):
                    self.logger.error("Unexpected API response format")
                    return False, "Unexpected response format"
                
                if result.get('IsErroredOnProcessing', True):
                    error_msg = result.get('ErrorMessage', ['Unknown OCR error'])
                    if isinstance(error_msg, list):
                        error_msg = '; '.join(error_msg)
                    self.logger.warning(f"OCR processing error: {error_msg}")
                    return False, f"OCR error: {error_msg}"
                
                # Extract text from all pages
                extracted_text = ""
                parsed_results = result.get('ParsedResults', [])
                for page in parsed_results:
                    if isinstance(page, dict):
                        extracted_text += page.get('ParsedText', '') + "\n"
                
                return True, extracted_text.strip()
                
        except requests.exceptions.RequestException as e:
            self.logger.error(f"Network request failed: {e}")
            return False, f"Network error: {e}"
        except Exception as e:
            self.logger.error(f"OCR processing failed: {e}")
            return False, f"Processing error: {e}"
        finally:
            # Clean up temporary compressed file
            if temp_compressed_path and self.compressor:
                self.compressor.cleanup_temp_file(temp_compressed_path)
    
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
    
    def determine_target_path(self, music_info: Dict, base_output_dir: Path) -> Path:
        """Determine target folder path based on instrument hierarchy"""
        if not music_info['instrument']:
            return base_output_dir / 'Unknown'
        
        path = base_output_dir / music_info['instrument']
        
        if music_info['part']:
            path = path / music_info['part']
        
        if music_info['key'] and music_info['instrument'] in ['Clarinet', 'Saxophone', 'Horn', 'Trumpet', 'Cornet']:
            path = path / music_info['key']
        
        return path
    
    def add_pdf_metadata(self, pdf_path: Path, music_info: Dict, ocr_text: str) -> bool:
        """Add metadata labels to PDF file"""
        if not PDF_AVAILABLE:
            self.logger.warning("PyPDF not available - skipping PDF labeling")
            return False
        
        try:
            reader = PdfReader(pdf_path)
            writer = PdfWriter()
            
            # Copy all pages
            for page in reader.pages:
                writer.add_page(page)
            
            # Add metadata
            metadata = {
                '/Title': f"{music_info.get('part', '')} {music_info.get('key', '')} {music_info.get('instrument', '')}".strip(),
                '/Subject': 'Sheet Music',
                '/Keywords': f"instrument:{music_info.get('instrument', '')}, part:{music_info.get('part', '')}, key:{music_info.get('key', '')}",
                '/Creator': 'Sheet Music Processor',
                '/Producer': 'Sheet Music Processor v2.0',
                '/OCRText': ocr_text[:500] if ocr_text else ''  # Limit OCR text in metadata
            }
            
            writer.add_metadata(metadata)
            
            # Write back to file
            with open(pdf_path, 'wb') as output_file:
                writer.write(output_file)
            
            self.logger.info(f"Added metadata to {pdf_path.name}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to add PDF metadata: {e}")
            return False
    
    def process_single_file(self, file_path: Path, output_dir: Path, move_files: bool = False) -> ProcessingResult:
        """Process a single PDF file with comprehensive error handling"""
        start_time = time.time()
        result = ProcessingResult(
            original_file=file_path.name,
            success=False
        )
        
        try:
            # Validate file
            is_valid, validation_msg = self.validate_file(file_path)
            if not is_valid:
                result.error_message = validation_msg
                return result
            
            self.logger.info(f"Processing: {file_path.name}")
            
            # Extract text via OCR
            ocr_success, ocr_text = self.extract_text_from_pdf(file_path)
            result.ocr_text = ocr_text if ocr_success else None
            
            # Parse music information
            music_info = self.parse_music_info(ocr_text if ocr_success else "", file_path.name)
            result.instrument = music_info['instrument']
            result.part = music_info['part']
            result.key = music_info['key']
            
            # Create meaningful filename
            new_filename = self.create_meaningful_filename(music_info, file_path.name)
            result.new_filename = new_filename
            
            # Determine target path
            target_folder = self.determine_target_path(music_info, output_dir)
            target_file = target_folder / new_filename
            result.target_path = str(target_file)
            
            # Create target directory
            target_folder.mkdir(parents=True, exist_ok=True)
            
            # Add PDF metadata if possible
            if PDF_AVAILABLE and (result.instrument or ocr_text):
                self.add_pdf_metadata(file_path, music_info, ocr_text or "")
            
            # Move or copy file
            if move_files:
                shutil.move(file_path, target_file)
                self.logger.info(f"Moved {file_path.name} -> {target_file.relative_to(output_dir)}")
            else:
                shutil.copy2(file_path, target_file)
                self.logger.info(f"Copied {file_path.name} -> {target_file.relative_to(output_dir)}")
            
            result.success = True
            
        except Exception as e:
            self.logger.error(f"Failed to process {file_path.name}: {e}")
            result.error_message = str(e)
        
        finally:
            result.processing_time = time.time() - start_time
        
        return result
    
    def process_batch(self, input_dir: Path, output_dir: Path, move_files: bool = False, dry_run: bool = False) -> BatchResult:
        """Process a batch of PDF files"""
        start_time = time.time()
        
        # Find PDF files
        pdf_files = [f for f in input_dir.glob("*.pdf") if not f.name.startswith('.')]
        
        if not pdf_files:
            self.logger.warning(f"No PDF files found in {input_dir}")
            return BatchResult(0, 0, 0, 0, [], 0.0)
        
        self.logger.info(f"Found {len(pdf_files)} PDF files to process")
        
        results = []
        successful = 0
        failed = 0
        ocr_success = 0
        
        for i, pdf_file in enumerate(pdf_files, 1):
            self.logger.info(f"[{i}/{len(pdf_files)}] Processing {pdf_file.name}")
            
            if dry_run:
                # Simulate processing for dry run
                result = ProcessingResult(
                    original_file=pdf_file.name,
                    success=True,
                    new_filename=f"preview_{pdf_file.name}",
                    target_path=f"{output_dir}/Preview/{pdf_file.name}"
                )
            else:
                result = self.process_single_file(pdf_file, output_dir, move_files)
            
            results.append(result)
            
            if result.success:
                successful += 1
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
            results=results,
            processing_time=time.time() - start_time
        )
        
        # Clean up any remaining temporary files
        if self.compressor:
            self.compressor.cleanup_temp_directory()
        
        self.generate_report(batch_result, output_dir, dry_run)
        return batch_result
    
    def generate_report(self, batch_result: BatchResult, output_dir: Path, dry_run: bool = False):
        """Generate detailed processing report"""
        report_content = []
        report_content.append("SHEET MUSIC PROCESSING REPORT")
        report_content.append("=" * 50)
        report_content.append(f"Processed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report_content.append(f"Mode: {'DRY RUN' if dry_run else 'LIVE PROCESSING'}")
        report_content.append(f"Total files: {batch_result.total_files}")
        report_content.append(f"Successful: {batch_result.successful}")
        report_content.append(f"Failed: {batch_result.failed}")
        report_content.append(f"OCR success: {batch_result.ocr_success}")
        report_content.append(f"OCR rate: {batch_result.ocr_success/batch_result.total_files*100:.1f}%")
        report_content.append(f"Processing time: {batch_result.processing_time:.1f}s")
        report_content.append("")
        
        # Detailed results
        report_content.append("DETAILED RESULTS:")
        report_content.append("-" * 50)
        
        for result in batch_result.results:
            report_content.append(f"File: {result.original_file}")
            if result.success:
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
        print("PROCESSING SUMMARY")
        print("=" * 60)
        print(f"Files processed: {batch_result.total_files}")
        print(f"Successful: {batch_result.successful}")
        print(f"Failed: {batch_result.failed}")
        print(f"OCR success rate: {batch_result.ocr_success/batch_result.total_files*100:.1f}%")
        print(f"Total time: {batch_result.processing_time:.1f}s")

def main():
    """Command line interface"""
    if len(sys.argv) < 3:
        print("🎵 Sheet Music Processor v2.0")
        print("Robust OCR, organization, and PDF labeling system")
        print("")
        print("Usage: python3 sheet_music_processor.py <input_dir> <output_dir> [options]")
        print("")
        print("Options:")
        print("  --dry-run          Preview processing without moving files")
        print("  --move            Move files instead of copying")
        print("  --api-key KEY     OCR.space API key (default: free tier)")
        print("  --log-level LEVEL Logging level: DEBUG, INFO, WARNING, ERROR")
        print("  --no-compression  Disable PDF compression for large files")
        print("")
        print("Examples:")
        print("  python3 sheet_music_processor.py ~/Desktop /Volumes/USB/SheetMusic")
        print("  python3 sheet_music_processor.py ~/raw_scans ~/organized --move")
        print("  python3 sheet_music_processor.py ~/test ~/output --dry-run --log-level DEBUG")
        sys.exit(1)
    
    input_dir = Path(sys.argv[1])
    output_dir = Path(sys.argv[2])
    
    # Parse options
    dry_run = '--dry-run' in sys.argv
    move_files = '--move' in sys.argv
    enable_compression = '--no-compression' not in sys.argv
    
    # API key priority: command line > config file > default
    api_key = None
    if '--api-key' in sys.argv:
        key_index = sys.argv.index('--api-key') + 1
        if key_index < len(sys.argv):
            api_key = sys.argv[key_index]
    
    # Log level priority: command line > config file > default
    log_level = None
    if '--log-level' in sys.argv:
        level_index = sys.argv.index('--log-level') + 1
        if level_index < len(sys.argv):
            log_level = sys.argv[level_index]
    
    # Validate directories
    if not input_dir.exists():
        print(f"Error: Input directory '{input_dir}' does not exist")
        sys.exit(1)
    
    # Initialize processor
    processor = SheetMusicProcessor(api_key=api_key, log_level=log_level, enable_compression=enable_compression)
    
    # Process files
    print(f"🎵 Sheet Music Processor v2.0")
    print(f"Input: {input_dir}")
    print(f"Output: {output_dir}")
    print(f"Mode: {'DRY RUN' if dry_run else 'MOVE' if move_files else 'COPY'}")
    print("=" * 60)
    
    result = processor.process_batch(input_dir, output_dir, move_files, dry_run)
    
    if not PDF_AVAILABLE:
        print("\n⚠️  PyPDF not installed - PDF labeling disabled")
        print("Install with: pip install pypdf")

if __name__ == "__main__":
    main()