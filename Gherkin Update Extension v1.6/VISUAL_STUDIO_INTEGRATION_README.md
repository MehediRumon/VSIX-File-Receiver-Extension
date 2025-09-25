# Visual Studio Integration Guide

## Overview

The Gherkin Update Extension now includes **Visual Studio integration** that allows you to directly send generated files (Element, Page, Step, and Feature files) to your Visual Studio projects without changing any existing functionality.

## Features Added

### 🚀 New Visual Studio Integration Features:

1. **Project Selection**: Load and select from your Visual Studio projects
2. **Folder Navigation**: Choose specific folders within your projects  
3. **Individual File Sending**: Send Element, Page, Step, or Feature files individually
4. **Bulk File Sending**: Send all 4 files at once to Visual Studio
5. **Real-time Status**: See the progress and status of file transfers
6. **Error Handling**: Clear error messages if VS connection fails

### 📁 Where to Find It:

- Open the extension popup and click **"View"**
- In the view page, scroll down to the **"Download Generated Files"** button
- Click it to open the modal where you'll find the new **"📁 Send to Visual Studio Project"** section

## How to Use

### Step 1: Prerequisites

You need a **Visual Studio Extension** that creates a local server to receive files. This extension should:
- Run a local server on `localhost:8080`
- Expose endpoints:
  - `GET /projects` - Returns list of VS projects
  - `GET /folders?project=<path>` - Returns folders in a project
  - `POST /` - Receives files to add to projects

### Step 2: Load Projects

1. Open the **Send to Visual Studio Project** section
2. Click **"🔄 Load Projects"** button
3. The extension will connect to Visual Studio and load your available projects
4. Select a project from the dropdown

### Step 3: Select Folder (Optional)

1. After selecting a project, folders will be automatically loaded
2. Choose a specific folder or leave it as "Project Root"
3. The folder structure is displayed hierarchically for easy navigation

### Step 4: Send Files

**Individual Files:**
- Click any of the **"🚀 Send [FileType]"** buttons to send specific files
- Available: Send Element, Send Page, Send Step, Send Feature

**All Files at Once:**
- Click **"🚀 Send All Files to Visual Studio"**
- Sends Element.cs, Page.cs, Step.cs, and .feature files in sequence

### Step 5: Monitor Status

- Watch the status area for real-time updates
- Green ✅ = Success
- Yellow ⚠️ = Warning  
- Red ❌ = Error
- Blue 🔄 = Processing

## File Naming & Namespaces

The sent files will use your configured:
- **Action Name**: For class names (e.g., `StudentElement`, `StudentPage`, `StudentStep`)
- **Root File Name**: For namespace generation (e.g., `UMS.UI.Test.ERP.Areas.Student`)
- **Menu Name**: For Feature file content

Files include proper namespaces:
- Element & Page files: `namespace UMS.UI.Test.ERP.Areas.YourArea`
- Step files: `namespace UMS.UI.Test.ERP.Areas.YourArea.Steps`

## Error Handling

Common error messages and solutions:

### ❌ "Cannot connect to Visual Studio extension"
- **Cause**: Visual Studio is not running or the File Receiver extension is not active
- **Solution**: Start Visual Studio and ensure the File Receiver extension is running on localhost:8080

### ❌ "Network error"  
- **Cause**: Connection blocked or wrong port
- **Solution**: Check if localhost:8080 is accessible and not blocked by firewall

### ⚠️ "Please generate step file first"
- **Cause**: Trying to send Step file before generating it
- **Solution**: Go to Step File Generator section and generate the step file first

### ⚠️ "Please select a project first"
- **Cause**: No project selected
- **Solution**: Load projects and select one from the dropdown

## Backward Compatibility

✅ **No existing functionality is changed!**
- All original download features still work exactly the same
- Original Excel export, JMX export, and regular file downloads are unchanged
- All existing Gherkin collection, locator capture, and step generation features work as before
- The VS integration is an **additional feature** that doesn't interfere with existing workflows

## Integration Architecture

The Visual Studio integration works through:

1. **HTTP API**: Communicates with VS extension via REST endpoints
2. **Project Discovery**: Automatically detects available VS projects
3. **Folder Navigation**: Shows hierarchical folder structure
4. **File Transfer**: Sends files with proper metadata (filename, content, target folder)
5. **Status Tracking**: Real-time feedback on transfer progress

## Requirements

- Visual Studio with compatible File Receiver Extension
- Extension running local server on port 8080
- Network access to localhost:8080
- Your existing Gherkin Update Extension (this extension)

---

**Note**: The Visual Studio integration is a completely optional feature. You can continue using the extension exactly as before, and the new VS features are only available when you choose to use them.