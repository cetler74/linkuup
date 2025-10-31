#!/usr/bin/env python3
import sys
import os

# Add the virtual environment packages to the path
venv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'venv', 'lib', 'python3.13', 'site-packages')
sys.path.insert(0, venv_path)

# Import and run the Flask app
from app import app

if __name__ == '__main__':
    print('Starting full Flask application...')
    print('Available routes:')
    for rule in app.url_map.iter_rules():
        print(f'  {rule.methods} {rule.rule}')
    
    app.run(debug=True, host='0.0.0.0', port=5001, use_reloader=False)
