#!/bin/bash

# 404 Fix Validation Script
# This script performs basic validation of the File Receiver Extension endpoints

echo "🔧 404 Fix Validation Script"
echo "=============================="
echo ""

# Check if localhost:8080 is responding
echo "📡 Testing connection to localhost:8080..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 | grep -q "405"; then
    echo "✅ Service is responding (405 Method Not Allowed is expected for GET /)"
else
    echo "❌ Service is not responding. Make sure Visual Studio with VSIX extension is running."
    exit 1
fi

echo ""

# Test projects endpoint
echo "📁 Testing /projects endpoint..."
projects_response=$(curl -s http://localhost:8080/projects)
projects_status=$?

if [ $projects_status -eq 0 ]; then
    echo "✅ Projects endpoint is responding"
    
    # Check if response contains project data
    if echo "$projects_response" | grep -q '"projects"'; then
        project_count=$(echo "$projects_response" | grep -o '"name"' | wc -l)
        echo "✅ Found $project_count projects in response"
        
        # Extract first project directory for testing
        first_project_dir=$(echo "$projects_response" | grep -o '"directory":"[^"]*' | head -1 | cut -d'"' -f4)
        
        if [ ! -z "$first_project_dir" ]; then
            echo "📂 Testing with project: $first_project_dir"
            
            # URL encode the project directory
            encoded_dir=$(echo "$first_project_dir" | sed 's/ /%20/g' | sed 's/\\/%5C/g' | sed 's/:/%3A/g')
            
            echo ""
            echo "📁 Testing /folders endpoint with project parameter..."
            folders_url="http://localhost:8080/folders?project=$encoded_dir"
            echo "🔗 URL: $folders_url"
            
            folders_response=$(curl -s -w "HTTP_STATUS:%{http_code}" "$folders_url")
            folders_body=$(echo "$folders_response" | sed -E 's/HTTP_STATUS:[0-9]{3}$//')
            folders_status=$(echo "$folders_response" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
            
            if [ "$folders_status" = "200" ]; then
                echo "✅ SUCCESS! Folders endpoint returned 200 OK"
                echo "🎉 The 404 fix is working correctly!"
                
                if echo "$folders_body" | grep -q '"folders"'; then
                    folder_count=$(echo "$folders_body" | grep -o '"name"' | wc -l)
                    echo "📁 Found $folder_count folders in response"
                fi
            elif [ "$folders_status" = "404" ]; then
                echo "❌ FAILURE! Still getting 404 Not Found"
                echo "💡 The fix may not be working properly"
                echo "💡 Check Visual Studio Output window for detailed logs"
            else
                echo "⚠️ Unexpected status: $folders_status"
                echo "Response: $folders_body"
            fi
        else
            echo "⚠️ No project directory found in response"
        fi
    else
        echo "⚠️ Projects response doesn't contain expected project data"
        echo "Response: $projects_response"
    fi
else
    echo "❌ Projects endpoint failed"
fi

echo ""
echo "🏁 Validation complete!"
echo ""
echo "For comprehensive testing, open test-404-fix-validation.html in Chrome"
echo "and follow the interactive testing process."