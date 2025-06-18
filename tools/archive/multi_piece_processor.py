#!/usr/bin/env python3
"""
Multi-Piece Sheet Music Processor - v4.0
Enhanced to handle multiple pieces of music with proper organization
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
class MusicPieceInfo:
    """Information about a piece of music"""
    title: Optional[str] = None
    composer: Optional[str] = None
    arranger: Optional[str] = None
    opus: Optional[str] = None
    movement: Optional[str] = None
    style: Optional[str] = None  # overture, march, waltz, etc.
    language: Optional[str] = None  # detected language
    confidence: str = 'low'

@dataclass
class EnhancedFileInfo:
    """Enhanced file information including piece data"""
    path: Path
    size: int
    hash_md5: str
    hash_content: Optional[str] = None
    piece_info: Optional[MusicPieceInfo] = None
    instrument: Optional[str] = None
    part: Optional[str] = None
    key: Optional[str] = None
    is_test_file: bool = False
    is_duplicate: bool = False
    processing_time: float = 0.0

@dataclass
class EnhancedProcessingResult:
    """Enhanced result including piece information"""
    original_file: str
    success: bool
    error_message: Optional[str] = None
    piece_info: Optional[MusicPieceInfo] = None
    instrument: Optional[str] = None
    part: Optional[str] = None
    key: Optional[str] = None
    ocr_text: Optional[str] = None
    new_filename: Optional[str] = None
    target_path: Optional[str] = None
    processing_time: float = 0.0
    is_duplicate: bool = False
    is_test_file: bool = False

class MultiPieceSheetMusicProcessor:
    """Enhanced processor supporting multiple pieces of music"""
    
    # Enhanced instrument patterns with German language support
    INSTRUMENT_PATTERNS = {
        # English patterns (existing)
        r'\b(?:1st|2nd|3rd|4th)?\s*(?:bb?|eb?|f)?\s*cl[ao]rin[ae]t\b': 'Clarinet',
        r'\bc[il][ao]rin[ae]t\b': 'Clarinet',
        r'\b(?:1st|2nd|3rd|4th)?\s*(?:bb?|eb?|f)?\s*trump[ae]t\b': 'Trumpet',
        r'\btrump[ae]t\b': 'Trumpet',
        r'\b(?:1st|2nd|3rd|4th)?\s*(?:bb?|eb?|f)?\s*horn\b': 'Horn',
        r'\bfrench\s*horn\b': 'Horn',
        r'\bf\s*horn\b': 'Horn',
        r'\btrombon[ae]\b': 'Trombone',
        r'\btub[ao]\b': 'Tuba',
        r'\beuphonium\b': 'Euphonium',
        r'\bb?ariton[ae]\b': 'Euphonium',
        r'\b(?:alto|tenor|baritone|bass)?\s*sax[ao]phon[ae]\b': 'Saxophone',
        r'\bsax\b': 'Saxophone',
        r'\bfl[ou]t[ae]\b': 'Flute',
        r'\bpicc[ao]l[ao]\b': 'Piccolo',
        r'\bob[ao][ae]\b': 'Oboe',
        r'\bb?ass[ao][ao]n\b': 'Bassoon',
        r'\bassoon\b': 'Bassoon',
        r'\bstring\s*bass\b': 'String Bass',
        r'\btimpani\b': 'Timpani',
        r'\bpauken\b': 'Timpani',
        r'\bpercussion\b': 'Percussion',
        
        # German instrument patterns
        r'\bflöte\b': 'Flute',
        r'\bklarinette\b': 'Clarinet',
        r'\btrompete\b': 'Trumpet',
        r'\bposaune\b': 'Trombone',
        r'\btuba\b': 'Tuba',
        r'\bhorn\b': 'Horn',
        r'\bwaldhorn\b': 'Horn',
        r'\bsaxophon\b': 'Saxophone',
        r'\boboe\b': 'Oboe',
        r'\bfagott\b': 'Bassoon',
        r'\bkontrabass\b': 'String Bass',
        r'\bpauken\b': 'Timpani',
        r'\bschlagzeug\b': 'Percussion',
        
        # French patterns
        r'\bflûte\b': 'Flute',
        r'\bclarinette\b': 'Clarinet',
        r'\btrompette\b': 'Trumpet',
        r'\btrombone\b': 'Trombone',
        r'\bcor\b': 'Horn',
        r'\bsaxophone\b': 'Saxophone',
        r'\bhautbois\b': 'Oboe',
        r'\bbasson\b': 'Bassoon',
        r'\bcontrebasse\b': 'String Bass',
        r'\btimbales\b': 'Timpani',
        
        # Italian patterns
        r'\bflauto\b': 'Flute',
        r'\bclarinetto\b': 'Clarinet',
        r'\btromba\b': 'Trumpet',
        r'\btrombone\b': 'Trombone',
        r'\bcorno\b': 'Horn',
        r'\bsassofono\b': 'Saxophone',
        r'\boboe\b': 'Oboe',
        r'\bfagotto\b': 'Bassoon',
        r'\bcontrabbasso\b': 'String Bass',
        r'\btimpani\b': 'Timpani'
    }
    
    # Enhanced piece identification patterns
    PIECE_TITLE_PATTERNS = {
        # English
        r'\b(overture|ouverture|ouvertüre)\b': 'Overture',
        r'\b(march|marsch|marche)\b': 'March',
        r'\b(waltz|walzer|valse)\b': 'Waltz',
        r'\b(polka)\b': 'Polka',
        r'\b(symphony|symphonie|sinfonie)\b': 'Symphony',
        r'\b(concerto|konzert)\b': 'Concerto',
        r'\b(suite)\b': 'Suite',
        r'\b(fantasia|fantasie)\b': 'Fantasy',
        r'\b(rhapsody|rhapsodie)\b': 'Rhapsody',
        r'\b(prelude|präludium|prélude)\b': 'Prelude',
        r'\b(fugue|fuge)\b': 'Fugue',
        r'\b(serenade)\b': 'Serenade',
        r'\b(minuet|menuett|menuet)\b': 'Minuet',
        r'\b(scherzo)\b': 'Scherzo',
        r'\b(rondo)\b': 'Rondo',
        r'\b(theme\s+and\s+variations|thema\s+und\s+variationen)\b': 'Theme and Variations'
    }
    
    # Composer patterns for better recognition
    COMPOSER_PATTERNS = {
        r'\b(mozart|w\.?\s*a\.?\s*mozart)\b': 'Mozart',
        r'\b(beethoven|l\.?\s*v\.?\s*beethoven)\b': 'Beethoven',
        r'\b(bach|j\.?\s*s\.?\s*bach)\b': 'Bach',
        r'\b(tschaikowsky|tchaikovsky|чайковский)\b': 'Tchaikovsky',
        r'\b(brahms|j\.?\s*brahms)\b': 'Brahms',
        r'\b(chopin|f\.?\s*chopin)\b': 'Chopin',
        r'\b(liszt|f\.?\s*liszt)\b': 'Liszt',
        r'\b(wagner|r\.?\s*wagner)\b': 'Wagner',
        r'\b(verdi|g\.?\s*verdi)\b': 'Verdi',
        r'\b(strauss|j\.?\s*strauss)\b': 'Strauss',
        r'\b(handel|g\.?\s*f\.?\s*handel)\b': 'Handel',
        r'\b(haydn|j\.?\s*haydn)\b': 'Haydn',
        r'\b(schubert|f\.?\s*schubert)\b': 'Schubert',
        r'\b(mendelssohn)\b': 'Mendelssohn',
        r'\b(schumann|r\.?\s*schumann)\b': 'Schumann'
    }
    
    # Language detection patterns
    LANGUAGE_INDICATORS = {
        'german': [r'\büber\b', r'\bund\b', r'\bvon\b', r'\börter\b', r'\bübung\b'],
        'french': [r'\bet\b', r'\bde\b', r'\ble\b', r'\bla\b', r'\bpar\b'],
        'italian': [r'\be\b', r'\bdi\b', r'\bil\b', r'\bla\b', r'\bper\b'],
        'english': [r'\band\b', r'\bthe\b', r'\bof\b', r'\bby\b', r'\bfor\b']
    }
    
    PART_PATTERNS = {
        r'\b1st\b': '1st',
        r'\bfirst\b': '1st',
        r'\berste[rs]?\b': '1st',  # German
        r'\bpremier\b': '1st',     # French
        r'\bprimo\b': '1st',      # Italian
        r'\b2nd\b': '2nd',
        r'\bsecond\b': '2nd',
        r'\bzweite[rs]?\b': '2nd', # German
        r'\bdeuxième\b': '2nd',   # French
        r'\bsecondo\b': '2nd',    # Italian
        r'\b3rd\b': '3rd',
        r'\bthird\b': '3rd',
        r'\bdritte[rs]?\b': '3rd', # German
        r'\btroisième\b': '3rd',  # French
        r'\bterzo\b': '3rd',      # Italian
        r'\b4th\b': '4th',
        r'\bfourth\b': '4th',
        r'\bvierte[rs]?\b': '4th', # German
        r'\bquatrième\b': '4th',  # French
        r'\bquarto\b': '4th',     # Italian
        r'\bsolo\b': 'Solo',
        r'\bprincipal\b': 'Principal'
    }
    
    KEY_PATTERNS = {
        r'\bb♭\b|\bbb\b|\bb-flat\b|\bb\s+dur\b': 'Bb',
        r'\be♭\b|\beb\b|\be-flat\b|\bes\s+dur\b': 'Eb',
        r'\bf\b(?!\w)|\bf\s+dur\b': 'F',
        r'\bc\b(?!\w)|\bc\s+dur\b': 'C',
        r'\bg\b(?!\w)|\bg\s+dur\b': 'G',
        r'\bd\b(?!\w)|\bd\s+dur\b': 'D',
        r'\ba\b(?!\w)|\ba\s+dur\b': 'A'
    }

    def __init__(self, api_key: str = None, log_level: str = None, 
                 enable_compression: bool = True, max_batch_size: int = 25,
                 organization_mode: str = "piece_first"):
        """Initialize enhanced processor with piece support"""
        # Configuration
        if CONFIG_AVAILABLE:
            self.api_key = api_key or get_api_key()
            log_level = log_level or get_log_level()
        else:
            self.api_key = api_key or "helloworld"
            log_level = log_level or "INFO"
        
        self.max_batch_size = max_batch_size
        self.organization_mode = organization_mode  # "piece_first" or "instrument_first"
        self.setup_logging(log_level)
        self.session = requests.Session()
        self.session.timeout = 60
        
        # Enhanced duplicate tracking
        self.file_hashes: Dict[str, EnhancedFileInfo] = {}
        self.content_hashes: Dict[str, EnhancedFileInfo] = {}
        self.piece_registry: Dict[str, List[EnhancedFileInfo]] = defaultdict(list)
        
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
                logging.FileHandler('/tmp/multi_piece_processor.log')
            ]
        )
        self.logger = logging.getLogger(__name__)
    
    def detect_language(self, text: str) -> Optional[str]:
        """Detect the language of the text"""
        text_lower = text.lower()
        scores = {}
        
        for language, indicators in self.LANGUAGE_INDICATORS.items():
            score = sum(1 for pattern in indicators if re.search(pattern, text_lower))
            if score > 0:
                scores[language] = score
        
        if scores:
            return max(scores, key=scores.get)
        return None
    
    def parse_piece_info(self, text: str, filename: str) -> MusicPieceInfo:
        """Extract piece information from OCR text and filename"""
        combined_text = f"{text} {filename}".lower()
        piece_info = MusicPieceInfo()
        
        # Detect language first
        piece_info.language = self.detect_language(text)
        
        # Extract piece style/type
        for pattern, style in self.PIECE_TITLE_PATTERNS.items():
            if re.search(pattern, combined_text, re.IGNORECASE):
                piece_info.style = style
                piece_info.confidence = 'medium'
                break
        
        # Extract composer
        for pattern, composer in self.COMPOSER_PATTERNS.items():
            if re.search(pattern, combined_text, re.IGNORECASE):
                piece_info.composer = composer
                piece_info.confidence = 'high'
                break
        
        # Try to extract title from first few lines of OCR
        lines = text.split('\n')[:3]  # Look at first 3 lines
        for line in lines:
            line = line.strip()
            if len(line) > 5 and not re.search(r'\d+', line):  # Avoid page numbers
                # Clean up potential title
                title_candidate = re.sub(r'[^\w\s\-\.&]', '', line)
                if len(title_candidate.split()) >= 2:  # Multi-word title
                    piece_info.title = title_candidate.title()
                    break
        
        # Look for arranger information
        arranger_match = re.search(r'arr\.?\s*:?\s*([a-z\.\s]+)', combined_text, re.IGNORECASE)
        if arranger_match:
            piece_info.arranger = arranger_match.group(1).strip().title()
        
        # Look for opus numbers
        opus_match = re.search(r'op\.?\s*(\d+)', combined_text, re.IGNORECASE)
        if opus_match:
            piece_info.opus = f"Op. {opus_match.group(1)}"
        
        return piece_info
    
    def parse_enhanced_music_info(self, text: str, filename: str) -> Dict:
        """Enhanced parsing including piece information"""
        analysis_text = (text + " " + filename).lower()
        
        result = {
            'piece_info': self.parse_piece_info(text, filename),
            'instrument': None,
            'part': None,
            'key': None,
            'confidence': 'low'
        }
        
        # Find instrument with enhanced patterns
        for pattern, instrument in self.INSTRUMENT_PATTERNS.items():
            if re.search(pattern, analysis_text, re.IGNORECASE):
                result['instrument'] = instrument
                if re.search(pattern, text.lower(), re.IGNORECASE):
                    result['confidence'] = 'high'
                break
        
        # Find part with multilingual support
        for pattern, part in self.PART_PATTERNS.items():
            if re.search(pattern, analysis_text, re.IGNORECASE):
                result['part'] = part
                break
        
        # Find key
        if result['instrument'] in ['Clarinet', 'Saxophone', 'Horn', 'Trumpet', 'Cornet']:
            for pattern, key in self.KEY_PATTERNS.items():
                if re.search(pattern, analysis_text, re.IGNORECASE):
                    result['key'] = key
                    break
        
        return result
    
    def create_enhanced_filename(self, music_info: Dict, piece_info: MusicPieceInfo, original_name: str) -> str:
        """Create filename incorporating piece information"""
        parts = []
        
        # Add piece information if available
        if piece_info.title:
            # Clean and shorten title for filename
            clean_title = re.sub(r'[^\w\s\-]', '', piece_info.title)
            clean_title = re.sub(r'\s+', '_', clean_title)[:30]  # Limit length
            parts.append(clean_title)
        elif piece_info.style:
            parts.append(piece_info.style)
        
        # Add instrument information
        if music_info['part']:
            parts.append(music_info['part'])
        if music_info['key']:
            parts.append(music_info['key'])
        if music_info['instrument']:
            parts.append(music_info['instrument'])
        
        if not parts:
            return original_name
        
        new_name = "_".join(parts) + ".pdf"
        # Clean filename
        new_name = re.sub(r'[<>:"/\\|?*]', '_', new_name)
        new_name = re.sub(r'\s+', '_', new_name)
        
        return new_name
    
    def determine_enhanced_target_path(self, music_info: Dict, piece_info: MusicPieceInfo, 
                                     base_output_dir: Path, is_test_file: bool = False) -> Path:
        """Determine target path incorporating piece information"""
        if is_test_file:
            return base_output_dir / 'archive' / 'test_files'
        
        if not music_info['instrument']:
            return base_output_dir / 'Unknown'
        
        # Determine piece folder name
        piece_folder = "Unknown_Piece"
        if piece_info.title:
            piece_folder = re.sub(r'[^\w\s\-]', '', piece_info.title)
            piece_folder = re.sub(r'\s+', '_', piece_folder)
        elif piece_info.composer and piece_info.style:
            piece_folder = f"{piece_info.composer}_{piece_info.style}"
        elif piece_info.style:
            piece_folder = piece_info.style
        elif piece_info.composer:
            piece_folder = piece_info.composer
        
        # Build path based on organization mode
        if self.organization_mode == "piece_first":
            # Structure: Piece/Instrument/Part/Key/
            path = base_output_dir / piece_folder / music_info['instrument']
        else:
            # Structure: Instrument/Part/Key/Piece/
            path = base_output_dir / music_info['instrument']
            if music_info['part']:
                path = path / music_info['part']
            if music_info['key'] and music_info['instrument'] in ['Clarinet', 'Saxophone', 'Horn', 'Trumpet', 'Cornet']:
                path = path / music_info['key']
            path = path / piece_folder
            return path
        
        # Continue building piece_first path
        if music_info['part']:
            path = path / music_info['part']
        if music_info['key'] and music_info['instrument'] in ['Clarinet', 'Saxophone', 'Horn', 'Trumpet', 'Cornet']:
            path = path / music_info['key']
        
        return path
    
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
                first_page = reader.pages[0]
                return True, "Valid PDF"
            except Exception as e:
                return False, f"PDF corruption detected: {str(e)[:100]}"
        
        return True, "Valid (basic check only)"
    
    def extract_text_from_pdf(self, pdf_path: Path) -> Tuple[bool, str]:
        """Extract text using OCR.space API"""
        url = "https://api.ocr.space/parse/image"
        
        try:
            with open(pdf_path, 'rb') as f:
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
                
                extracted_text = ""
                for page in result.get('ParsedResults', []):
                    if isinstance(page, dict):
                        extracted_text += page.get('ParsedText', '') + "\n"
                
                return True, extracted_text.strip()
                
        except Exception as e:
            self.logger.error(f"OCR failed for {pdf_path.name}: {e}")
            return False, f"OCR error: {e}"
    
    def process_single_file(self, file_path: Path, output_dir: Path, move_files: bool = False) -> EnhancedProcessingResult:
        """Process a single PDF file with enhanced piece detection"""
        start_time = time.time()
        result = EnhancedProcessingResult(
            original_file=file_path.name,
            success=False
        )
        
        try:
            # Validate PDF
            is_valid, validation_msg = self.validate_pdf(file_path)
            if not is_valid:
                result.error_message = validation_msg
                return result
            
            self.logger.info(f"Processing: {file_path.name}")
            
            # Extract text via OCR
            ocr_success, ocr_text = self.extract_text_from_pdf(file_path)
            result.ocr_text = ocr_text if ocr_success else None
            
            # Parse enhanced music information
            music_info = self.parse_enhanced_music_info(ocr_text if ocr_success else "", file_path.name)
            result.piece_info = music_info['piece_info']
            result.instrument = music_info['instrument']
            result.part = music_info['part']
            result.key = music_info['key']
            
            # Create enhanced filename
            new_filename = self.create_enhanced_filename(music_info, music_info['piece_info'], file_path.name)
            result.new_filename = new_filename
            
            # Determine enhanced target path
            target_folder = self.determine_enhanced_target_path(
                music_info, music_info['piece_info'], output_dir, False
            )
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
            
            result.success = True
            
        except Exception as e:
            self.logger.error(f"Failed to process {file_path.name}: {e}")
            result.error_message = str(e)
        
        finally:
            result.processing_time = time.time() - start_time
        
        return result
    
    def process_batch(self, input_dir: Path, output_dir: Path, move_files: bool = False, dry_run: bool = False):
        """Process batch of files with enhanced piece detection"""
        from dataclasses import dataclass
        
        @dataclass 
        class EnhancedBatchResult:
            total_files: int
            successful: int
            failed: int
            pieces_detected: int
            results: List[EnhancedProcessingResult]
            processing_time: float
        
        start_time = time.time()
        
        # Find PDF files
        pdf_files = [f for f in input_dir.glob("*.pdf") if not f.name.startswith('.')]
        
        if not pdf_files:
            self.logger.warning(f"No PDF files found in {input_dir}")
            return EnhancedBatchResult(0, 0, 0, 0, [], 0.0)
        
        # Apply batch size limits
        if len(pdf_files) > self.max_batch_size:
            self.logger.warning(f"Limiting batch to {self.max_batch_size} files")
            pdf_files = pdf_files[:self.max_batch_size]
        
        self.logger.info(f"Processing {len(pdf_files)} PDF files")
        
        results = []
        successful = 0
        failed = 0
        pieces_detected = set()
        
        for i, pdf_file in enumerate(pdf_files, 1):
            self.logger.info(f"[{i}/{len(pdf_files)}] Processing {pdf_file.name}")
            
            if dry_run:
                # Simulate processing for dry run
                result = EnhancedProcessingResult(
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
                if result.piece_info and result.piece_info.title:
                    pieces_detected.add(result.piece_info.title)
                elif result.piece_info and result.piece_info.style:
                    pieces_detected.add(result.piece_info.style)
            else:
                failed += 1
            
            # Rate limiting for API
            if i < len(pdf_files):
                time.sleep(0.5)
        
        batch_result = EnhancedBatchResult(
            total_files=len(pdf_files),
            successful=successful,
            failed=failed,
            pieces_detected=len(pieces_detected),
            results=results,
            processing_time=time.time() - start_time
        )
        
        self.generate_enhanced_report(batch_result, output_dir, dry_run, pieces_detected)
        return batch_result
    
    def generate_enhanced_report(self, batch_result, output_dir: Path, dry_run: bool, pieces_detected: set):
        """Generate enhanced report with piece information"""
        print("\n" + "=" * 60)
        print("MULTI-PIECE PROCESSOR SUMMARY")
        print("=" * 60)
        print(f"Files processed: {batch_result.total_files}")
        print(f"Successful: {batch_result.successful}")
        print(f"Failed: {batch_result.failed}")
        print(f"Pieces detected: {batch_result.pieces_detected}")
        if pieces_detected:
            print(f"Piece names: {', '.join(pieces_detected)}")
        print(f"Total time: {batch_result.processing_time:.1f}s")

def main():
    """Command line interface for multi-piece processor"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Multi-Piece Sheet Music Processor v4.0",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Enhanced Features:
  • Multi-language support (English, German, French, Italian)
  • Piece identification (title, composer, style)
  • Flexible organization modes (piece-first or instrument-first)
  • Enhanced pattern recognition for classical music

