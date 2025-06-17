#!/bin/bash
echo "=== Sheet Music Digitization Project ==="
echo "Project Root: ~/sheet-music-project"
echo ""
echo "Quick Navigation:"
echo "  cd ~/sheet-music-project/tools     # Scripts and utilities"
echo "  cd ~/sheet-music-project/staging   # Incoming scans"
echo "  cd ~/sheet-music-project/organized # Final organized files"
echo ""
echo "Current Status:"
echo "Raw scans waiting: $(ls ~/sheet-music-project/staging/raw_scans/ 2>/dev/null | wc -l) files"
echo "To process: $(ls ~/sheet-music-project/staging/to_process/ 2>/dev/null | wc -l) files"
echo ""
cd ~/sheet-music-project/tools
pwd