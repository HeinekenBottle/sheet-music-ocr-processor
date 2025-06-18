#!/usr/bin/env python3
"""
Precise PDF Straightener - Use matrix transformations for exact angles
Works with any angle (not just 90° increments)

Usage: python3 precise_straightener.py input.pdf output.pdf angle
Example: python3 precise_straightener.py input.pdf output.pdf 2.5
"""

import sys
import fitz
import math
from pathlib import Path

def precise_straighten(input_path: str, output_path: str, angle: float):
    """Apply precise rotation using matrix transformation"""
    try:
        print(f"📄 Precise straightening: {input_path}")
        print(f"🔄 Applying {angle}° rotation using matrix transformation...")
        
        doc = fitz.open(input_path)
        
        for page_num, page in enumerate(doc):
            # Get page rectangle
            rect = page.rect
            center_x = (rect.x0 + rect.x1) / 2
            center_y = (rect.y0 + rect.y1) / 2
            
            print(f"   Page {page_num + 1}: {rect.width:.0f}x{rect.height:.0f}, center at ({center_x:.0f}, {center_y:.0f})")
            
            # Convert angle to radians
            angle_rad = math.radians(angle)
            cos_a = math.cos(angle_rad)
            sin_a = math.sin(angle_rad)
            
            # Create rotation matrix around center point
            # Step 1: Translate to origin
            matrix1 = fitz.Matrix(1, 0, 0, 1, -center_x, -center_y)
            # Step 2: Rotate
            matrix2 = fitz.Matrix(cos_a, sin_a, -sin_a, cos_a, 0, 0)
            # Step 3: Translate back
            matrix3 = fitz.Matrix(1, 0, 0, 1, center_x, center_y)
            
            # Combine transformations
            final_matrix = matrix1 * matrix2 * matrix3
            
            print(f"   Matrix: [{final_matrix.a:.3f}, {final_matrix.b:.3f}, {final_matrix.c:.3f}, {final_matrix.d:.3f}, {final_matrix.e:.1f}, {final_matrix.f:.1f}]")
            
            # Get current page contents
            try:
                contents = page.get_contents()
                
                # Create new content stream with transformation
                new_contents = f"q {final_matrix.a} {final_matrix.b} {final_matrix.c} {final_matrix.d} {final_matrix.e} {final_matrix.f} cm\n".encode()
                new_contents += contents
                new_contents += b"\nQ"
                
                # Apply new contents
                page.set_contents(new_contents)
                print(f"   ✅ Applied matrix transformation successfully")
                
            except Exception as content_error:
                print(f"   ❌ Matrix transformation failed: {content_error}")
                print(f"   ⚠️  This PDF may not support content stream modification")
        
        # Save with zero compression to preserve quality
        print(f"💾 Saving with zero compression...")
        doc.save(output_path, garbage=0, deflate=False, clean=False)
        doc.close()
        
        # Check result
        original_size = Path(input_path).stat().st_size
        new_size = Path(output_path).stat().st_size
        size_change = ((new_size - original_size) / original_size) * 100
        print(f"✅ Precise straightening complete!")
        print(f"📦 Size: {original_size//1024}KB → {new_size//1024}KB ({size_change:+.1f}%)")
        
        return True
        
    except Exception as e:
        print(f"❌ Precise straightening failed: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python3 precise_straightener.py input.pdf output.pdf angle")
        print("Example: python3 precise_straightener.py input.pdf output.pdf 2.5")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    rotation_angle = float(sys.argv[3])
    
    precise_straighten(input_file, output_file, rotation_angle)