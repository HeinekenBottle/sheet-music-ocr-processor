# USB Organization Decision Guide

## Your Current Situation

**Current USB Structure (Problematic):**
```
/Instrument/Part/Key/filename.pdf
/Bassoon/2nd/2nd_Bassoon.pdf (which piece??)
```

**Problem:** Multiple pieces share same instruments → overwrites when adding new pieces!

## Recommended Solutions

### **Option A: Piece-First Structure** ⭐ **RECOMMENDED**
```
/Piece_Name/Instrument/Part/Key/filename.pdf

/French_Comedy_Overture/
├── Bassoon/2nd/French_Comedy_2nd_Bassoon.pdf
├── Horn/1st/French_Comedy_1st_Horn.pdf
└── Trumpet/1st/Bb/French_Comedy_1st_Bb_Trumpet.pdf

/Feodora_Ouverture/
├── Flute/Feodora_Flute.pdf
├── Bassoon/2nd/Feodora_2nd_Bassoon.pdf
└── Clarinet/1st/Bb/Feodora_1st_Bb_Clarinet.pdf

/Unknown_Piece_Large/
├── Various_parts/
```

**Advantages:**
- ✅ No overwrites - each piece has its own space
- ✅ Easy to find complete sets for performance
- ✅ Clear separation of musical works
- ✅ Scales well for your 1,600+ collection

### **Option B: Instrument-First with Piece Subfolders**
```
/Instrument/Part/Key/Piece/filename.pdf

/Bassoon/2nd/
├── French_Comedy_Overture/French_Comedy_2nd_Bassoon.pdf
├── Feodora_Ouverture/Feodora_2nd_Bassoon.pdf
└── Wedding_March/Wedding_March_2nd_Bassoon.pdf
```

**Advantages:**
- ✅ Familiar structure
- ✅ Good for instrument-specific searches

**Disadvantages:**
- ❌ Harder to find complete piece sets
- ❌ More complex directory trees

## Implementation Commands

### **Step 1: Test Multi-Piece Detection**
```bash
# Test on a few Unknown files to see piece detection
python3 multi_piece_processor.py "/Volumes/STORE N GO/SheetMusic/Unknown" "/tmp/test_output" --dry-run --org-mode piece_first --max-batch 5
```

### **Step 2: Create Safe Backup**
```bash
# Create backup before reorganization
cp -r "/Volumes/STORE N GO/SheetMusic" "/Volumes/STORE N GO/SheetMusic_backup_$(date +%Y%m%d)"
```

### **Step 3: Reorganize to Piece-First Structure**
```bash
# Reorganize existing files
python3 multi_piece_processor.py "/Volumes/STORE N GO/SheetMusic" "/Volumes/STORE N GO/SheetMusic_reorganized" --org-mode piece_first --move --max-batch 10
```

### **Step 4: Replace Old Structure**
```bash
# After verification, replace old with new
mv "/Volumes/STORE N GO/SheetMusic" "/Volumes/STORE N GO/SheetMusic_old"
mv "/Volumes/STORE N GO/SheetMusic_reorganized" "/Volumes/STORE N GO/SheetMusic"
```

## Expected Result

**After Reorganization:**
```
/Volumes/STORE N GO/SheetMusic/
├── French_Comedy_Overture/
│   ├── Horn/1st/French_Comedy_1st_Horn.pdf
│   ├── Bassoon/French_Comedy_Bassoon.pdf
│   └── Timpani/French_Comedy_Timpani.pdf
├── Unknown_Piece_Large/
│   ├── [Files 3-7.pdf organized by detected instruments]
├── Unknown_Piece_15_Series/
│   ├── [Files with "15" prefix organized]
├── Feodora_Ouverture/
│   └── [Future files when you scan them]
└── archive/
    └── test_files/ (moved automatically)
```

## Decision Point

**For your situation, I recommend Option A (Piece-First)** because:
1. You have multiple pieces already mixed up
2. You're planning to scan 1,600+ more files
3. You need to prevent future overwrites
4. Complete piece sets are more useful than instrument groupings

**Next Step:** Run the test command above to see how well the multi-piece detection works on your Unknown files.