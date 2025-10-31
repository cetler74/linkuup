#!/usr/bin/env python3
"""
Customer validation module for LinkUup.
Validates customer IDs against the Clientes.csv file.
"""

import csv
import os
from typing import Set

# Global set to store valid customer codes
_valid_customer_codes: Set[str] = None

def load_customer_codes() -> Set[str]:
    """Load customer codes from Clientes.csv file"""
    global _valid_customer_codes
    
    if _valid_customer_codes is not None:
        return _valid_customer_codes
    
    # Try multiple possible paths for the CSV file
    possible_paths = [
        os.path.join(os.path.dirname(__file__), '..', 'Clientes.csv'),  # Original path
        os.path.join(os.path.dirname(__file__), '..', '..', 'Clientes.csv'),  # One level up
        os.path.join(os.getcwd(), 'Clientes.csv'),  # Current working directory
        '/home/biosearch/BioSearch2/Clientes.csv',  # Absolute path on droplet
        'Clientes.csv'  # Just the filename in case it's in the same directory
    ]
    
    csv_path = None
    for path in possible_paths:
        if os.path.exists(path):
            csv_path = path
            break
    
    if csv_path is None:
        print(f"Warning: Clientes.csv not found in any of the expected locations: {possible_paths}")
        return set()
    
    customer_codes = set()
    
    try:
        with open(csv_path, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                # Handle BOM character in CSV
                codigo = row.get('\ufeffCódigo', row.get('Código', '')).strip()
                if codigo and codigo.isdigit():
                    customer_codes.add(codigo)
        
        _valid_customer_codes = customer_codes
        print(f"Loaded {len(customer_codes)} valid customer codes from {csv_path}")
        return customer_codes
        
    except FileNotFoundError:
        print(f"Warning: Clientes.csv not found at {csv_path}")
        return set()
    except Exception as e:
        print(f"Error loading customer codes: {e}")
        return set()

def is_valid_customer_id(customer_id: str) -> bool:
    """Check if a customer ID is valid"""
    if not customer_id:
        return False
    
    # Load customer codes if not already loaded
    valid_codes = load_customer_codes()
    
    # Check if the customer ID exists in the valid codes
    return customer_id.strip() in valid_codes

def get_customer_info(customer_id: str) -> dict:
    """Get customer information by ID"""
    if not customer_id:
        return None
    
    # Try multiple possible paths for the CSV file
    possible_paths = [
        os.path.join(os.path.dirname(__file__), '..', 'Clientes.csv'),  # Original path
        os.path.join(os.path.dirname(__file__), '..', '..', 'Clientes.csv'),  # One level up
        os.path.join(os.getcwd(), 'Clientes.csv'),  # Current working directory
        '/home/biosearch/BioSearch2/Clientes.csv',  # Absolute path on droplet
        'Clientes.csv'  # Just the filename in case it's in the same directory
    ]
    
    csv_path = None
    for path in possible_paths:
        if os.path.exists(path):
            csv_path = path
            break
    
    if csv_path is None:
        print(f"Warning: Clientes.csv not found in any of the expected locations: {possible_paths}")
        return None
    
    try:
        with open(csv_path, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                # Handle BOM character in CSV
                codigo = row.get('\ufeffCódigo', row.get('Código', '')).strip()
                if codigo == customer_id.strip():
                    return {
                        'codigo': codigo,
                        'nome': row.get('Nome', '').strip(),
                        'pais': row.get('País', '').strip(),
                        'nif': row.get('NIF', '').strip(),
                        'estado': row.get('Estado', '').strip(),
                        'telefone': row.get('Telefone', '').strip(),
                        'email': row.get('Email', '').strip(),
                        'website': row.get('Website', '').strip(),
                        'pais_morada': row.get('País Morada', '').strip(),
                        'regiao': row.get('Região', '').strip(),
                        'cidade': row.get('Cidade', '').strip(),
                        'rua': row.get('Rua', '').strip(),
                        'porta': row.get('Porta', '').strip(),
                        'cod_postal': row.get('Cod-Postal', '').strip()
                    }
        return None
        
    except FileNotFoundError:
        print(f"Warning: Clientes.csv not found at {csv_path}")
        return None
    except Exception as e:
        print(f"Error reading customer info: {e}")
        return None
