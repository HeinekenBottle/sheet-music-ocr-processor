#!/usr/bin/env python3
"""
OCR.space-powered Sheet Music Processing System
Processes raw scans from USB, uses OCR.space for text extraction and pattern matching for labeling
"""

import os
import sys
import json
import shutil
import hashlib
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import logging
from dataclasses import dataclass, asdict
from datetime import datetime
import subprocess
import tempfile
import requests
import re
import time

# PDF processing
try:
    from PIL import Image
    import pdf2image
except ImportError:
    print("Missing dependencies. Run: pip install Pillow pdf2image")
    sys.exit(1)


@dataclass
class SheetMusicMetadata:
    """Extracted metadata from sheet music"""
    piece_name: str
    instrument: str
    part_number: str
    key_signature: Optional[str] = None
    tempo: Optional[str] = None
    composer: Optional[str] = None
    arranger: Optional[str] = None
    difficulty: Optional[str] = None
    page_count: int = 1
    quality_score: float = 1.0
    confidence: float = 1.0
    raw_text: str = ""
    
    def to_filename(self) -> str:
        """Generate standardized filename from metadata"""
        # Clean strings for filename
        piece = self.piece_name.replace(" ", "_").replace("/", "-")
        instrument = self.instrument.replace(" ", "_")
        part = self.part_number.replace(" ", "")
        
        # Create base filename
        if self.key_signature:
            return f"{piece}_{part}{self.key_signature}{instrument}"
        else:
            return f"{piece}_{part}{instrument}"


@dataclass
class ProcessingResult:
    """Result of processing a single file"""
    original_file: str
    success: bool
    metadata: Optional[SheetMusicMetadata] = None
    error: Optional[str] = None
    warnings: List[str] = None
    compressed_size: int = 0
    processing_time: float = 0.0
    
    def __post_init__(self):
        if self.warnings is None:
            self.warnings = []


