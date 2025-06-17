#!/bin/bash
# Install requirements for Sheet Music Processor v2.0

echo "🎵 Installing Sheet Music Processor v2.0 Requirements"
echo "=" * 60

# Check Python version
python3 --version
if [ $? -ne 0 ]; then
    echo "❌ Python 3 not found. Please install Python 3 first."
    exit 1
fi

echo "📦 Installing required packages..."

# Install PyPDF for PDF labeling
echo "Installing PyPDF for PDF metadata labeling..."
pip3 install pypdf

# Install requests if not already available
echo "Installing requests for OCR API calls..."
pip3 install requests

echo ""
echo "✅ Installation complete!"
echo ""
echo "🎵 Sheet Music Processor v2.0 Features:"
echo "   • Robust OCR processing with error handling"
echo "   • PDF metadata labeling (instrument, part, key)"  
echo "   • Intelligent file validation"
echo "   • Comprehensive logging and reporting"
echo "   • USB workflow automation"
echo ""
echo "Quick start:"
echo "   python3 sheet_music_processor.py ~/Desktop /Volumes/USB/SheetMusic --dry-run"
echo "   python3 usb_workflow_v2.py status"