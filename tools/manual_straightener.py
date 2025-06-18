#!/usr/bin/env python3
"""
Manual PDF Straightener - Apply specific rotation angle
For when automatic detection gets the direction wrong

Usage: python3 manual_straightener.py input.pdf output.pdf angle
Example: python3 manual_straightener.py input.pdf output.pdf 2.5
"""

import sys
import fitz
from pathlib import Path

def manual_straighten(input_path: str, output_path: str, angle: float):
    """Apply manual rotation angle to PDF"""
    try:
        print(f"📄 Manual straightening: {input_path}")
        print(f"🔄 Applying {angle}° rotation...")
        
        doc = fitz.open(input_path)
        
        for page_num, page in enumerate(doc):
            current_rotation = page.rotation
            new_rotation = (current_rotation + int(angle)) % 360
            page.set_rotation(new_rotation)
            print(f"   Page {page_num + 1}: {current_rotation}° → {new_rotation}°")
        
        # Save with zero compression
        doc.save(output_path, garbage=0, deflate=False, clean=False)
        doc.close()
        
        # Check result
        original_size = Path(input_path).stat().st_size
        new_size = Path(output_path).stat().st_size
        print(f"✅ Manual straightening complete!")
        print(f"📦 Size: {original_size//1024}KB → {new_size//1024}KB")
        
        return True
        
    except Exception as e:
        print(f"❌ Manual straightening failed: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python3 manual_straightener.py input.pdf output.pdf angle")
        print("Example: python3 manual_straightener.py input.pdf output.pdf 2.5")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    rotation_angle = float(sys.argv[3])
    
    manual_straighten(input_file, output_file, rotation_angle)