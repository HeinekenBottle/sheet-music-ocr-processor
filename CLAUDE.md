# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a sheet music digitization and organization system designed to process scanned sheet music from the 1970s. The system has evolved from filename-based pattern matching to advanced visual analysis using Claude's image interpretation capabilities.

## Current Architecture (Visual Processing v4.0)

**Visual Analysis System:**
1. **PDF to JPEG conversion** - Uses macOS `qlmanage` and `sips` to convert PDFs to high-quality images
2. **Claude visual analysis** - Direct image interpretation to extract metadata from sheet music headers
3. **Intelligent organization** - Creates `Piece/Instrument/Part` folder structure based on extracted content
4. **Multi-language support** - Handles both English and German sheet music terminology

**Key Advantages over OCR:**
- No API dependencies or costs
- Better accuracy with musical terminology
- Can distinguish header text from musical notation
- Handles poor scan quality and varied fonts
- Supports German musical terms (Klarinette, Ouverture, etc.)

**Processing Strategy:**
- Extract piece names, instrument types, part designations, key signatures, and composers
- Handle continuation pages (page 2, 3, etc. of multi-page parts)
- Organize into logical hierarchy: `Piece_Name/Instrument/Part/filename.pdf`
- Support both individual parts and complete band/orchestra sets

## Essential Commands

**Current Visual Processing Workflow:**
```bash
# Main visual processor - converts PDFs to JPEGs for Claude analysis
python3 ~/sheet-music-project/tools/claude_visual_processor.py "/Volumes/USB" "/output/path"

# Clean up organizational issues (Unknown folders, file naming)
python3 ~/sheet-music-project/tools/cleanup_organization.py

# Handle German language sheet music specifically
python3 ~/sheet-music-project/tools/reorganize_german_files.py

# Organize continuation pages and multi-page parts
python3 ~/sheet-music-project/tools/organize_continuation_pages.py

# Final cleanup - eliminate remaining Unknown folders
python3 ~/sheet-music-project/tools/final_cleanup.py

# OPTIONAL: Straighten tilted PDFs (preserves vector quality)
python3 ~/sheet-music-project/tools/fixed_pdf_straightener.py "/input/path" "/output/path"
```

**Legacy filename-based workflow (still available):**
```bash
# Preview what files are ready (safe preview)
~/organize-preview

# Organize files to USB drive (moves files, cleans Desktop)
~/organize-music "/Volumes/STORE N GO/SheetMusic"

# Show available USB drives and setup guidance
~/usb-setup
```

## Project Structure Logic

**Directory organization:**
- `tools/` - All executable scripts and core logic
- `organized/` - Local organized output (for testing)
- `reports/` - Processing logs and summaries from visual analysis

**Visual Processing Output Structure:**
- `Piece_Name/Instrument/Part/descriptive_filename.pdf`
- Examples:
  - `Feodora_Ouverture/Clarinet/2nd_and_3rd/Feodora_Ouverture_Clarinet_2nd_3rd.pdf`
  - `French_Comedy_Overture/Trumpet/1st/French_Comedy_Overture_Trumpet_1st.pdf`

## Key Integration Points

**USB Drive Processing:**
- Processes all PDFs recursively from USB drive
- Creates organized structure directly on USB
- Preserves original files in archive folders
- Handles both English and German sheet music

**German Language Support:**
- Recognizes German musical terms: Klarinette, Trompete, Posaune, etc.
- Handles German composers: "von P. Tschaikowsky"
- Supports German publishers: "Georg Bauer, Musikverlag, Karlsruhe"
- Processes German part designations: "II und III", "in B", etc.

**Multi-page Part Handling:**
- Identifies continuation pages by page numbers
- Groups related pages in same instrument folder
- Maintains page sequence with descriptive naming
- Handles complex band arrangements with multiple movements

## Operational Context

**Modern Visual Workflow:**
The system now processes complete USB drives containing 100+ scanned PDFs. It uses Claude's visual analysis to identify piece names, instruments, and parts directly from the sheet music headers, creating a perfectly organized library structure.

**Success Stories:**
- Successfully organized "Feodora Ouverture" (23 parts) - German band arrangement by Tchaikovsky
- Organized "French Comedy Overture" (25+ parts) - English band arrangement by Kéler Béla
- 100% identification rate when German language support is properly applied
- Eliminated all "Unknown" folders through improved visual analysis

**Legacy Support:**
The original filename-based system remains available for processing files that have been pre-renamed through the Cloud App workflow.