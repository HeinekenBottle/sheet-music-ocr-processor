# 🎵 USB Multi-Piece Reorganization Guide

## Current Situation Analysis

**Your USB currently has:** 39 files across 7 instruments + 26 Unknown files
**Problem:** Multiple pieces mixed together in same instrument folders → overwrites!
**Detected pieces:** French Comedy Overture + several unknown pieces in large files

## Step-by-Step Implementation

### **Phase 1: Safe Testing (MANDATORY FIRST STEP)**

#### 1.1 Create Complete Backup
```bash
# Create timestamped backup
cp -r "/Volumes/STORE N GO/SheetMusic" "/Volumes/STORE N GO/SheetMusic_backup_$(date +%Y%m%d_%H%M)"
```

#### 1.2 Test Multi-Piece Detection on Small Batch
```bash
# Test on just 5 Unknown files to see piece detection quality
python3 multi_piece_processor.py \
    "/Volumes/STORE N GO/SheetMusic/Unknown" \
    "/tmp/test_reorganization" \
    --dry-run \
    --org-mode piece_first \
    --max-batch 5

# Review the results in /tmp/test_reorganization/
```

#### 1.3 Analyze Test Results
Check the generated directory structure:
```
/tmp/test_reorganization/
├── French_Comedy_Overture/
│   └── Horn/1st/
├── Unknown_Piece/
│   └── Various/
└── Preview/ (dry-run files)
```

### **Phase 2: Choose Organization Strategy**

#### Option A: Piece-First (RECOMMENDED)
```
/French_Comedy_Overture/
├── Bassoon/2nd/French_Comedy_2nd_Bassoon.pdf
├── Horn/1st/French_Comedy_1st_Horn.pdf
└── Timpani/French_Comedy_Timpani.pdf

/Feodora_Ouverture/
├── Flute/Feodora_Flute.pdf
└── [future files]
```

#### Option B: Keep Current + Piece Subfolders  
```
/Bassoon/2nd/
├── French_Comedy_Overture/French_Comedy_2nd_Bassoon.pdf
├── Feodora_Ouverture/Feodora_2nd_Bassoon.pdf
└── Unknown_Piece/Unknown_2nd_Bassoon.pdf
```

### **Phase 3: Full Reorganization**

#### 3.1 Process All Files with Enhanced Detection
```bash
# Process everything into new organized structure
python3 multi_piece_processor.py \
    "/Volumes/STORE N GO/SheetMusic" \
    "/Volumes/STORE N GO/SheetMusic_reorganized" \
    --org-mode piece_first \
    --move \
    --max-batch 15 \
    --log-level INFO

# Note: This processes the ENTIRE USB including both organized and Unknown files
```

#### 3.2 Review and Verify Results
```bash
# Check the new structure
ls -la "/Volumes/STORE N GO/SheetMusic_reorganized/"

# Look for:
# - French_Comedy_Overture/ (should have 7+ files)
# - Unknown_Piece/ (large collection)
# - Individual pieces detected from large files
# - archive/test_files/ (test scans moved here)
```

#### 3.3 Replace Old Structure (AFTER VERIFICATION)
```bash
# Only after confirming new structure looks good!
mv "/Volumes/STORE N GO/SheetMusic" "/Volumes/STORE N GO/SheetMusic_old"
mv "/Volumes/STORE N GO/SheetMusic_reorganized" "/Volumes/STORE N GO/SheetMusic"
```

### **Phase 4: Process Future Files**

#### 4.1 Set Up Workflow for New Scans
```bash
# For new scans (like your Feodora Ouvertüre)
python3 multi_piece_processor.py \
    ~/Desktop \
    "/Volumes/STORE N GO/SheetMusic" \
    --org-mode piece_first \
    --move \
    --max-batch 10

# This will automatically:
# - Detect "Feodora Ouvertüre" as piece name
# - Detect "Flöte" as Flute instrument
# - Create: /Feodora_Ouverture/Flute/Feodora_Ouverture_Flute.pdf
```

## Expected Final Structure

After reorganization, your USB will look like:

```
/Volumes/STORE N GO/SheetMusic/
├── French_Comedy_Overture/           # 7+ files from current collection
│   ├── Bassoon/
│   │   └── 2nd/French_Comedy_2nd_Bassoon.pdf
│   ├── Horn/
│   │   └── 1st/French_Comedy_1st_Horn.pdf
│   ├── Timpani/French_Comedy_Timpani.pdf
│   └── ...
├── Unknown_Piece_Large/              # Files 3-7.pdf organized
│   ├── [Various detected instruments]
├── Unknown_Piece_15_Series/          # Files with "15" prefix  
│   ├── [Various detected instruments]
├── Feodora_Ouverture/               # Future scanned files
│   └── Flute/Feodora_Ouverture_Flute.pdf
├── Wedding_March/                   # Future scanned files
├── archive/
│   ├── test_files/                  # Test scans moved here
│   └── cleanup_report.txt
└── processing_report.txt
```

## Key Benefits

### ✅ **Problem Solved**
- **No more overwrites** - each piece has its own space
- **Easy to find complete sets** for performance
- **Scalable** for your 1,600+ collection
- **Automatic piece detection** for new scans

### ✅ **Enhanced Features**
- **Multi-language support** (German "Flöte" → Flute)
- **Composer detection** (Tschaikowsky → Tchaikovsky)  
- **Style detection** (Ouvertüre → Overture)
- **Test file cleanup** (moved to archive automatically)

## Commands for Your Immediate Use

### **Safe Test Run (START HERE):**
```bash
python3 multi_piece_processor.py \
    "/Volumes/STORE N GO/SheetMusic/Unknown" \
    "/tmp/usb_test" \
    --dry-run \
    --org-mode piece_first \
    --max-batch 5
```

### **Full Reorganization (AFTER TESTING):**
```bash
# 1. Create backup
cp -r "/Volumes/STORE N GO/SheetMusic" "/Volumes/STORE N GO/SheetMusic_backup_$(date +%Y%m%d)"

# 2. Reorganize 
python3 multi_piece_processor.py \
    "/Volumes/STORE N GO/SheetMusic" \
    "/Volumes/STORE N GO/SheetMusic_reorganized" \
    --org-mode piece_first \
    --move \
    --max-batch 15

# 3. Verify and replace (after checking results)
mv "/Volumes/STORE N GO/SheetMusic" "/Volumes/STORE N GO/SheetMusic_old"
mv "/Volumes/STORE N GO/SheetMusic_reorganized" "/Volumes/STORE N GO/SheetMusic"
```

### **Process New Scans (FUTURE USE):**
```bash
# Process new scans from Desktop to organized USB
python3 multi_piece_processor.py \
    ~/Desktop \
    "/Volumes/STORE N GO/SheetMusic" \
    --org-mode piece_first \
    --move \
    --max-batch 10
```

**This solves your multi-piece problem while maintaining all existing features for production use with your 1,600+ collection!**