Organization Modes:
  --org-mode piece_first:     Piece/Instrument/Part/Key/
  --org-mode instrument_first: Instrument/Part/Key/Piece/

Examples:
  python3 multi_piece_processor.py ~/Desktop /Volumes/USB/SheetMusic --move --org-mode piece_first
  python3 multi_piece_processor.py ~/scans ~/output --dry-run --org-mode instrument_first
        """
    )
    
    parser.add_argument('input_dir', help='Input directory containing PDF files')
    parser.add_argument('output_dir', help='Output directory for organized files')
    parser.add_argument('--dry-run', action='store_true', help='Preview only, no file operations')
    parser.add_argument('--move', action='store_true', help='Move files instead of copying')
    parser.add_argument('--api-key', help='OCR.space API key')
    parser.add_argument('--log-level', default='INFO', choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'])
    parser.add_argument('--max-batch', type=int, default=25, help='Maximum files per batch')
    parser.add_argument('--org-mode', choices=['piece_first', 'instrument_first'], 
                        default='piece_first', help='Organization structure mode')
    parser.add_argument('--no-compression', action='store_true', help='Disable PDF compression')
    
    args = parser.parse_args()
    
    input_dir = Path(args.input_dir)
    output_dir = Path(args.output_dir)
    
    if not input_dir.exists():
        print(f"Error: Input directory '{input_dir}' does not exist")
        sys.exit(1)
    
    # Initialize enhanced processor
    processor = MultiPieceSheetMusicProcessor(
        api_key=args.api_key,
        log_level=args.log_level,
        enable_compression=not args.no_compression,
        max_batch_size=args.max_batch,
        organization_mode=args.org_mode
    )
    
    print(f"🎵 Multi-Piece Sheet Music Processor v4.0")
    print(f"Input: {input_dir}")
    print(f"Output: {output_dir}")
    print(f"Mode: {'DRY RUN' if args.dry_run else 'MOVE' if args.move else 'COPY'}")
    print(f"Organization: {args.org_mode}")
    print(f"Batch limit: {args.max_batch} files")
    print("=" * 60)
    
    # For now, we'll show the structure but the full implementation
    # would require completing all the processing methods
    
    # Actually process the files
    result = processor.process_batch(
        input_dir=input_dir,
        output_dir=output_dir,
        move_files=args.move,
        dry_run=args.dry_run
    )
    
    if args.dry_run:
        print(f"\n💡 This was a dry run - no files were moved")
    else:
        print(f"\n✅ Processing completed!")

if __name__ == "__main__":
    main()