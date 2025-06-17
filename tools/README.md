# Sheet Music Processing System V2.0

Robust, error-handled system for OCR processing, organization, and PDF labeling of sheet music.

## System Overview

**V2.0 Features:**
- ✅ PDF metadata labeling (adds instrument/part/key directly to PDF files)
- ✅ Comprehensive error handling and validation  
- ✅ Professional logging and detailed reports
- ✅ File integrity checking and recovery
- ✅ Auto-cleanup of processed directories
- ✅ Batch processing with progress tracking

## Main Files

### Core System
- `sheet_music_processor.py` - Main processing engine with OCR, organization, and PDF labeling
- `usb_workflow_v2.py` - USB workflow manager with auto-detection
- `install_requirements.sh` - Install PyPDF and dependencies

## Quick Start

1. **Install dependencies:**
```bash
~/sheet-music-project/tools/install_requirements.sh
```

2. **Main workflows:**
```bash
~/organize-preview                              # Preview Desktop files
~/organize-music "/Volumes/USB/SheetMusic"     # Process Desktop → USB
~/preview-usb                                   # Preview USB raw scans  
~/process-usb                                   # Process USB raw scans
```

3. **Direct V2 commands:**
```bash
~/process-music-v2 ~/Desktop ~/organized --dry-run    # Preview processing
~/usb-workflow-v2 status                              # Check USB drives
```

## Workflow Types

### Desktop Processing
Cloud App renamed files → Desktop → OCR + Organization → USB with metadata

### USB Auto-Processing  
Raw scans on USB → Auto-detect → OCR → Organize → Cleanup → Add metadata

## Dependencies

- Python 3
- requests (for OCR.space API)
- pypdf (for PDF metadata labeling)
- OCR.space API (free: 500 requests/day)

## File Organization + Labeling

Organized structure with embedded PDF metadata:
```
SheetMusic/
├── Clarinet/
│   ├── 1st/
│   │   ├── Bb/
│   │   │   └── 1st_Bb_Clarinet.pdf (+ metadata)
│   │   └── Eb/
│   └── 2nd/
├── Trumpet/
└── Unknown/
```

Each PDF contains metadata: instrument, part, key, OCR text, processing info.