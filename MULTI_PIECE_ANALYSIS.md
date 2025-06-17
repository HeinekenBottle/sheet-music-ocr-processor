# Multi-Piece Processing Analysis

## Your Feodora Ouvertüre Example

**OCR Input from your image:**
```
Feodora
Ouvertüre
von P. Tschaikowsky
Arr.: G. Lotterer
Flöte
Grave
Maestoso
Moderato
Andante
```

## Enhanced Detection Results

### **Piece Information Detected:**
- **Title**: "Feodora Ouvertüre" 
- **Composer**: "Tchaikovsky" (normalized from "Tschaikowsky")
- **Arranger**: "G. Lotterer"
- **Style**: "Overture" (from "Ouvertüre")
- **Language**: "German" (detected from "von", "Ouvertüre")

### **Instrument Information:**
- **Instrument**: "Flute" (from German "Flöte")
- **Part**: Not specified (would be "Principal" or "Solo")
- **Key**: Not specified

## Organization Options

### **Option A: Piece-First Structure**
```
/Feodora_Ouverture/
├── Flute/
│   └── Feodora_Ouverture_Flute.pdf
├── Clarinet/
│   ├── 1st/
│   │   └── Bb/
│   │       └── Feodora_Ouverture_1st_Bb_Clarinet.pdf
│   └── 2nd/
│       └── Bb/
│           └── Feodora_Ouverture_2nd_Bb_Clarinet.pdf
└── Trumpet/
    └── 1st/
        └── Bb/
            └── Feodora_Ouverture_1st_Bb_Trumpet.pdf
```

### **Option B: Instrument-First Structure**
```
/Flute/
├── Feodora_Ouverture/
│   └── Feodora_Ouverture_Flute.pdf
├── French_Comedy_Overture/
│   └── French_Comedy_Overture_Flute.pdf
└── Wedding_March/
    └── Wedding_March_Flute.pdf

/Clarinet/
├── 1st/
│   └── Bb/
│       ├── Feodora_Ouverture/
│       │   └── Feodora_Ouverture_1st_Bb_Clarinet.pdf
│       ├── French_Comedy_Overture/
│       │   └── French_Comedy_Overture_1st_Bb_Clarinet.pdf
│       └── Wedding_March/
│           └── Wedding_March_1st_Bb_Clarinet.pdf
```

## Key Enhancements for Multiple Pieces

### 1. **Enhanced Pattern Recognition**

**German Language Support:**
```python
INSTRUMENT_PATTERNS = {
    # German patterns added
    r'\bflöte\b': 'Flute',
    r'\bklarinette\b': 'Clarinet', 
    r'\btrompete\b': 'Trumpet',
    r'\bposaune\b': 'Trombone',
    r'\bhorn\b': 'Horn',
    # ... etc
}
```

**Piece Style Detection:**
```python
PIECE_TITLE_PATTERNS = {
    r'\b(overture|ouverture|ouvertüre)\b': 'Overture',
    r'\b(march|marsch|marche)\b': 'March',
    r'\b(waltz|walzer|valse)\b': 'Waltz',
    # ... etc
}
```

**Composer Recognition:**
```python
COMPOSER_PATTERNS = {
    r'\b(tschaikowsky|tchaikovsky|чайковский)\b': 'Tchaikovsky',
    r'\b(mozart|w\.?\s*a\.?\s*mozart)\b': 'Mozart',
    # ... etc
}
```

### 2. **Multi-Language Part Detection**

```python
PART_PATTERNS = {
    # English
    r'\b1st\b': '1st',
    r'\bfirst\b': '1st',
    
    # German
    r'\berste[rs]?\b': '1st',
    r'\bzweite[rs]?\b': '2nd',
    
    # French  
    r'\bpremier\b': '1st',
    r'\bdeuxième\b': '2nd',
    
    # Italian
    r'\bprimo\b': '1st',
    r'\bsecondo\b': '2nd'
}
```

### 3. **Intelligent Duplicate Detection**

**Enhanced duplicate checking accounts for pieces:**
```python
def check_enhanced_duplicate(self, file_path, piece_info, music_info):
    # Check exact file duplicate
    file_hash = calculate_file_hash(file_path)
    
    # Check if same piece + instrument combination exists
    piece_key = f"{piece_info.title}_{music_info['instrument']}_{music_info['part']}"
    
    if piece_key in self.piece_registry:
        return True, f"Same piece+instrument already exists"
    
    return False, ""
```

## Required Changes to Current System

### 1. **Database/Registry Changes**
- Add piece tracking registry
- Enhanced file info structure
- Multi-language metadata storage

### 2. **Directory Structure Changes**
- Choose organization mode (piece-first vs instrument-first)
- Handle piece name normalization
- Manage duplicate piece names

### 3. **Processing Pipeline Changes**
```python
# Current pipeline:
File → OCR → Instrument → Directory → Archive

# Enhanced pipeline:
File → OCR → Piece+Instrument → Language → Directory → Archive
       ↓        ↓                ↓           ↓
   Text Ext → Parse Piece    → Detect    → Multi-level
              Parse Instr      Language     Structure
              Parse Part
```

### 4. **Configuration Options**

**New command-line options needed:**
```bash
# Choose organization structure
--org-mode piece_first|instrument_first

# Language preference
--language-priority german,english,french

# Piece detection sensitivity
--piece-detection strict|moderate|loose

# Handle unknown pieces
--unknown-pieces-mode group|separate|prompt
```

## Implementation Priority

### **Phase 1: Core Multi-Piece Support**
1. ✅ Enhanced pattern recognition (German, French, Italian)
2. ✅ Piece information extraction 
3. ✅ Flexible directory organization
4. 🔄 Complete processing pipeline integration

### **Phase 2: Advanced Features**
1. Language-specific processing modes
2. Composer database integration
3. Opus number organization
4. Movement tracking within pieces

### **Phase 3: User Experience**
1. Interactive piece identification for unknowns
2. Batch piece assignment
3. Piece merger/splitter utilities
4. Advanced reporting by piece and composer

## Recommendation for Your Use Case

**For your 1,600+ collection with multiple pieces:**

1. **Use piece-first organization** - easier to find complete sets
2. **Enable German language detection** - handles your classical pieces
3. **Start with moderate piece detection** - balance accuracy vs automation
4. **Process in smaller batches** - verify piece detection quality

**Command example:**
```bash
python3 multi_piece_processor.py ~/Desktop /Volumes/USB/SheetMusic \
  --move \
  --org-mode piece_first \
  --max-batch 10 \
  --log-level INFO
```

This would organize your collection as:
```
/Feodora_Ouverture/Flute/Feodora_Ouverture_Flute.pdf
/French_Comedy_Overture/Bassoon/2nd/French_Comedy_Overture_2nd_Bassoon.pdf
/Wedding_March/Trumpet/1st/Bb/Wedding_March_1st_Bb_Trumpet.pdf
```

**The enhanced system eliminates the file overwriting problem while providing intelligent organization by musical piece.**