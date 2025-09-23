# Step File Generator - Quick Start Guide

## 🚀 How to Use the Step File Generator

### Option 1: Using Sample Data (For Testing)
1. Open `view.html` in your browser
2. Navigate to the "⚙️ Step File Generator" section
3. Click **"📥 Load Sample Data"** button
4. The page will reload with sample Gherkin steps
5. Review the auto-selected input types
6. Click **"🚀 Generate Step File"**
7. Copy the generated C# code

### Option 2: Using Real Extension Data
1. Install the Chrome extension
2. Enable the extension and set up class names in the popup
3. Navigate to your web application
4. Click on form elements to collect Gherkin steps
5. Open `view.html` from the extension
6. Go to Step File Generator section
7. Configure input types and generate

### 📋 Available Input Types
- **Click/Button**: For buttons and clickable elements
- **Normal Select**: Single selection dropdowns
- **Multi Select**: Multiple selection dropdowns  
- **Normal Input Field**: Text inputs, numbers, etc.
- **Search Dropdown**: Searchable dropdowns
- **Date From**: Start date pickers
- **Date To**: End date pickers
- **Image Upload**: Image file uploads
- **Excel Upload**: Excel file uploads
- **Excel File Upload**: Browser-based Excel selection

### 🎯 Auto-Detection Rules
The system automatically detects input types based on step content:
- "click" → Click/Button
- "enter" + "date from" → Date From
- "enter" + "date to" → Date To
- "enter" + "image" → Image Upload
- "enter" + "excel" → Excel Upload
- "select" + "excel file" → Excel File Upload
- "enter" + other → Normal Input Field
- "select" + other → Normal Select

### 🔧 Generated Code Features
- Complete C# class with proper imports
- Dependency injection pattern
- WebElement caching with `_webElement`
- SelectElement helper methods
- Thread.Sleep for timing
- JavaScript execution for dates
- File path handling for uploads
- Error handling for missing files

### 💡 Tips
1. **Review Auto-Selection**: Always check the auto-selected types
2. **Test with Sample Data**: Use sample data to understand the feature
3. **Clear and Reload**: Use Clear Data + Refresh to start fresh
4. **Copy Generated Code**: Use the copy button for easy clipboard access
5. **Edit if Needed**: Use the edit button to modify generated code

### 🐛 Troubleshooting
- **"Loading..." shows**: Click "Load Sample Data" to test
- **No steps appear**: Collect steps using the extension first
- **Wrong input type**: Manually change the dropdown selection
- **Need to restart**: Use "Clear Data" then "Refresh Data"
- **JavaScript errors**: Check browser console for syntax errors and refresh page

### 🔧 Recent Fixes
- ✅ Fixed JavaScript syntax error that caused "Unexpected token '}'" 
- ✅ Removed duplicate code blocks that caused parsing issues
- ✅ Improved error handling and fallback mechanisms

### 📁 Files Created
- Updated `view.html` with Step File Generator UI
- Updated `view.js` with generation logic
- Added sample data loading capabilities
- Created comprehensive documentation

The Step File Generator streamlines the creation of C# step definition files by automatically generating boilerplate code based on your Gherkin steps and input type selections.
