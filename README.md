# File Receiver Extension for Visual Studio

This Visual Studio extension automatically receives files from a Chrome extension and adds them to the active Visual Studio project.

## Features

- **HTTP Server**: Listens on `http://localhost:8080/` for incoming file data from Chrome extensions
- **Folder Navigation**: Browse and select specific project folders for file placement
- **CORS Support**: Enables Cross-Origin Resource Sharing for Chrome extension communication
- **Automatic Project Integration**: Files are automatically added to the active Visual Studio project
- **Flexible File Placement**: Create files in project root or any subfolder
- **Output Window Logging**: All operations are logged to a dedicated output pane in Visual Studio
- **Security**: Path validation prevents directory traversal attacks
- **Error Handling**: Comprehensive error handling and status reporting

## How It Works

1. **Visual Studio Extension**: Starts an HTTP server on localhost:8080 when a solution is loaded
2. **Folder Discovery**: GET /folders endpoint provides project folder structure to Chrome extension
3. **Chrome Extension**: Sends POST requests with file data (JSON format: `{fileName: "", content: "", folderPath: ""}`)
4. **File Creation**: Files are created in the specified project directory and added to the Visual Studio project
5. **Project Integration**: Uses Visual Studio DTE (Development Tools Environment) to add files to the project

## Installation

### Visual Studio Extension

1. Build the VSIX project in Visual Studio
2. Install the generated `.vsix` file
3. Restart Visual Studio
4. Open any solution - the extension will automatically start the HTTP server

### Chrome Extension (Sample)

1. Navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `SampleChromeExtension` folder
4. The extension will appear in your browser toolbar

## Usage

### Automatic File Reception

When the Visual Studio extension is running (indicated by "File Receiver Service started" in the output window), any Chrome extension can send files by making a POST request to `http://localhost:8080/` with the following JSON format:

```json
{
  "fileName": "example.txt",
  "content": "File content here"
}
```

### Manual File Sending (Sample Chrome Extension)

1. Click the Chrome extension icon
2. Click the refresh button (🔄) to load available project folders
3. Select a target folder from the dropdown (or leave as "Project Root")
4. Enter a file name and content
5. Click "Send to Visual Studio"
6. The file will be created and added to your active Visual Studio project in the specified folder

### Automatic File Sending (Content Script)

The Chrome extension includes a content script that can automatically send files when they are generated. To use this feature, dispatch a custom event from any webpage:

```javascript
window.dispatchEvent(new CustomEvent('fileGenerated', {
    detail: {
        fileName: 'generated-file.txt',
        content: 'This is the generated content'
    }
}));
```

## Project Selection Logic

The extension uses the following priority to determine which project to add files to:

1. Currently selected project in Solution Explorer
2. Project containing the active document
3. Startup project
4. First project in the solution

## Output Window

All operations are logged to the "File Receiver Extension" output pane in Visual Studio, including:

- Server start/stop events
- File reception notifications
- Error messages
- Project selection details

## API Endpoints

## API Endpoints

### GET /folders

Retrieves the folder structure of the active Visual Studio project.

**Response:**
```json
{
  "folders": [
    {
      "name": "Project Root",
      "path": ""
    },
    {
      "name": "Controllers",
      "path": "Controllers"
    },
    {
      "name": "Models",
      "path": "Models"
    }
  ]
}
```

**Status Codes:**
- `200 OK`: Folder structure returned successfully
- `404 Not Found`: No active project found
- `500 Internal Server Error`: Error reading project structure

### POST /

Receives file data and adds it to the active Visual Studio project.

**Request Body:**
```json
{
  "fileName": "example.txt",
  "content": "File content (can be base64 encoded)",
  "folderPath": "Controllers" // Optional: target folder path
}
```

**Examples:**

Create file in project root:
```json
{
  "fileName": "readme.txt",
  "content": "This is a readme file"
}
```

Create file in specific folder:
```json
{
  "fileName": "UserController.cs",
  "content": "using System;\n\npublic class UserController { }",
  "folderPath": "Controllers"
}
```

**Response:**
- `200 OK`: File added successfully
- `400 Bad Request`: Invalid file data format
- `500 Internal Server Error`: Failed to add file to project

### OPTIONS /

Handles CORS preflight requests for Chrome extensions.

## Error Handling

- Invalid JSON format: Returns 400 Bad Request
- Missing file name or content: Returns 400 Bad Request
- No active project: Logs error and returns 500
- File system errors: Logs error and returns 500
- Server startup failures: Logged to Visual Studio output window

## Requirements

- Visual Studio 2017 or later
- .NET Framework 4.7.2 or later
- Chrome browser (for the sample extension)

## Development

### Building the Extension

1. Open the solution in Visual Studio
2. Build the project (this will create the VSIX package)
3. Install the generated VSIX file from `bin/Debug/` or `bin/Release/`

### Testing the Implementation

The repository includes test files to validate functionality:

1. **test-folder-selection.html**: Comprehensive test for folder navigation and file creation
   - Open this file in a browser while the VSIX extension is running
   - Test folder structure retrieval from Visual Studio
   - Test file creation in specific folders
   
2. **test-json-fix.html**: Tests JSON parsing and basic file creation

3. **test-improved-error-handling.html**: Tests the enhanced "No active project found" error handling
   - Validates improved error messages and diagnostics
   - Tests both folder retrieval and file upload scenarios
   - Demonstrates better user guidance when issues occur

### Customizing the Chrome Extension

The sample Chrome extension is provided as a starting point. You can:

- Modify the UI in `popup.html`
- Add automatic file detection in `content.js`
- Integrate with your specific web application's file generation logic

## Security Considerations

- The HTTP server only accepts connections from localhost
- CORS is configured to allow all origins (you may want to restrict this in production)
- File paths are validated to prevent directory traversal attacks
- All file operations are performed within the project directory

## Troubleshooting

### Extension Not Loading

- Check that Visual Studio has a solution loaded
- Verify the extension is installed and enabled
- Check the Output Window for error messages

### Chrome Extension Communication Issues

- Ensure Visual Studio is running with a solution loaded
- Check that the HTTP server is running (port 8080)
- Verify CORS settings allow your domain
- Check browser console for JavaScript errors

### Files Not Added to Project

- Ensure you have an active project in Visual Studio
- Check that the project directory is writable
- Verify the file name is valid for the file system
- Check the Output Window for detailed error messages

**Common Causes of "No Active Project Found" Error:**
- No solution is open in Visual Studio
- Solution is open but contains no projects
- Extension loaded before solution was fully initialized
- Permission issues accessing Visual Studio services

**Solutions:**
1. Open a solution with at least one project in Visual Studio
2. Check the "File Receiver Extension" output pane for detailed diagnostic information
3. Restart Visual Studio if the extension seems unresponsive
4. Ensure Visual Studio has proper permissions to access project files