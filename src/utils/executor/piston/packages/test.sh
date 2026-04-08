#!/usr/bin/env bash

# Piston Package Integrity Test Script
# Tests that installed language runtimes are working correctly.

API_URL="${PISTON_API_URL:-http://localhost:2000/api/v2/execute}"
AUTH_HEADER="Authorization: ${API_KEY:-}"

echo "🚀 Starting Piston Integrity Tests..."
echo "📍 API URL: $API_URL"

FAILED=0
SUCCESS=0

# Iterate through package test files
for test_file in */*/test.*
do
    [ -e "$test_file" ] || continue

    IFS='/' read -ra test_parts <<< "$test_file"
    IFS='.' read -ra file_parts <<< "$(basename "$test_file")"
    
    language=${file_parts[1]}
    lang_ver=${test_parts[1]}

    # Prepare JSON payload
    test_src=$(python3 -c "import json; print(json.dumps(open('$test_file').read()))")
    json='{"language":"'$language'","version":"'$lang_ver'","files":[{"content":'$test_src'}]}'
    
    echo -n "🧪 Testing $language ($lang_ver)... "

    # Execute test
    result=$(curl -s -XPOST -H "Content-Type: application/json" -d "$json" "$API_URL" -H "$AUTH_HEADER")

    # Validate output (expecting "OK" in stdout for these specific tests)
    status=$(echo "$result" | jq -r 'if (.run.stdout | contains("OK")) then "PASS" else "FAIL" end' 2>/dev/null || echo "ERROR")

    if [ "$status" == "PASS" ]; then
        echo "✅ PASS"
        ((SUCCESS++))
    else
        echo "❌ FAIL"
        echo "   Logs: $(echo "$result" | jq -r '.run.output + .compile.output' 2>/dev/null || echo "$result")"
        ((FAILED++))
    fi
done

echo "================================"
echo "Summary: $SUCCESS Passed, $FAILED Failed"
echo "================================"

[ $FAILED -eq 0 ]
