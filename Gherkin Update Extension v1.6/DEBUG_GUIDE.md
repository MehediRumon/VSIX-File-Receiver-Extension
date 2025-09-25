# Quick Test Guide - Debug Configuration & Format Issues

## 🔍 To Debug Configuration Info Disappearing

1. Open the Extension View page
2. Open browser Developer Tools (F12)
3. Check the Console tab
4. Look for these console messages:
   - "updateConfigurationInfo called"
   - "Configuration info updated"
   - "Namespace generated: ..."

## 🔍 To Debug Step File Format Issues

1. Generate a step file
2. Check Console for these debug messages:
   - "Generated step file code length: [number]"
   - "First 200 characters: [text]"
   - "Contains line breaks: true/false"
   - "Set step file content, element text length: [number]"

## 🔧 Temporary Manual Fix

If configuration disappears:
1. Refresh the page (F5)
2. Wait 3 seconds for automatic update
3. Check if info reappears

If step file format is broken:
1. Check the browser console for errors
2. Copy the code from the display area
3. Paste into a text editor to verify formatting

## 🐛 Known Issues & Status

- Configuration info should update every 3 seconds automatically
- Step file should preserve line breaks with proper indentation
- Namespace should show correctly without duplication

## 📝 Debug Information to Collect

When reporting issues, please provide:
1. Browser console output
2. Screenshot of Configuration Info section
3. Sample of generated step file (first few lines)
4. Root file name value you entered
