# Sheet Music Digitization and Organization System

A comprehensive Python-based system for digitizing, organizing, and managing large collections of sheet music using OCR technology and intelligent pattern recognition.

## Overview

This system was designed to process a collection of 1,600+ sheet music arrangements from the 1970s, with support for:
- Multi-piece organization (prevents file overwrites)
- Multi-language recognition (English, German, French, Italian)  
- OCR-based classification by instrument, part, and key
- USB workflow automation
- Duplicate detection and test file management
- Batch processing with system resource protection

## Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure API Key
```bash
# Copy your OCR.space API key to .env file
echo "OCR_API_KEY=your_api_key_here" > .env
```

### 3. Process Files
```bash
# Process new scans to organized structure
python3 tools/multi_piece_processor.py ~/Desktop /Volumes/USB/SheetMusic --org-mode piece_first --move

# Reorganize existing USB collection
python3 tools/usb_piece_reorganizer.py "/Volumes/USB" --reorganize --api-key YOUR_KEY
```

## Core Features

### 🎵 Multi-Piece Organization
Organizes files by musical piece to prevent overwrites:
```
/French_Comedy_Overture/
├── Bassoon/2nd/French_Comedy_2nd_Bassoon.pdf
├── Clarinet/1st/Bb/French_Comedy_1st_Bb_Clarinet.pdf
└── Trumpet/1st/Bb/French_Comedy_1st_Bb_Trumpet.pdf

/Feodora_Ouverture/
├── Flute/Feodora_Flute.pdf
└── [additional instruments]
```

### 🌍 Multi-Language Support
Recognizes instruments in multiple languages:
- **German:** Flöte → Flute, Klarinette → Clarinet
- **French:** Flûte → Flute, Clarinette → Clarinet  
- **Italian:** Flauto → Flute, Clarinetto → Clarinet

### 🔍 Intelligent Pattern Recognition
Enhanced OCR error tolerance:
- "assoon" → Bassoon (handles OCR errors)
- "Tschaikowsky" → Tchaikovsky (composer normalization)
- "Ouvertüre" → Overture (style detection)

### 🔄 USB Workflow Integration
Automated processing pipeline:
1. Scan documents → Cloud App → Desktop
2. Auto-detect and organize by piece/instrument
3. Transfer to USB with proper structure
4. Clean up source files

## Architecture

### Core Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `multi_piece_processor.py` | Main processing engine with multi-piece support | Production processing |
| `usb_piece_reorganizer.py` | Reorganize existing collections | One-time reorganization |
| `quick_usb_reorganizer.py` | Fast pattern-based organization | Quick setup |
| `cleanup_test_files.py` | Archive test and sample files | Maintenance |

### Legacy Scripts (Consolidated)
- `sheet_music_processor.py` → Consolidated into `multi_piece_processor.py`
- `pdf_compressor.py` → Integrated compression features
- `usb_workflow_v2.py` → Updated to use unified processor

### Configuration
- `config.py` - API key and settings management
- `.env` - Environment variables (API keys, log levels)
- `requirements.txt` - Python dependencies

## Usage Examples

### Basic Processing
```bash
# Process Desktop files to USB with piece-first organization
python3 tools/multi_piece_processor.py ~/Desktop "/Volumes/USB/SheetMusic" \
  --org-mode piece_first \
  --move \
  --max-batch 15

# Preview processing without moving files
python3 tools/multi_piece_processor.py ~/scans ~/output --dry-run
```

### USB Reorganization
```bash
# Analyze existing USB structure
python3 tools/usb_piece_reorganizer.py "/Volumes/USB" --analyze

# Reorganize to piece-first structure (with backup)
python3 tools/usb_piece_reorganizer.py "/Volumes/USB" --reorganize --api-key YOUR_KEY
```

### Test File Cleanup
```bash
# Move test files to archive
python3 tools/cleanup_test_files.py "/Volumes/USB/SheetMusic" --clean-empty-dirs
```

## Processing Pipeline

```
Raw PDF Input → Validation → OCR → Classification → Organization → Archive
     ↓              ↓         ↓         ↓             ↓            ↓
  File exists?  → Structure? → Text? → Piece/Inst? → Directory → Report
  Size check    → Corrupt?   → API    → Part/Key   → Hierarchy
  Format check  → Pages?     → Call   → Patterns   → Filename
```

## Directory Structure

### Input Sources
- `staging/raw_scans/` - Incoming unprocessed files
- Desktop files from Cloud App workflow

### Output Structure (Piece-First)
```
organized/ or USB/SheetMusic/
├── French_Comedy_Overture/
│   ├── Bassoon/2nd/
│   ├── Clarinet/1st/Bb/
│   └── Trumpet/1st/Bb/
├── Feodora_Ouverture/
│   └── Flute/
├── Wedding_March/
└── archive/
    └── test_files/
```

## System Requirements

### Hardware
- **Minimum:** MacBook Pro 2015 or equivalent
- **RAM:** 8GB+ recommended for large batches
- **Storage:** External USB drive for organized collection

### Software
- Python 3.7+
- OCR.space API account (free tier available)
- PyPDF library for PDF processing
- Requests library for API communication

### Batch Processing Limits
- **Default:** 25 files per batch (configurable)
- **Recommended for older hardware:** 10-15 files
- **Rate limiting:** 0.5s delay between OCR calls

## API Configuration

### OCR.space Setup
1. Register at [ocr.space](https://ocr.space/ocrapi)
2. Get your API key
3. Add to `.env` file:
   ```bash
   OCR_API_KEY=your_key_here
   LOG_LEVEL=INFO
   ```

### Usage Limits
- **Free tier:** 25,000 requests/month
- **File size limit:** 1MB (automatic compression available)
- **Supported formats:** PDF, JPG, PNG

## Error Handling

### Comprehensive Validation
- PDF structure integrity checking
- File size and format validation
- OCR API error handling with fallbacks
- Duplicate detection (file hash + content similarity)

### Recovery Mechanisms
- Automatic backup creation before reorganization
- Graceful degradation when OCR fails
- Rate limiting and timeout handling
- Detailed error reporting and logging

## Production Deployment

### For 1,600+ Collection Processing
```bash
# Recommended batch size for large collections
python3 tools/multi_piece_processor.py ~/staging "/Volumes/USB/SheetMusic" \
  --org-mode piece_first \
  --move \
  --max-batch 15 \
  --log-level INFO

# Estimated processing time: 2.5-3.5 hours for full collection
# Memory usage: <500MB sustained
```

### Monitoring and Reporting
- Processing reports with statistics
- OCR success rate tracking
- Piece detection accuracy metrics
- Error logging and debugging information

## Contributing

This system was developed for a specific collection but can be adapted for other sheet music digitization projects. Key areas for enhancement:

1. **Additional Language Support** - Expand instrument pattern recognition
2. **Composer Database Integration** - Enhanced composer recognition
3. **Movement Tracking** - Multi-movement work organization
4. **Advanced OCR** - Integration with alternative OCR services

## License

Developed for personal sheet music collection management. See individual file headers for specific licensing information.

## Version History

- **v4.0** - Multi-piece support with enhanced language recognition
- **v3.0** - Unified processor with duplicate detection and batch limits
- **v2.0** - OCR integration and comprehensive error handling  
- **v1.0** - Basic filename-based organization

## Support

For issues or questions about adapting this system:
1. Check the processing logs in `/tmp/sheet_music_processor.log`
2. Review error messages in processing reports
3. Verify API key configuration and limits
4. Test with small batches before processing large collections