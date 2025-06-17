#!/usr/bin/env python3
"""
Configuration management for Sheet Music Processor
Handles API keys and settings
"""
import os
from pathlib import Path

def load_config():
    """Load configuration from .env file"""
    config = {
        'api_key': 'helloworld',  # Default fallback
        'log_level': 'INFO'
    }
    
    # Look for .env file in project root
    project_root = Path(__file__).parent
    env_file = project_root / '.env'
    
    if env_file.exists():
        with open(env_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    key = key.strip().lower()
                    value = value.strip()
                    
                    if key == 'ocr_api_key':
                        config['api_key'] = value
                    elif key == 'log_level':
                        config['log_level'] = value
    
    # Environment variables override .env file
    if 'OCR_API_KEY' in os.environ:
        config['api_key'] = os.environ['OCR_API_KEY']
    if 'LOG_LEVEL' in os.environ:
        config['log_level'] = os.environ['LOG_LEVEL']
    
    return config

def get_api_key():
    """Get the OCR API key"""
    return load_config()['api_key']

def get_log_level():
    """Get the logging level"""
    return load_config()['log_level']