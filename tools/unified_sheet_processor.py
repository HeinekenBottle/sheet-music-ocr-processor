#!/usr/bin/env python3
"""
Unified Sheet Music Processor - Consolidation of Best Working Methods
Combines proven OCR, compression, and organization from working implementations
"""

import os
import sys
import json
import tempfile
import hashlib
import logging
import requests
import shutil
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime
import re
import difflib

# PDF processing
try:
    from pypdf import PdfReader, PdfWriter, Transformation
    PDF_AVAILABLE = True
except ImportError:
    try:
        from PyPDF2 import PdfReader, PdfWriter
        from PyPDF2.generic import Transformation
        PDF_AVAILABLE = True
    except ImportError:
        PDF_AVAILABLE = False

@dataclass
class SheetMusicMetadata:
    """Extracted metadata from sheet music"""
    piece_name: str = "Unknown Piece"
    instrument: str = "Unknown"
    part_number: str = "Unknown"
    key_signature: Optional[str] = None
    confidence: float = 0.0
    quality_score: float = 0.0
    raw_text: str = ""
    processing_time: float = 0.0
    file_size_original: int = 0
    file_size_compressed: int = 0

@dataclass 
class ProcessingResult:
    """Result of processing a single file"""
    original_file: str
    success: bool
    metadata: Optional[SheetMusicMetadata] = None
    final_path: Optional[str] = None
    error: Optional[str] = None
    warnings: List[str] = None
    
    def __post_init__(self):
        if self.warnings is None:
            self.warnings = []