class SheetMusicProcessor:
    """Main processor class using OCR.space"""
    
    def __init__(self, ocr_api_key: str, usb_path: str, output_path: str):
        self.ocr_api_key = ocr_api_key
        self.usb_path = Path(usb_path)
        self.output_path = Path(output_path)
        self.temp_dir = Path(tempfile.mkdtemp(prefix="sheet_music_"))
        
        # Setup logging
        self.setup_logging()
        
        # Processing stats
        self.stats = {
            'processed': 0,
            'successful': 0,
            'failed': 0,
            'duplicates': 0,
            'low_quality': 0
        }
        
        # Track processed files to avoid duplicates
        self.processed_hashes = set()
        self.piece_inventory = {}  # piece_name -> {instrument -> [parts]}
        
        # Pattern matching for music metadata
        self.setup_patterns()
        
    def setup_patterns(self):
        """Setup regex patterns for metadata extraction"""
        # Piece name patterns (enhanced for stylized fonts and multiple languages)
        self.piece_patterns = [
            # Explicit title markers
            r'(?i)(?:title|titel|piece|song|march|waltz|suite|symphony|concerto|sonata|overture|theme|variations?)[:\s-]+([A-Za-z\s\-&0-9äöüß]{3,50})',
            # First prominent line (likely title)
            r'(?i)^([A-Z][A-Za-z\s\-&0-9äöüß]{3,50})(?:\s+(?:March|Waltz|Suite|Symphony|Concerto|Sonata|Overture|Marsch|Walzer))?',
            # Capitalized title with common musical forms
            r'(?i)([A-Z][A-Za-z\s\-&0-9äöüß]{5,50})\s+(?:March|Waltz|Suite|Symphony|Concerto|Sonata|Overture|Marsch|Walzer)',
            # Lines that start with capital and are isolated (common title placement)
            r'(?i)(?:^|\n)([A-Z][A-Za-z\s\-&0-9äöüß]{5,45})(?=\s*\n|\s*$)',
            # German/European style titles with umlauts
            r'(?i)([A-ZÄÖÜ][a-zäöüß\s\-&0-9]{4,45})',
        ]
        
        # Instrument patterns with OCR error tolerance and multilingual support
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
        
        # Key signature patterns
        self.key_patterns = {
            'Bb': r'(?i)\b(?:b\s*flat|bb|b♭)\b',
            'Eb': r'(?i)\b(?:e\s*flat|eb|e♭)\b',
            'F': r'(?i)\b(?:f\s*major|f\s*key|in\s*f)\b',
            'C': r'(?i)\b(?:c\s*major|c\s*key|in\s*c|concert\s*pitch)\b',
            'Ab': r'(?i)\b(?:a\s*flat|ab|a♭)\b',
            'Db': r'(?i)\b(?:d\s*flat|db|d♭)\b',
        }
        
    def setup_logging(self):
        """Setup logging configuration"""
        log_dir = Path("reports")
        log_dir.mkdir(exist_ok=True)
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_dir / f"processing_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)
        
    def find_raw_scans(self) -> List[Path]:
        """Find all PDF/image files on USB for processing"""
        scan_files = []
        
        # Look for common scan file extensions
        extensions = ['.pdf', '.tif', '.tiff', '.png', '.jpg', '.jpeg']
        
        for ext in extensions:
            scan_files.extend(self.usb_path.rglob(f"*{ext}"))
            scan_files.extend(self.usb_path.rglob(f"*{ext.upper()}"))
            
        self.logger.info(f"Found {len(scan_files)} scan files on USB")
        return scan_files
        
    def get_file_hash(self, filepath: Path) -> str:
        """Get MD5 hash of file to detect duplicates"""
        hash_md5 = hashlib.md5()
        with open(filepath, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()
        
    def compress_pdf(self, input_path: Path, target_size_mb: float = 1.0) -> Path:
        """Create compressed copy for OCR (preserves original)"""
        output_path = self.temp_dir / f"ocr_copy_{input_path.name}"
        
        # Convert to images first if needed
        if input_path.suffix.lower() in ['.tif', '.tiff', '.png', '.jpg', '.jpeg']:
            # Convert image to PDF with reasonable quality
            img = Image.open(input_path)
            pdf_path = self.temp_dir / f"{input_path.stem}.pdf"
            img.save(pdf_path, "PDF", resolution=150.0, quality=85)
            input_path = pdf_path
            
        # Compress PDF using ghostscript if available
        try:
            # Start with moderate compression to preserve OCR quality
            cmd = [
                'gs', '-sDEVICE=pdfwrite', '-dCompatibilityLevel=1.4',
                '-dPDFSETTINGS=/printer', '-dNOPAUSE', '-dQUIET', '-dBATCH',
                '-dColorImageResolution=200', '-dGrayImageResolution=200',
                f'-sOutputFile={output_path}', str(input_path)
            ]
            subprocess.run(cmd, check=True, capture_output=True)
            
            # Check if still too large - gradually increase compression
            if output_path.stat().st_size > target_size_mb * 1024 * 1024:
                cmd[4] = '-dPDFSETTINGS=/ebook'
                cmd[6] = '-dColorImageResolution=150'
                cmd[7] = '-dGrayImageResolution=150'
                subprocess.run(cmd, check=True, capture_output=True)
                
            # Final fallback - more aggressive but still readable
            if output_path.stat().st_size > target_size_mb * 1024 * 1024:
                cmd[4] = '-dPDFSETTINGS=/screen'
                cmd[6] = '-dColorImageResolution=100'
                cmd[7] = '-dGrayImageResolution=100'
                subprocess.run(cmd, check=True, capture_output=True)
                
        except (subprocess.CalledProcessError, FileNotFoundError):
            # Fallback: copy original if ghostscript not available
            shutil.copy2(input_path, output_path)
            self.logger.warning(f"Ghostscript not available, using original file size")
            
        return output_path
        
    def extract_text_with_ocr(self, file_path: Path) -> str:
        """Use OCR.space to extract text from sheet music"""
        
        # Handle different file types
        if file_path.suffix.lower() == '.pdf':
            # Convert PDF to image for OCR
            try:
                images = pdf2image.convert_from_path(file_path, dpi=300, first_page=1, last_page=1)
                if not images:
                    raise Exception("Could not convert PDF to image")
                    
                img = images[0]
                img_path = self.temp_dir / f"{file_path.stem}_page1.png"
                img.save(img_path, "PNG", optimize=True, quality=85)
                
            except ImportError:
                self.logger.error("pdf2image not available - cannot process PDF files")
                raise Exception("PDF processing requires pdf2image and poppler")
            except Exception as e:
                self.logger.error(f"Failed to convert PDF to image: {e}")
                raise
        else:
            # Handle image files directly (TIF, PNG, JPG)
            try:
                img = Image.open(file_path)
                # Convert to PNG if needed
                img_path = self.temp_dir / f"{file_path.stem}_ocr.png"
                img.save(img_path, "PNG", optimize=True, quality=85)
                
            except Exception as e:
                self.logger.error(f"Failed to process image file: {e}")
                raise
            
        # Call OCR.space API
        try:
            with open(img_path, 'rb') as f:
                files = {'file': f}
                data = {
                    'apikey': self.ocr_api_key,
                    'language': 'eng',
                    'isOverlayRequired': 'false',
                    'scale': 'true',
                    'OCREngine': '2',  # Use engine 2 for better accuracy
                    'detectOrientation': 'true',
                    'isTable': 'false',  # Not a table document
                    'filetype': 'PDF',  # Specify file type
                    'isCreateSearchablePdf': 'false'  # We only need text
                }
                
                response = requests.post(
                    'https://api.ocr.space/parse/image',
                    files=files,
                    data=data,
                    timeout=30
                )
                
            if response.status_code != 200:
                raise Exception(f"OCR API request failed: {response.status_code}")
                
            result = response.json()
            
            if not result.get('IsErroredOnProcessing', True):
                # Extract text from all parsed results
                text_results = []
                for parsed_result in result.get('ParsedResults', []):
                    text_results.append(parsed_result.get('ParsedText', ''))
                    
                extracted_text = '\n'.join(text_results)
                self.logger.info(f"OCR extracted {len(extracted_text)} characters")
                return extracted_text
            else:
                error_msg = result.get('ErrorMessage', 'Unknown OCR error')
                raise Exception(f"OCR processing failed: {error_msg}")
                
        except requests.exceptions.RequestException as e:
            self.logger.error(f"OCR API request failed: {e}")
            raise
        except Exception as e:
            self.logger.error(f"OCR extraction failed: {e}")
            raise
            
    def analyze_text_for_metadata(self, text: str, pdf_path: Path) -> SheetMusicMetadata:
        """Analyze OCR text to extract metadata using pattern matching"""
        
        # Initialize metadata with defaults
        metadata = SheetMusicMetadata(
            piece_name="Unknown Piece",
            instrument="Unknown",
            part_number="Unknown",
            raw_text=text
        )
        
        # Clean text for better matching
        clean_text = text.replace('\n', ' ').replace('\r', ' ')
        clean_text = re.sub(r'\s+', ' ', clean_text).strip()
        
        # Extract piece name
        piece_name = self.extract_piece_name(clean_text)
        if piece_name:
            metadata.piece_name = piece_name
            
        # Extract instrument
        instrument = self.extract_instrument(clean_text)
        if instrument:
            metadata.instrument = instrument
            
        # Extract part number
        part_number = self.extract_part_number(clean_text)
        if part_number:
            metadata.part_number = part_number
            
        # Extract key signature
        key_signature = self.extract_key_signature(clean_text)
        if key_signature:
            metadata.key_signature = key_signature
            
        # Calculate quality and confidence scores
        metadata.quality_score = self.calculate_quality_score(text)
        metadata.confidence = self.calculate_confidence_score(metadata)
        
        # Get page count (only for PDFs)
        if pdf_path.suffix.lower() == '.pdf':
            try:
                with open(pdf_path, 'rb') as f:
                    import PyPDF2
                    pdf_reader = PyPDF2.PdfReader(f)
                    metadata.page_count = len(pdf_reader.pages)
            except:
                metadata.page_count = 1
        else:
            metadata.page_count = 1
            
        return metadata
        
    def extract_piece_name(self, text: str) -> Optional[str]:
        """Extract piece name from text"""
        for pattern in self.piece_patterns:
            match = re.search(pattern, text)
            if match:
                piece_name = match.group(1).strip()
                # Clean up the piece name
                piece_name = re.sub(r'\s+', ' ', piece_name)
                if len(piece_name) > 3 and len(piece_name) < 50:
                    return piece_name
        return None
        
    def extract_instrument(self, text: str) -> Optional[str]:
        """Extract instrument from text with fuzzy matching for OCR errors"""
        # First try exact pattern matching
        for instrument, pattern in self.instrument_patterns.items():
            if re.search(pattern, text):
                self.logger.debug(f"Instrument matched: {instrument} via pattern")
                return instrument
                
        # Fuzzy matching for OCR errors
        instrument = self.fuzzy_match_instrument(text)
        if instrument:
            self.logger.info(f"Instrument fuzzy matched: {instrument}")
            return instrument
            
        return None
        
    def fuzzy_match_instrument(self, text: str) -> Optional[str]:
        """Fuzzy matching for instruments when OCR has errors"""
        import difflib
        
        # Extract potential instrument words (3+ letters)
        words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
        
        # Common instrument base words for fuzzy matching
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
                    # Use sequence matching for similarity
                    ratio = difflib.SequenceMatcher(None, word, keyword).ratio()
                    if ratio > 0.75 and ratio > best_ratio:  # 75% similarity threshold
                        best_match = instrument
                        best_ratio = ratio
                        self.logger.debug(f"Fuzzy match: '{word}' -> '{keyword}' ({ratio:.2f}) = {instrument}")
                        
        return best_match
        
    def extract_part_number(self, text: str) -> Optional[str]:
        """Extract part number from text"""
        for part, pattern in self.part_patterns.items():
            if re.search(pattern, text):
                return part
        return None
        
    def extract_key_signature(self, text: str) -> Optional[str]:
        """Extract key signature from text"""
        for key, pattern in self.key_patterns.items():
            if re.search(pattern, text):
                return key
        return None
        
    def calculate_quality_score(self, text: str) -> float:
        """Calculate quality score based on text characteristics"""
        if not text or len(text) < 10:
            return 0.1
            
        # Count readable words vs garbled text
        words = text.split()
        readable_words = sum(1 for word in words if len(word) > 2 and word.isalpha())
        total_words = len(words)
        
        if total_words == 0:
            return 0.1
            
        readable_ratio = readable_words / total_words
        
        # Penalize too many special characters (OCR errors)
        special_char_ratio = sum(1 for c in text if not c.isalnum() and c not in ' \n\r.,;:-') / len(text)
        
        quality_score = readable_ratio * (1 - min(special_char_ratio, 0.5))
        return max(0.1, min(1.0, quality_score))
        
    def calculate_confidence_score(self, metadata: SheetMusicMetadata) -> float:
        """Calculate confidence score based on extracted metadata"""
        confidence = 0.0
        
        # Award points for each successfully extracted field
        if metadata.piece_name != "Unknown Piece":
            confidence += 0.4
        if metadata.instrument != "Unknown":
            confidence += 0.3
        if metadata.part_number != "Unknown":
            confidence += 0.2
        if metadata.key_signature:
            confidence += 0.1
            
        return min(1.0, confidence)
            
    def check_duplicate_part(self, metadata: SheetMusicMetadata) -> bool:
        """Check if this part already exists for this piece"""
        piece = metadata.piece_name
        instrument = metadata.instrument
        part = metadata.part_number
        
        if piece in self.piece_inventory:
            if instrument in self.piece_inventory[piece]:
                if part in self.piece_inventory[piece][instrument]:
                    return True
                    
        return False
        
    def add_to_inventory(self, metadata: SheetMusicMetadata, filepath: str):
        """Add processed file to inventory tracking"""
        piece = metadata.piece_name
        instrument = metadata.instrument
        part = metadata.part_number
        
        if piece not in self.piece_inventory:
            self.piece_inventory[piece] = {}
        if instrument not in self.piece_inventory[piece]:
            self.piece_inventory[piece][instrument] = []
            
        self.piece_inventory[piece][instrument].append({
            'part': part,
            'file': filepath,
            'quality': metadata.quality_score
        })
        
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
        
    def sanitize_filename(self, name: str) -> str:
        """Sanitize string for use as filename/directory name"""
        # Replace problematic characters
        sanitized = re.sub(r'[<>:"/\\|?*]', '_', name)
        # Remove extra spaces and underscores
        sanitized = re.sub(r'[_\s]+', '_', sanitized)
        # Remove leading/trailing underscores
        sanitized = sanitized.strip('_')
        # Fallback for empty names
        if not sanitized:
            sanitized = "Unknown"
        return sanitized
        
    def process_file(self, file_path: Path) -> ProcessingResult:
        """Process a single scan file"""
        start_time = datetime.now()
        result = ProcessingResult(original_file=str(file_path), success=False)
        
        try:
            self.logger.info(f"Processing: {file_path.name}")
            
            # Check for duplicates
            file_hash = self.get_file_hash(file_path)
            if file_hash in self.processed_hashes:
                result.error = "Duplicate file (already processed)"
                self.stats['duplicates'] += 1
                return result
                
            # Create compressed copy for OCR (original stays untouched)
            compressed_path = self.compress_pdf(file_path)
            result.compressed_size = compressed_path.stat().st_size
            
            # Extract text with OCR.space using compressed copy
            extracted_text = self.extract_text_with_ocr(compressed_path)
            
            # Analyze text for metadata
            metadata = self.analyze_text_for_metadata(extracted_text, file_path)
            
            # Clean up compressed copy immediately
            if compressed_path.exists():
                compressed_path.unlink()
                self.logger.debug(f"Deleted OCR copy: {compressed_path.name}")
            result.metadata = metadata
            
            # Quality checks
            if metadata.quality_score < 0.5:
                result.warnings.append("Low quality scan - may need manual review")
                self.stats['low_quality'] += 1
                
            if metadata.confidence < 0.7:
                result.warnings.append("Low confidence in extraction - verify results")
                
            # Check for duplicate parts
            if self.check_duplicate_part(metadata):
                result.warnings.append("Duplicate part detected - keeping both versions")
                
            # Organize file
            final_path = self.organize_file(file_path, metadata)
            
            # Update tracking
            self.processed_hashes.add(file_hash)
            self.add_to_inventory(metadata, str(final_path))
            
            # Clean up temp file
            compressed_path.unlink()
            
            result.success = True
            self.stats['successful'] += 1
            
        except Exception as e:
            result.error = str(e)
            self.stats['failed'] += 1
            self.logger.error(f"Failed to process {file_path.name}: {e}")
            
        finally:
            result.processing_time = (datetime.now() - start_time).total_seconds()
            self.stats['processed'] += 1
            
        return result
        
    def process_batch(self, batch_size: int = 5) -> List[ProcessingResult]:
        """Process files in batches"""
        scan_files = self.find_raw_scans()
        results = []
        
        self.logger.info(f"Starting batch processing of {len(scan_files)} files")
        
        for i in range(0, len(scan_files), batch_size):
            batch = scan_files[i:i + batch_size]
            self.logger.info(f"Processing batch {i//batch_size + 1} ({len(batch)} files)")
            
            batch_results = []
            for file_path in batch:
                result = self.process_file(file_path)
                batch_results.append(result)
                results.append(result)
                
            # Log batch summary
            successful = sum(1 for r in batch_results if r.success)
            self.logger.info(f"Batch complete: {successful}/{len(batch)} successful")
            
        return results
        
    def generate_report(self, results: List[ProcessingResult]) -> str:
        """Generate processing report"""
        report_path = Path("reports") / f"processing_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        report_data = {
            'timestamp': datetime.now().isoformat(),
            'stats': self.stats,
            'piece_inventory': self.piece_inventory,
            'results': [asdict(r) for r in results],
            'warnings_summary': {
                'low_quality_files': [r.original_file for r in results if any('Low quality' in w for w in r.warnings)],
                'low_confidence_files': [r.original_file for r in results if any('Low confidence' in w for w in r.warnings)],
                'duplicate_parts': [r.original_file for r in results if any('Duplicate part' in w for w in r.warnings)]
            }
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
    
    parser = argparse.ArgumentParser(description="OCR.space-powered Sheet Music Processor")
    parser.add_argument("usb_path", help="Path to USB drive with raw scans")
    parser.add_argument("output_path", help="Output directory for organized files")
    parser.add_argument("--ocr-api-key", help="OCR.space API key (or set OCR_SPACE_API_KEY env var)")
    parser.add_argument("--batch-size", type=int, default=5, help="Batch size for processing")
    parser.add_argument("--dry-run", action="store_true", help="Preview only, don't process files")
    
    args = parser.parse_args()
    
    # Get API key
    api_key = args.ocr_api_key or os.getenv('OCR_SPACE_API_KEY')
    if not api_key:
        print("Error: OCR.space API key required. Set OCR_SPACE_API_KEY or use --ocr-api-key")
        sys.exit(1)
        
    # Validate paths
    usb_path = Path(args.usb_path)
    if not usb_path.exists():
        print(f"Error: USB path does not exist: {usb_path}")
        sys.exit(1)
        
    output_path = Path(args.output_path)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Create processor
    processor = SheetMusicProcessor(api_key, usb_path, output_path)
    
    try:
        if args.dry_run:
            scan_files = processor.find_raw_scans()
            print(f"Would process {len(scan_files)} files:")
            for f in scan_files[:10]:  # Show first 10
                print(f"  {f}")
            if len(scan_files) > 10:
                print(f"  ... and {len(scan_files) - 10} more")
        else:
            # Process files
            results = processor.process_batch(args.batch_size)
            
            # Generate report
            report_path = processor.generate_report(results)
            
            # Print summary
            print(f"\nProcessing Complete:")
            print(f"  Total files: {processor.stats['processed']}")
            print(f"  Successful: {processor.stats['successful']}")
            print(f"  Failed: {processor.stats['failed']}")
            print(f"  Duplicates: {processor.stats['duplicates']}")
            print(f"  Low quality: {processor.stats['low_quality']}")
            print(f"  Report: {report_path}")
            
    finally:
        processor.cleanup()


if __name__ == "__main__":
    main()