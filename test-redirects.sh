#!/bin/bash
echo "=== PAINTING + DRYWALL REDIRECT TESTS ==="
echo ""
echo "Test 1: /charlotte/painting/ (with slash)"
curl -I https://www.ifixxnc.com/charlotte/painting/ 2>&1 | grep -E "(HTTP/|location:)" | head -2
echo ""
echo "Test 2: /ballantyne/painting/ (with slash)"
curl -I https://www.ifixxnc.com/ballantyne/painting/ 2>&1 | grep -E "(HTTP/|location:)" | head -2
echo ""
echo "Test 3: /matthews/drywall/ (with slash)"
curl -I https://www.ifixxnc.com/matthews/drywall/ 2>&1 | grep -E "(HTTP/|location:)" | head -2
echo ""
echo "Test 4: /mint-hill/drywall/ (with slash)"
curl -I https://www.ifixxnc.com/mint-hill/drywall/ 2>&1 | grep -E "(HTTP/|location:)" | head -2