class UnifiedSheetProcessor:
    """Consolidated processor using best working methods from all implementations"""
    
    def __init__(self, ocr_api_key: str, input_path: str, output_path: str):
        self.ocr_api_key = ocr_api_key
        self.input_path = Path(input_path)
        self.output_path = Path(output_path)
        self.temp_dir = Path(tempfile.mkdtemp(prefix="sheet_music_unified_"))
        
        # Setup logging
        self.setup_logging()
        
        # Processing stats
        self.stats = {
            'processed': 0,
            'successful': 0, 
            'failed': 0,
            'ocr_success': 0
        }
        
        # Check dependencies
        self.compression_available = PDF_AVAILABLE
        if not self.compression_available:
            self.logger.warning("PyPDF not available - compression disabled")
            
        # Setup patterns for metadata extraction
        self.setup_patterns()
        
    def setup_logging(self):
        """Setup logging configuration"""
        log_dir = Path("reports")
        log_dir.mkdir(exist_ok=True)
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_dir / f"unified_processing_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)
        
    def setup_patterns(self):
        """Setup regex patterns for metadata extraction"""
        # Piece name patterns
        self.piece_patterns = [
            r'(?i)(?:title|titel|piece|song|march|waltz|suite|symphony|concerto|sonata|overture|theme|variations?)[:\s-]+([A-Za-z\s\-&0-9äöüß]{3,50})',
            r'(?i)^([A-Z][A-Za-z\s\-&0-9äöüß]{3,50})(?:\s+(?:March|Waltz|Suite|Symphony|Concerto|Sonata|Overture|Marsch|Walzer))?',
            r'(?i)([A-Z][A-Za-z\s\-&0-9äöüß]{5,50})\s+(?:March|Waltz|Suite|Symphony|Concerto|Sonata|Overture|Marsch|Walzer)',
            r'(?i)(?:^|\n)([A-Z][A-Za-z\s\-&0-9äöüß]{5,45})(?=\s*\n|\s*$)',
            r'(?i)([A-ZÄÖÜ][a-zäöüß\s\-&0-9]{4,45})',
        ]
        
        # Instrument patterns with OCR error tolerance
        self.instrument_patterns = {
            'Clarinet': r'(?i)\b(?:clarinet|cl[ao]rin[ae]t|c[il][ao]rin[ae]t|clar|clari|klarinette|clarinette)\b',
            'Trumpet': r'(?i)\b(?:trumpet|tr[ou]mp[ae]t|tpt|trp|cornet|cnt|trompete|trompette)\b',
            'Flute': r'(?i)\b(?:flute|fl[ou]te|fl|piccolo|picc|flöte|flöt|flote|flauta)\b',
            'Saxophone': r'(?i)\b(?:saxophone|sax[ao]phone|sax|alto\s*sax|tenor\s*sax|bari\s*sax|soprano\s*sax|saxophon)\b',
            'Trombone': r'(?i)\b(?:trombone|tr[ao]mb[ao]ne|tbn|bone|slide|posaune)\b',
            'French Horn': r'(?i)\b(?:french\s*horn|horn|h[ao]rn|hn|f\s*horn|waldhorn|cor)\b',
            'Tuba': r'(?i)\b(?:tuba|t[ou]ba|tb|bass|euphonium|euph|baritone|bari)\b',
            'Percussion': r'(?i)\b(?:percussion|perc[ou]ssion|drums|timpani|timp|snare|bass\s*drum|cymbals|pauken|schlagzeug)\b',
            'Oboe': r'(?i)\b(?:oboe|ob[ao]e|ob|english\s*horn|hautbois)\b',
            'Bassoon': r'(?i)\b(?:bassoon|b?ass[ao][ao]n|assoon|bsn|contra\s*bassoon|fagott|basson)\b',
            'Violin': r'(?i)\b(?:violin|vi[ao]lin|vln|vl|geige|violon)\b',
            'Viola': r'(?i)\b(?:viola|vi[ao]la|vla|bratsche|alto)\b',
            'Cello': r'(?i)\b(?:cello|c[ae]llo|vc|violoncello|violoncelle)\b',
            'Double Bass': r'(?i)\b(?:double\s*bass|bass|db|contrabass|kontrabass|contrebasse)\b',
            'Piano': r'(?i)\b(?:piano|pi[ao]no|pf|klavier|pianoforte)\b',
        }
        
        # Part number patterns
        self.part_patterns = {
            '1st': r'(?i)\b(?:1st|first|I|principal|solo|lead)\b',
            '2nd': r'(?i)\b(?:2nd|second|II|2)\b', 
            '3rd': r'(?i)\b(?:3rd|third|III|3)\b',
            '4th': r'(?i)\b(?:4th|fourth|IV|4)\b',
            'Solo': r'(?i)\b(?:solo|soloist|featured)\b',
            'Principal': r'(?i)\b(?:principal|prin|1st\s*chair)\b',
        }
        
    def find_pdf_files(self) -> List[Path]:
        """Find all PDF files for processing"""
        pdf_files = []
        for ext in ['.pdf', '.PDF']:
            pdf_files.extend(self.input_path.rglob(f"*{ext}"))
        
        self.logger.info(f"Found {len(pdf_files)} PDF files")
        return pdf_files
        
    def compress_pdf_for_ocr(self, file_path: Path) -> Optional[Path]:
        """Compress PDF for OCR using proven pypdf method"""
        if not self.compression_available:
            return file_path
        
        # Check if compression needed (1MB limit for OCR)
        file_size = file_path.stat().st_size
        if file_size <= 1024 * 1024:
            return file_path
        
        # Create temporary compressed version
        temp_file = self.temp_dir / f"compressed_{file_path.name}"
        
        try:
            reader = PdfReader(file_path)
            writer = PdfWriter()
            
            # Compress aggressively for OCR
            scale_factor = 0.4  # More aggressive compression for 1MB limit
            for page in reader.pages:
                # Remove annotations to reduce size
                if '/Annots' in page:
                    del page['/Annots']
                transformation = Transformation().scale(sx=scale_factor, sy=scale_factor)
                page.add_transformation(transformation)
                writer.add_page(page)
            
            writer.compress_identical_objects()
            
            with open(temp_file, 'wb') as output_file:
                writer.write(output_file)
            
            compressed_size = temp_file.stat().st_size
            self.logger.info(f"Compressed for OCR: {file_size/1024/1024:.1f}MB → {compressed_size/1024/1024:.1f}MB")
            
            if compressed_size > 1024 * 1024:
                self.logger.warning(f"Compressed file still over 1MB: {compressed_size/1024/1024:.1f}MB")
                
            return temp_file
            
        except Exception as e:
            self.logger.error(f"Compression failed: {e}")
            if temp_file.exists():
                temp_file.unlink()
            return None
            
    def extract_text_with_ocr(self, file_path: Path) -> Tuple[bool, str]:
        """Extract text using OCR.space API - proven working method"""
        try:
            with open(file_path, 'rb') as f:
                files = {'file': f}
                data = {
                    'apikey': self.ocr_api_key,
                    'language': 'eng',
                    'isOverlayRequired': 'false',
                    'scale': 'true',
                    'OCREngine': '2',  # Use engine 2 for better accuracy
                    'detectOrientation': 'true',
                    'isTable': 'false',
                    'filetype': 'PDF',
                    'isCreateSearchablePdf': 'false'
                }
                
                response = requests.post(
                    'https://api.ocr.space/parse/image',
                    files=files,
                    data=data,
                    timeout=30
                )
                
            if response.status_code != 200:
                return False, f"OCR API request failed: {response.status_code}"
                
            result = response.json()
            
            # Check for processing errors - FIXED LOGIC
            if not result.get('IsErroredOnProcessing', False):
                # Extract text from all parsed results
                text_results = []
                for parsed_result in result.get('ParsedResults', []):
                    text_results.append(parsed_result.get('ParsedText', ''))
                    
                extracted_text = '\n'.join(text_results)
                self.logger.info(f"OCR extracted {len(extracted_text)} characters")
                return True, extracted_text
            else:
                error_msgs = result.get('ErrorMessage', [])
                if isinstance(error_msgs, list):
                    error_msg = '; '.join(error_msgs)
                else:
                    error_msg = str(error_msgs)
                return False, f"OCR processing failed: {error_msg}"
                
        except requests.exceptions.RequestException as e:
            return False, f"OCR API request failed: {e}"
        except Exception as e:
            return False, f"OCR extraction failed: {e}"
            
    def extract_piece_name(self, text: str) -> Optional[str]:
        """Extract piece name from text"""
        for pattern in self.piece_patterns:
            match = re.search(pattern, text)
            if match:
                piece_name = match.group(1).strip()
                piece_name = re.sub(r'\s+', ' ', piece_name)
                if 3 < len(piece_name) < 50:
                    return piece_name
        return None
        
    def extract_instrument(self, text: str) -> Optional[str]:
        """Extract instrument from text with fuzzy matching"""
        # First try exact pattern matching
        for instrument, pattern in self.instrument_patterns.items():
            if re.search(pattern, text):
                return instrument
                
        # Fuzzy matching for OCR errors
        return self.fuzzy_match_instrument(text)
        
    def fuzzy_match_instrument(self, text: str) -> Optional[str]:
        """Fuzzy matching for instruments when OCR has errors"""
        words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
        
        instrument_keywords = {
            'Clarinet': ['clarinet', 'clainet', 'clarine', 'klarinet'],
            'Trumpet': ['trumpet', 'trumpt', 'trompet', 'trumept'],
            'Flute': ['flute', 'flut', 'flote', 'flaute'],
            'Saxophone': ['saxophone', 'saxaphone', 'saxophon', 'saxofon'],
            'Trombone': ['trombone', 'tromabone', 'trombon', 'posane'],
            'French Horn': ['horn', 'harn', 'waldhorn', 'hrn'],
            'Tuba': ['tuba', 'tuda', 'toba'],
            'Percussion': ['percussion', 'percusion', 'timpani', 'pauken'],
            'Oboe': ['oboe', 'oboe', 'hautbois'],
            'Bassoon': ['bassoon', 'assoon', 'basson', 'fagott', 'bason'],
            'Violin': ['violin', 'violen', 'geige'],
            'Viola': ['viola', 'viala', 'bratsche'],
            'Cello': ['cello', 'celo', 'violoncello'],
            'Piano': ['piano', 'pieno', 'klavier'],
        }
        
        best_match = None
        best_ratio = 0.0
        
        for word in words:
            for instrument, keywords in instrument_keywords.items():
                for keyword in keywords:
                    ratio = difflib.SequenceMatcher(None, word, keyword).ratio()
                    if ratio > 0.75 and ratio > best_ratio:
                        best_match = instrument
                        best_ratio = ratio
                        
        return best_match
        
    def extract_part_number(self, text: str) -> Optional[str]:
        """Extract part number from text"""
        for part, pattern in self.part_patterns.items():
            if re.search(pattern, text):
                return part
        return None
        
    def analyze_text_for_metadata(self, text: str, file_path: Path) -> SheetMusicMetadata:
        """Analyze OCR text to extract metadata"""
        metadata = SheetMusicMetadata(raw_text=text)
        
        # Clean text for better matching
        clean_text = text.replace('\n', ' ').replace('\r', ' ')
        clean_text = re.sub(r'\s+', ' ', clean_text).strip()
        
        # Extract metadata
        piece_name = self.extract_piece_name(clean_text)
        if piece_name:
            metadata.piece_name = piece_name
            
        instrument = self.extract_instrument(clean_text)
        if instrument:
            metadata.instrument = instrument
            
        part_number = self.extract_part_number(clean_text)
        if part_number:
            metadata.part_number = part_number
            
        # Calculate quality and confidence scores
        metadata.quality_score = self.calculate_quality_score(text)
        metadata.confidence = self.calculate_confidence_score(metadata)
        
        return metadata
        
    def calculate_quality_score(self, text: str) -> float:
        """Calculate quality score based on text characteristics"""
        if not text or len(text) < 10:
            return 0.1
            
        words = text.split()
        readable_words = sum(1 for word in words if len(word) > 2 and word.isalpha())
        total_words = len(words)
        
        if total_words == 0:
            return 0.1
            
        readable_ratio = readable_words / total_words
        special_char_ratio = sum(1 for c in text if not c.isalnum() and c not in ' \n\r.,;:-') / len(text)
        
        quality_score = readable_ratio * (1 - min(special_char_ratio, 0.5))
        return max(0.1, min(1.0, quality_score))
        
    def calculate_confidence_score(self, metadata: SheetMusicMetadata) -> float:
        """Calculate confidence score based on extracted metadata"""
        confidence = 0.0
        
        if metadata.piece_name != "Unknown Piece":
            confidence += 0.4
        if metadata.instrument != "Unknown":
            confidence += 0.3
        if metadata.part_number != "Unknown":
            confidence += 0.2
        if metadata.key_signature:
            confidence += 0.1
            
        return min(1.0, confidence)
        
    def sanitize_filename(self, name: str) -> str:
        """Sanitize string for use as filename/directory name"""
        sanitized = re.sub(r'[<>:"/\\|?*]', '_', name)
        sanitized = re.sub(r'[_\s]+', '_', sanitized)
        sanitized = sanitized.strip('_')
        return sanitized if sanitized else "Unknown"
        
    def organize_file(self, original_path: Path, metadata: SheetMusicMetadata) -> Path:
        """Organize file into Piece/Instrument/Part directory structure"""
        # Sanitize names for filesystem
        piece_name = self.sanitize_filename(metadata.piece_name)
        instrument_name = self.sanitize_filename(metadata.instrument)
        part_name = self.sanitize_filename(metadata.part_number)
        
        # Create directory structure: PieceName/Instrument/
        piece_dir = self.output_path / piece_name
        instrument_dir = piece_dir / instrument_name
        instrument_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate filename with part info
        base_filename = f"{part_name}_{original_path.stem}"
        if metadata.key_signature:
            base_filename = f"{part_name}_{metadata.key_signature}_{original_path.stem}"
            
        filename = f"{base_filename}{original_path.suffix}"
        final_path = instrument_dir / filename
        
        # Copy original file (preserving full quality)
        shutil.copy2(original_path, final_path)
        
        # Create metadata file
        metadata_file = instrument_dir / f"{base_filename}.json"
        with open(metadata_file, 'w') as f:
            json.dump(asdict(metadata), f, indent=2)
            
        self.logger.info(f"Organized: {piece_name}/{instrument_name}/{filename}")
        return final_path
        
    def process_file(self, file_path: Path) -> ProcessingResult:
        """Process a single PDF file - complete workflow"""
        start_time = datetime.now()
        result = ProcessingResult(original_file=str(file_path), success=False)
        compressed_path = None
        
        try:
            self.logger.info(f"Processing: {file_path.name}")
            
            # Step 1: Create compressed copy for OCR
            compressed_path = self.compress_pdf_for_ocr(file_path)
            if not compressed_path:
                result.error = "PDF compression failed"
                return result
                
            # Step 2: Extract text via OCR using compressed copy
            ocr_success, ocr_text = self.extract_text_with_ocr(compressed_path)
            
            if not ocr_success:
                result.error = f"OCR failed: {ocr_text}"
                return result
                
            self.stats['ocr_success'] += 1
            
            # Step 3: Analyze text for metadata
            metadata = self.analyze_text_for_metadata(ocr_text, file_path)
            metadata.file_size_original = file_path.stat().st_size
            metadata.file_size_compressed = compressed_path.stat().st_size if compressed_path != file_path else 0
            metadata.processing_time = (datetime.now() - start_time).total_seconds()
            
            # Step 4: Apply labels to original PDF and organize
            final_path = self.organize_file(file_path, metadata)
            
            result.success = True
            result.metadata = metadata
            result.final_path = str(final_path)
            self.stats['successful'] += 1
            
            # Quality warnings
            if metadata.quality_score < 0.5:
                result.warnings.append("Low quality scan - may need manual review")
            if metadata.confidence < 0.7:
                result.warnings.append("Low confidence in extraction - verify results")
                
        except Exception as e:
            result.error = str(e)
            self.stats['failed'] += 1
            self.logger.error(f"Failed to process {file_path.name}: {e}")
            
        finally:
            # Step 5: Delete compressed copy
            if compressed_path and compressed_path != file_path and compressed_path.exists():
                try:
                    compressed_path.unlink()
                    self.logger.debug(f"Deleted compressed copy: {compressed_path.name}")
                except Exception as e:
                    self.logger.warning(f"Failed to delete compressed copy: {e}")
                    
            self.stats['processed'] += 1
            
        return result
        
    def process_batch(self, batch_size: int = 10) -> List[ProcessingResult]:
        """Process files in batches"""
        pdf_files = self.find_pdf_files()
        results = []
        
        self.logger.info(f"Starting batch processing of {len(pdf_files)} files")
        
        for i in range(0, len(pdf_files), batch_size):
            batch = pdf_files[i:i + batch_size]
            self.logger.info(f"Processing batch {i//batch_size + 1} ({len(batch)} files)")
            
            for file_path in batch:
                result = self.process_file(file_path)
                results.append(result)
                
            # Log batch summary
            successful = sum(1 for r in results[i:] if r.success)
            self.logger.info(f"Batch complete: {successful}/{len(batch)} successful")
            
        return results
        
    def generate_report(self, results: List[ProcessingResult]) -> str:
        """Generate processing report"""
        report_path = Path("reports") / f"unified_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        report_data = {
            'timestamp': datetime.now().isoformat(),
            'stats': self.stats,
            'results': [asdict(r) for r in results]
        }
        
        with open(report_path, 'w') as f:
            json.dump(report_data, f, indent=2)
            
        self.logger.info(f"Report saved to: {report_path}")
        return str(report_path)
        
    def cleanup(self):
        """Clean up temporary files"""
        if self.temp_dir.exists():
            shutil.rmtree(self.temp_dir)

