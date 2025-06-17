# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a sheet music digitization and organization system designed to process 1,600+ scanned arrangements from the 1970s. The workflow involves scanning PDFs, renaming them via a Cloud App, and automatically organizing them into a structured directory system based on instrument, part, and key signatures.

## Core Architecture

**Two-layer system:**
1. **Python core** (`organize_by_filename.py`) - Pattern matching and file organization logic
2. **Shell wrapper** (`organize_music.sh`) - User interface and USB drive integration

**Parsing Strategy:**
- Regex-based instrument detection using `INSTRUMENT_PATTERNS` dictionary
- Part number extraction via `PART_PATTERNS` (1st, 2nd, 3rd, etc.)
- Key signature identification through `KEY_PATTERNS` (Bb, Eb, F, etc.)
- Hierarchical folder creation: `Instrument/Part/Key/filename.pdf`

**File Movement Architecture:**
- **Move mode** (default): Files transferred from Desktop to USB, source cleaned
- **Copy mode**: Files duplicated, source preserved
- **Dry-run mode**: Preview-only, no file operations

## Essential Commands

**Daily workflow commands:**
```bash
# Preview what files are ready (safe preview)
~/organize-preview

# Organize files to USB drive (moves files, cleans Desktop)
~/organize-music "/Volumes/STORE N GO/SheetMusic"

# Show available USB drives and setup guidance
~/usb-setup
```

**Development and testing:**
```bash
# Test with custom source and destination
~/sheet-music-project/tools/organize_music.sh ~/Downloads /path/to/output --dry-run

# Direct Python script usage
python3 ~/sheet-music-project/tools/organize_by_filename.py input_dir output_dir --move

# USB drive detection and path setup
~/sheet-music-project/tools/setup_usb.sh
```

## Project Structure Logic

**Directory organization:**
- `tools/` - All executable scripts and core logic
- `organized/` - Local organized output (for testing)
- `staging/raw_scans/` - Incoming unprocessed files
- `reports/` - Organization logs and summaries

**Global command shortcuts:**
- `~/organize-music`, `~/organize-preview`, `~/usb-setup` are symlinks to main scripts
- Enable running organizer from any directory without path specification

## Key Integration Points

**USB Drive Integration:**
- Default target: `/Volumes/YourUSB/SheetMusic` (configurable in `organize_music.sh` line 10)
- Automatic USB detection and validation before file operations
- Batch processing accumulates files in existing USB structure

**Cloud App Integration:**
- Expects renamed files in format: `009_1stBbClarinet.pdf`
- Processes files from Desktop by default
- Handles various naming conventions and abbreviations

**Pattern Recognition:**
- Instrument patterns support multiple abbreviations (`clarinet|cl|clar`)
- Transposing instruments get additional key subdirectories
- Unknown instruments sorted into `Unknown/` folder with detailed reporting

## Operational Context

This system processes batches of 5-7 files at a time from a scanner → Cloud App → Desktop → USB workflow. The USB drive serves as the master organized library that grows with each processing batch. Files are moved (not copied) to keep the Desktop clean for subsequent batches.