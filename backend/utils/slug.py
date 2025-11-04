"""
Slug generation and validation utilities for places.
Generates URL-safe slugs from place names.
"""
import re
import unicodedata
from typing import Optional


def slugify(text: str, max_length: int = 50) -> str:
    """
    Convert text to a URL-friendly slug.
    
    Rules:
    - Lowercase only
    - Alphanumeric characters and hyphens only
    - Spaces become hyphens
    - Remove special characters and accents
    - Remove consecutive hyphens
    - Trim leading/trailing hyphens
    - Maximum length (default 50)
    
    Args:
        text: Input text to slugify
        max_length: Maximum length of the resulting slug
        
    Returns:
        URL-safe slug string
    """
    if not text:
        return 'place'
    
    # Convert to lowercase
    slug = text.lower()
    
    # Remove accents (normalize unicode)
    slug = unicodedata.normalize('NFD', slug)
    slug = slug.encode('ascii', 'ignore').decode('ascii')
    
    # Replace spaces and underscores with hyphens
    slug = re.sub(r'[_\s]+', '-', slug)
    
    # Remove all non-alphanumeric characters except hyphens
    slug = re.sub(r'[^a-z0-9-]', '', slug)
    
    # Remove consecutive hyphens
    slug = re.sub(r'-+', '-', slug)
    
    # Remove leading and trailing hyphens
    slug = slug.strip('-')
    
    # Truncate to max_length and ensure no trailing hyphen
    if len(slug) > max_length:
        slug = slug[:max_length].rstrip('-')
    
    # If empty after processing, use default
    if not slug:
        slug = 'place'
    
    return slug


def ensure_unique_slug(
    base_slug: str,
    existing_slugs: set[str],
    max_length: int = 50
) -> str:
    """
    Ensure a slug is unique by appending numbers if needed.
    
    Args:
        base_slug: Base slug to make unique
        existing_slugs: Set of existing slugs to check against
        max_length: Maximum length of the resulting slug
        
    Returns:
        Unique slug string
    """
    if base_slug not in existing_slugs:
        return base_slug
    
    counter = 2
    while True:
        # Try appending -2, -3, etc.
        candidate = f"{base_slug}-{counter}"
        
        # Ensure we don't exceed max_length
        if len(candidate) > max_length:
            # Truncate base_slug to make room for -{counter}
            base_length = max_length - len(str(counter)) - 1
            candidate = f"{base_slug[:base_length]}-{counter}"
        
        if candidate not in existing_slugs:
            return candidate
        
        counter += 1
        
        # Safety limit to prevent infinite loops
        if counter > 10000:
            # Fallback: use timestamp or random suffix
            import time
            timestamp = str(int(time.time()))[-6:]  # Last 6 digits
            base_length = max_length - len(timestamp) - 1
            return f"{base_slug[:base_length]}-{timestamp}"


def validate_slug(slug: str) -> bool:
    """
    Validate that a slug is URL-safe.
    
    Args:
        slug: Slug to validate
        
    Returns:
        True if valid, False otherwise
    """
    if not slug:
        return False
    
    # Check length
    if len(slug) > 50:
        return False
    
    # Must only contain lowercase letters, numbers, and hyphens
    if not re.match(r'^[a-z0-9-]+$', slug):
        return False
    
    # Must not start or end with hyphen
    if slug.startswith('-') or slug.endswith('-'):
        return False
    
    # Must not have consecutive hyphens
    if '--' in slug:
        return False
    
    return True


def generate_slug_from_name(name: str, existing_slugs: Optional[set[str]] = None) -> str:
    """
    Generate a unique slug from a place name.
    
    Args:
        name: Place name to generate slug from
        existing_slugs: Optional set of existing slugs to ensure uniqueness
        
    Returns:
        Unique URL-safe slug
    """
    slug = slugify(name)
    
    if existing_slugs is not None:
        slug = ensure_unique_slug(slug, existing_slugs)
    
    return slug