def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Unified Sheet Music Processor")
    parser.add_argument("input_path", help="Path to input directory with PDFs")
    parser.add_argument("output_path", help="Output directory for organized files")
    parser.add_argument("--ocr-api-key", help="OCR.space API key (or set OCR_SPACE_API_KEY env var)")
    parser.add_argument("--batch-size", type=int, default=10, help="Batch size for processing")
    
    args = parser.parse_args()
    
    # Get API key with fallbacks
    api_key = args.ocr_api_key or os.getenv('OCR_SPACE_API_KEY') or 'helloworld'
    
    # Validate paths
    input_path = Path(args.input_path)
    if not input_path.exists():
        print(f"Error: Input path does not exist: {input_path}")
        sys.exit(1)
        
    output_path = Path(args.output_path)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Create processor and run
    processor = UnifiedSheetProcessor(api_key, input_path, output_path)
    
    try:
        # Process files
        results = processor.process_batch(args.batch_size)
        
        # Generate report
        report_path = processor.generate_report(results)
        
        # Print summary
        print(f"\n🎵 Unified Processing Complete:")
        print(f"  Total files: {processor.stats['processed']}")
        print(f"  Successful: {processor.stats['successful']}")
        print(f"  Failed: {processor.stats['failed']}")
        print(f"  OCR success: {processor.stats['ocr_success']}")
        print(f"  OCR rate: {processor.stats['ocr_success']/max(1,processor.stats['processed'])*100:.1f}%")
        print(f"  Report: {report_path}")
        
    finally:
        processor.cleanup()

if __name__ == "__main__":
    main()