#!/bin/bash

# Check for missing translation keys in the application

echo "=========================================="
echo "Translation Keys Check"
echo "=========================================="
echo ""

cd "/Volumes/OWC Volume/Projects2025/BioSearch2/frontend/src"

# Extract all t('...') calls from the codebase
echo "Extracting translation keys used in codebase..."
grep -rh "t(['\"]" . --include="*.tsx" --include="*.ts" | \
  grep -o "t(['\"][^'\"]*['\"])" | \
  sed "s/t(['\"]//g" | \
  sed "s/['\"])//g" | \
  sort -u > /tmp/used_keys.txt

USED_COUNT=$(wc -l < /tmp/used_keys.txt)
echo "Found $USED_COUNT unique translation keys in use"
echo ""

# Extract all keys defined in LanguageContext
echo "Extracting defined translation keys..."
grep -E "^      '[^']+': " contexts/LanguageContext.tsx | \
  sed "s/^[[:space:]]*'//g" | \
  sed "s/':.*//g" | \
  sort -u > /tmp/defined_keys.txt

DEFINED_COUNT=$(wc -l < /tmp/defined_keys.txt)
echo "Found $DEFINED_COUNT unique translation keys defined"
echo ""

# Find keys that are used but not defined
echo "=========================================="
echo "Potentially Missing Translation Keys:"
echo "=========================================="

MISSING=0
while IFS= read -r key; do
  # Skip empty lines and lines with special characters
  if [[ -z "$key" || "$key" =~ [{}()] ]]; then
    continue
  fi
  
  if ! grep -q "^${key}$" /tmp/defined_keys.txt; then
    echo "  ❌ $key"
    ((MISSING++))
  fi
done < /tmp/used_keys.txt

if [ $MISSING -eq 0 ]; then
  echo "  ✅ No missing translation keys found!"
else
  echo ""
  echo "⚠️  Found $MISSING potentially missing translation keys"
fi

echo ""
echo "=========================================="
echo "Sample of Defined Keys:"
echo "=========================================="
head -n 20 /tmp/defined_keys.txt

echo ""
echo "=========================================="
echo "Salon-related Keys in Use:"
echo "=========================================="
grep "^salon\." /tmp/used_keys.txt

# Cleanup
rm /tmp/used_keys.txt /tmp/defined_keys.txt

echo ""
echo "Check complete!"

