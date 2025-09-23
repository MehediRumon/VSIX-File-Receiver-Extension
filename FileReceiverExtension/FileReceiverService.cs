using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Shell.Interop;
using EnvDTE;
using EnvDTE80;

namespace FileReceiverExtension
{
    /// <summary>
    /// File receiver service that listens for incoming files from Chrome extension
    /// </summary>
    public class FileReceiverService
    {
        private HttpListener _httpListener;
        private readonly CancellationTokenSource _cancellationTokenSource;
        private readonly IVsOutputWindow _outputWindow;
        private readonly DTE2 _dte;
        private IVsOutputWindowPane _outputPane;

        public FileReceiverService(IVsOutputWindow outputWindow, DTE2 dte)
        {
            _outputWindow = outputWindow;
            _dte = dte;
            _cancellationTokenSource = new CancellationTokenSource();
        }

        private bool IsPortInUse(int port)
        {
            try
            {
                var listener = new HttpListener();
                listener.Prefixes.Add($"http://localhost:{port}/");
                listener.Start();
                listener.Stop();
                return false;
            }
            catch
            {
                return true;
            }
        }

        public async Task StartAsync()
        {
            try
            {
                // Create output pane for logging
                await CreateOutputPaneAsync();

                // Check if port is already in use
                if (IsPortInUse(8080))
                {
                    await LogAsync("ERROR: Port 8080 is already in use. Please close other applications using this port.");
                    return;
                }

                // Start HTTP listener on localhost port 8080
                _httpListener = new HttpListener();
                _httpListener.Prefixes.Add("http://localhost:8080/");
                
                try
                {
                    _httpListener.Start();
                    await LogAsync("File Receiver Service started successfully on http://localhost:8080/");
                    await LogAsync("Service is ready to receive files from Chrome extension");
                }
                catch (HttpListenerException ex)
                {
                    await LogAsync($"Failed to start HTTP listener: {ex.Message}");
                    await LogAsync("This might be due to insufficient permissions or port conflicts.");
                    await LogAsync("Try running Visual Studio as Administrator or check if port 8080 is available.");
                    return;
                }

                // Start listening for requests
                _ = Task.Run(async () => await ListenForRequestsAsync(_cancellationTokenSource.Token));
            }
            catch (Exception ex)
            {
                await LogAsync($"Error starting File Receiver Service: {ex.Message}");
                await LogAsync($"Stack trace: {ex.StackTrace}");
            }
        }

        public void Stop()
        {
            try
            {
                _cancellationTokenSource.Cancel();
                _httpListener?.Stop();
                _httpListener?.Close();
            }
            catch (Exception ex)
            {
                // Log error if possible
                LogAsync($"Error stopping File Receiver Service: {ex.Message}").ConfigureAwait(false);
            }
        }

        private async Task ListenForRequestsAsync(CancellationToken cancellationToken)
        {
            while (!cancellationToken.IsCancellationRequested && _httpListener.IsListening)
            {
                try
                {
                    var context = await _httpListener.GetContextAsync();
                    _ = Task.Run(async () => await ProcessRequestAsync(context), cancellationToken);
                }
                catch (ObjectDisposedException)
                {
                    // Expected when shutting down
                    break;
                }
                catch (Exception ex)
                {
                    await LogAsync($"Error listening for requests: {ex.Message}");
                }
            }
        }

        private async Task ProcessRequestAsync(HttpListenerContext context)
        {
            try
            {
                var request = context.Request;
                var response = context.Response;

                await LogAsync($"Received {request.HttpMethod} request from {request.RemoteEndPoint}");

                // Enable CORS for Chrome extension
                response.Headers.Add("Access-Control-Allow-Origin", "*");
                response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
                response.Headers.Add("Access-Control-Allow-Headers", "Content-Type");

                if (request.HttpMethod == "OPTIONS")
                {
                    // Handle preflight request
                    await LogAsync("Handling CORS preflight request");
                    response.StatusCode = 200;
                    response.Close();
                    return;
                }

                if (request.HttpMethod == "POST")
                {
                    await LogAsync("Processing POST request for file upload");
                    await HandleFileUploadAsync(request, response);
                }
                else if (request.HttpMethod == "GET" && request.Url.AbsolutePath == "/folders")
                {
                    await LogAsync("Processing GET request for folder structure");
                    await HandleGetFoldersAsync(request, response);
                }
                else if (request.HttpMethod == "GET" && request.Url.AbsolutePath == "/projects")
                {
                    await LogAsync("Processing GET request for project list");
                    await HandleGetProjectsAsync(request, response);
                }
                else
                {
                    await LogAsync($"Method {request.HttpMethod} not allowed");
                    response.StatusCode = 405; // Method Not Allowed
                    response.Close();
                }
            }
            catch (Exception ex)
            {
                await LogAsync($"Error processing request: {ex.Message}");
                await LogAsync($"Stack trace: {ex.StackTrace}");
                try
                {
                    context.Response.StatusCode = 500;
                    context.Response.Close();
                }
                catch { /* Ignore cleanup errors */ }
            }
        }

        private async Task HandleFileUploadAsync(HttpListenerRequest request, HttpListenerResponse response)
        {
            try
            {
                // Read the request body
                string content;
                using (var reader = new StreamReader(request.InputStream, request.ContentEncoding))
                {
                    content = await reader.ReadToEndAsync();
                }

                await LogAsync($"Received file data, content length: {content?.Length ?? 0}");

                if (string.IsNullOrEmpty(content))
                {
                    await LogAsync("Empty request body received");
                    response.StatusCode = 400;
                    response.Close();
                    return;
                }

                // Parse JSON content (simple parsing for filename and content)
                var fileData = await ParseFileDataAsync(content);
                if (fileData == null)
                {
                    await LogAsync("Failed to parse file data from request");
                    response.StatusCode = 400;
                    await WriteResponseAsync(response, "Invalid file data format");
                    return;
                }

                // Add file to project (active project or specified project)
                var success = await AddFileToProjectAsync(fileData.FileName, fileData.Content, fileData.FolderPath, fileData.ProjectDirectory);
                
                if (success)
                {
                    response.StatusCode = 200;
                    await WriteResponseAsync(response, "File added successfully");
                    await LogAsync($"File '{fileData.FileName}' added to active project successfully");
                }
                else
                {
                    response.StatusCode = 500;
                    await WriteResponseAsync(response, "Failed to add file to project");
                    await LogAsync($"Failed to add file '{fileData.FileName}' to project");
                }
            }
            catch (Exception ex)
            {
                await LogAsync($"Error handling file upload: {ex.Message}");
                await LogAsync($"Stack trace: {ex.StackTrace}");
                response.StatusCode = 500;
                await WriteResponseAsync(response, "Internal server error");
            }
        }

        private async Task HandleGetFoldersAsync(HttpListenerRequest request, HttpListenerResponse response)
        {
            try
            {
                await LogAsync("=== FOLDER REQUEST DEBUG ===");
                await LogAsync("Processing GET request for folder structure");

                // Ensure we're on the UI thread for DTE operations
                await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync();

                // Check if solution is open
                if (_dte?.Solution == null || !_dte.Solution.IsOpen)
                {
                    await LogAsync("ERROR: No solution is currently open in Visual Studio");
                    response.StatusCode = 404;
                    await WriteResponseAsync(response, "{\"error\":\"No solution is open\"}");
                    return;
                }

                await LogAsync($"Solution is open: {_dte.Solution.FileName}");
                await LogAsync($"Solution has {_dte.Solution.Projects?.Count ?? 0} projects");

                // Check if project parameter is provided in query string
                string projectDirectory = request.QueryString["project"];
                string projectDir = null;
                Project project = null;

                if (!string.IsNullOrEmpty(projectDirectory))
                {
                    await LogAsync($"Using specified project directory: {projectDirectory}");
                    
                    // Find the project by directory using recursive search to handle solution folders
                    if (_dte?.Solution?.Projects != null)
                    {
                        project = FindProjectByDirectoryRecursive(_dte.Solution.Projects, projectDirectory);
                        if (project != null)
                        {
                            projectDir = Path.GetDirectoryName(project.FullName);
                            await LogAsync($"Found matching project: {project.Name}");
                        }
                    }

                    if (project == null)
                    {
                        await LogAsync($"Could not find project with directory: {projectDirectory}");
                        response.StatusCode = 404;
                        await WriteResponseAsync(response, "{\"error\":\"Project not found with specified directory\"}");
                        return;
                    }
                }
                else
                {
                    // Fallback to active project if no project specified
                    await LogAsync("No project parameter provided, using active project");
                    project = GetActiveProject();
                    if (project == null)
                    {
                        await LogAsync("ERROR: No active project found after exhaustive search");
                        await LogAsync("TROUBLESHOOTING TIPS:");
                        await LogAsync("1. Make sure you have a project file (.csproj, .vbproj, etc.) open");
                        await LogAsync("2. Try selecting a project in Solution Explorer");
                        await LogAsync("3. Try opening a file from the project you want to use");
                        await LogAsync("4. Check if your project is properly loaded (not unloaded)");
                        
                        response.StatusCode = 404;
                        await WriteResponseAsync(response, "{\"error\":\"No active project found. Please select a project in Solution Explorer or open a file from your project.\"}");
                        return;
                    }

                    // Get project directory
                    projectDir = Path.GetDirectoryName(project.FullName);
                    if (string.IsNullOrEmpty(projectDir))
                    {
                        await LogAsync($"ERROR: Could not determine project directory from: {project.FullName}");
                        response.StatusCode = 500;
                        await WriteResponseAsync(response, "{\"error\":\"Could not determine project directory\"}");
                        return;
                    }
                }

                await LogAsync($"SUCCESS: Found project: {project.Name}");
                await LogAsync($"Project full name: {project.FullName}");
                await LogAsync($"Project directory: {projectDir}");

                // Verify directory exists
                if (!Directory.Exists(projectDir))
                {
                    await LogAsync($"ERROR: Project directory does not exist: {projectDir}");
                    response.StatusCode = 500;
                    await WriteResponseAsync(response, "{\"error\":\"Project directory does not exist\"}");
                    return;
                }

                // Get folder structure
                var folders = GetProjectFolders(projectDir);
                var jsonResponse = CreateFoldersJson(folders);

                response.StatusCode = 200;
                response.ContentType = "application/json";
                await WriteResponseAsync(response, jsonResponse);
                await LogAsync($"SUCCESS: Sent folder structure with {folders.Count} folders for project {project.Name}");
                await LogAsync("=== FOLDER REQUEST COMPLETE ===");
            }
            catch (Exception ex)
            {
                await LogAsync($"ERROR in HandleGetFoldersAsync: {ex.Message}");
                await LogAsync($"Stack trace: {ex.StackTrace}");
                response.StatusCode = 500;
                await WriteResponseAsync(response, "{\"error\":\"Internal server error\"}");
            }
        }

        private async Task HandleGetProjectsAsync(HttpListenerRequest request, HttpListenerResponse response)
        {
            try
            {
                await LogAsync("=== PROJECT LIST REQUEST DEBUG ===");
                await LogAsync("Processing GET request for project list");

                // Ensure we're on the UI thread for DTE operations
                await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync();

                // Check if solution is open
                if (_dte?.Solution == null || !_dte.Solution.IsOpen)
                {
                    await LogAsync("ERROR: No solution is currently open in Visual Studio");
                    response.StatusCode = 404;
                    await WriteResponseAsync(response, "{\"error\":\"No solution is open\"}");
                    return;
                }

                await LogAsync($"Solution is open: {_dte.Solution.FileName}");
                await LogAsync($"Solution has {_dte.Solution.Projects?.Count ?? 0} projects");

                // Get all projects
                var projects = await GetAllProjectsAsync();
                if (projects.Count == 0)
                {
                    await LogAsync("ERROR: No projects found in solution");
                    response.StatusCode = 404;
                    await WriteResponseAsync(response, "{\"error\":\"No projects found in solution\"}");
                    return;
                }

                var jsonResponse = CreateProjectsJson(projects);

                response.StatusCode = 200;
                response.ContentType = "application/json";
                await WriteResponseAsync(response, jsonResponse);
                await LogAsync($"SUCCESS: Sent project list with {projects.Count} projects");
                await LogAsync("=== PROJECT LIST REQUEST COMPLETE ===");
            }
            catch (Exception ex)
            {
                await LogAsync($"ERROR in HandleGetProjectsAsync: {ex.Message}");
                await LogAsync($"Stack trace: {ex.StackTrace}");
                response.StatusCode = 500;
                await WriteResponseAsync(response, "{\"error\":\"Internal server error\"}");
            }
        }

        private List<FolderInfo> GetProjectFolders(string projectDir)
        {
            var folders = new List<FolderInfo>();
            
            try
            {
                // Add root folder
                folders.Add(new FolderInfo 
                { 
                    Name = "Project Root", 
                    Path = "", 
                    FullPath = projectDir 
                });

                // Get all subdirectories
                var directories = Directory.GetDirectories(projectDir, "*", SearchOption.AllDirectories);
                
                foreach (var dir in directories)
                {
                    // Skip hidden directories and common build/package directories
                    var dirName = Path.GetFileName(dir);
                    if (dirName.StartsWith(".") || 
                        dirName.Equals("bin", StringComparison.OrdinalIgnoreCase) ||
                        dirName.Equals("obj", StringComparison.OrdinalIgnoreCase) ||
                        dirName.Equals("packages", StringComparison.OrdinalIgnoreCase) ||
                        dirName.Equals("node_modules", StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    var relativePath = GetRelativePath(projectDir, dir);
                    folders.Add(new FolderInfo 
                    { 
                        Name = dirName, 
                        Path = relativePath.Replace(Path.DirectorySeparatorChar, '/'),
                        FullPath = dir
                    });
                }
            }
            catch (Exception ex)
            {
                LogAsync($"Error reading project folders: {ex.Message}").ConfigureAwait(false);
            }

            return folders;
        }

        /// <summary>
        /// Gets the relative path from one directory to another (compatible with .NET Framework 4.7.2)
        /// </summary>
        private string GetRelativePath(string fromPath, string toPath)
        {
            if (string.IsNullOrEmpty(fromPath)) return toPath;
            if (string.IsNullOrEmpty(toPath)) return string.Empty;

            // Normalize paths
            fromPath = Path.GetFullPath(fromPath);
            toPath = Path.GetFullPath(toPath);

            // Check if toPath is actually under fromPath
            if (!toPath.StartsWith(fromPath, StringComparison.OrdinalIgnoreCase))
            {
                return toPath; // Return full path if not under fromPath
            }

            // Remove the base path and leading separator
            var relativePath = toPath.Substring(fromPath.Length);
            if (relativePath.StartsWith(Path.DirectorySeparatorChar.ToString()) || 
                relativePath.StartsWith(Path.AltDirectorySeparatorChar.ToString()))
            {
                relativePath = relativePath.Substring(1);
            }

            return relativePath;
        }

        private string CreateFoldersJson(List<FolderInfo> folders)
        {
            var jsonBuilder = new StringBuilder();
            jsonBuilder.Append("{\"folders\":[");
            
            for (int i = 0; i < folders.Count; i++)
            {
                if (i > 0) jsonBuilder.Append(",");
                
                jsonBuilder.Append("{");
                jsonBuilder.Append($"\"name\":\"{EscapeJsonString(folders[i].Name)}\",");
                jsonBuilder.Append($"\"path\":\"{EscapeJsonString(folders[i].Path)}\"");
                jsonBuilder.Append("}");
            }
            
            jsonBuilder.Append("]}");
            return jsonBuilder.ToString();
        }

        private string EscapeJsonString(string str)
        {
            if (string.IsNullOrEmpty(str)) return str;
            
            return str.Replace("\\", "\\\\")
                     .Replace("\"", "\\\"")
                     .Replace("\n", "\\n")
                     .Replace("\r", "\\r")
                     .Replace("\t", "\\t");
        }

        private class FolderInfo
        {
            public string Name { get; set; }
            public string Path { get; set; }
            public string FullPath { get; set; }
        }

        private class ProjectInfo
        {
            public string Name { get; set; }
            public string FullName { get; set; }
            public string Directory { get; set; }
            public string Kind { get; set; }
        }

        private async Task<FileData> ParseFileDataAsync(string json)
        {
            try
            {
                await LogAsync($"Parsing JSON data: {json.Substring(0, Math.Min(100, json.Length))}...");
                
                // Simple JSON parsing - handles both single-line and multi-line JSON
                string fileName = null;
                string content = null;
                string folderPath = null;
                string projectDirectory = null;

                // Extract fileName using regex pattern that handles both formats
                var fileNameMatch = Regex.Match(json, @"""fileName""\s*:\s*""([^""]*?)""");
                if (fileNameMatch.Success)
                {
                    fileName = fileNameMatch.Groups[1].Value;
                }

                // Extract content using regex pattern that handles escaped quotes and multi-line content
                var contentMatch = Regex.Match(json, @"""content""\s*:\s*""((?:[^""\\]|\\.)*)""");
                if (contentMatch.Success)
                {
                    content = contentMatch.Groups[1].Value;
                    // Unescape JSON string content
                    content = content.Replace("\\\"", "\"").Replace("\\\\", "\\").Replace("\\n", "\n").Replace("\\r", "\r").Replace("\\t", "\t");
                }

                // Extract optional folderPath
                var folderMatch = Regex.Match(json, @"""folderPath""\s*:\s*""([^""]*?)""");
                if (folderMatch.Success)
                {
                    folderPath = folderMatch.Groups[1].Value;
                    // Unescape folder path
                    folderPath = folderPath.Replace("\\\\", "\\").Replace("\\/", "/");
                }

                // Extract optional projectDirectory
                var projectMatch = Regex.Match(json, @"""projectDirectory""\s*:\s*""([^""]*?)""");
                if (projectMatch.Success)
                {
                    projectDirectory = projectMatch.Groups[1].Value;
                    // Unescape project directory path
                    projectDirectory = projectDirectory.Replace("\\\\", "\\").Replace("\\/", "/");
                }

                if (!string.IsNullOrEmpty(fileName) && content != null)
                {
                    var logMessage = $"Successfully parsed file: {fileName}";
                    if (!string.IsNullOrEmpty(folderPath))
                        logMessage += $" in folder: {folderPath}";
                    if (!string.IsNullOrEmpty(projectDirectory))
                        logMessage += $" for project: {projectDirectory}";
                    await LogAsync(logMessage);
                    
                    // Decode content if it's base64 encoded
                    if (IsBase64String(content))
                    {
                        await LogAsync("Content appears to be base64 encoded, decoding...");
                        content = Encoding.UTF8.GetString(Convert.FromBase64String(content));
                    }
                    
                    return new FileData { FileName = fileName, Content = content, FolderPath = folderPath, ProjectDirectory = projectDirectory };
                }
                else
                {
                    await LogAsync($"Failed to parse JSON - fileName: {fileName ?? "null"}, content: {(content != null ? "present" : "null")}");
                }
            }
            catch (Exception ex)
            {
                await LogAsync($"Error parsing file data: {ex.Message}");
                await LogAsync($"Raw JSON: {json}");
            }

            return null;
        }

        private int FindEndOfJsonString(string json, int startIndex)
        {
            for (int i = startIndex; i < json.Length; i++)
            {
                if (json[i] == '"')
                {
                    // Check if this quote is escaped
                    int backslashCount = 0;
                    for (int j = i - 1; j >= startIndex && json[j] == '\\'; j--)
                    {
                        backslashCount++;
                    }
                    
                    // If even number of backslashes (including 0), the quote is not escaped
                    if (backslashCount % 2 == 0)
                    {
                        return i;
                    }
                }
            }
            return -1;
        }

        private bool IsBase64String(string s)
        {
            // Basic checks first
            if (string.IsNullOrEmpty(s))
                return false;
                
            // Base64 strings should be at least 4 characters long for meaningful content
            if (s.Length < 4)
                return false;
                
            // Base64 length should be multiple of 4
            if (s.Length % 4 != 0)
                return false;
                
            // Check if string contains only valid base64 characters
            if (!Regex.IsMatch(s, @"^[A-Za-z0-9+/]*={0,2}$"))
                return false;
                
            // Additional check: if it contains whitespace, it's probably not base64
            if (s.Contains(" ") || s.Contains("\n") || s.Contains("\t") || s.Contains("\r"))
                return false;
                
            // Check for common patterns that indicate it's likely plain text, not base64
            // Most base64 strings should have a good mix of upper/lower case and numbers
            int upperCount = 0, lowerCount = 0, digitCount = 0;
            foreach (char c in s.Replace("=", ""))
            {
                if (char.IsUpper(c)) upperCount++;
                else if (char.IsLower(c)) lowerCount++;
                else if (char.IsDigit(c)) digitCount++;
            }
            
            // If it's all lowercase letters (like "test" -> "abcd"), it's likely not base64
            if (upperCount == 0 && digitCount == 0 && s.Length <= 8)
                return false;
                
            try
            {
                // Final validation: try to decode it
                byte[] decoded = Convert.FromBase64String(s);
                
                // If decoded content is very short for a longer string, it's likely not intentional base64
                if (s.Length > 12 && decoded.Length < 4)
                    return false;
                    
                return true;
            }
            catch
            {
                return false;
            }
        }

        private async Task<bool> AddFileToProjectAsync(string fileName, string content, string folderPath = null, string specificProjectDirectory = null)
        {
            try
            {
                await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync();

                Project project = null;
                string projectDir = null;

                // Use specific project directory if provided, otherwise fallback to active project
                if (!string.IsNullOrEmpty(specificProjectDirectory))
                {
                    await LogAsync($"Using specified project directory: {specificProjectDirectory}");
                    
                    // Find the project by directory using recursive search to handle solution folders
                    if (_dte?.Solution?.Projects != null)
                    {
                        project = FindProjectByDirectoryRecursive(_dte.Solution.Projects, specificProjectDirectory);
                        if (project != null)
                        {
                            projectDir = Path.GetDirectoryName(project.FullName);
                            await LogAsync($"Found matching project: {project.Name}");
                        }
                    }

                    if (project == null)
                    {
                        await LogAsync($"Could not find project with directory: {specificProjectDirectory}");
                        return false;
                    }
                }
                else
                {
                    // Get the active project (fallback behavior)
                    project = GetActiveProject();
                    if (project == null)
                    {
                        await LogAsync("No active project found");
                        return false;
                    }

                    // Get project directory
                    projectDir = Path.GetDirectoryName(project.FullName);
                    if (string.IsNullOrEmpty(projectDir))
                    {
                        await LogAsync("Could not determine project directory");
                        return false;
                    }
                }

                // Create the full file path, considering optional folder path
                string filePath;
                if (!string.IsNullOrEmpty(folderPath))
                {
                    // Validate and normalize folder path
                    var normalizedFolderPath = folderPath.Replace('/', Path.DirectorySeparatorChar);
                    
                    // Security check: prevent directory traversal attacks
                    if (normalizedFolderPath.Contains("..") || Path.IsPathRooted(normalizedFolderPath))
                    {
                        await LogAsync($"Invalid folder path detected: {folderPath}");
                        return false;
                    }
                    
                    var targetDir = Path.Combine(projectDir, normalizedFolderPath);
                    filePath = Path.Combine(targetDir, fileName);
                    await LogAsync($"Creating file in specified folder: {normalizedFolderPath}");
                }
                else
                {
                    filePath = Path.Combine(projectDir, fileName);
                    await LogAsync("Creating file in project root");
                }

                // Ensure directory exists
                var directory = Path.GetDirectoryName(filePath);
                if (!Directory.Exists(directory))
                {
                    Directory.CreateDirectory(directory);
                }

                // Write file content
                File.WriteAllText(filePath, content);

                // Add file to project
                project.ProjectItems.AddFromFile(filePath);

                return true;
            }
            catch (Exception ex)
            {
                await LogAsync($"Error adding file to project: {ex.Message}");
                return false;
            }
        }

        private Project GetActiveProject()
        {
            try
            {
                ThreadHelper.ThrowIfNotOnUIThread();

                // Log all available information for debugging
                LogAsync($"Attempting to get active project. Solution loaded: {_dte.Solution?.IsOpen}").ConfigureAwait(false);
                LogAsync($"Total projects in solution: {_dte.Solution?.Projects?.Count ?? 0}").ConfigureAwait(false);

                // Method 1: Try to get the active project from solution explorer selection
                try
                {
                    var items = _dte.SelectedItems;
                    LogAsync($"Selected items count: {items?.Count ?? 0}").ConfigureAwait(false);
                    
                    if (items != null && items.Count > 0)
                    {
                        var item = items.Item(1);
                        if (item?.Project != null)
                        {
                            LogAsync($"Found project from selection: {item.Project.Name}").ConfigureAwait(false);
                            return item.Project;
                        }
                        
                        // Check if selected item belongs to a project
                        if (item?.ProjectItem?.ContainingProject != null)
                        {
                            LogAsync($"Found project from selected item: {item.ProjectItem.ContainingProject.Name}").ConfigureAwait(false);
                            return item.ProjectItem.ContainingProject;
                        }
                    }
                }
                catch (Exception ex)
                {
                    LogAsync($"Error getting project from selection: {ex.Message}").ConfigureAwait(false);
                }

                // Method 2: Try to get from active document
                try
                {
                    var activeDocument = _dte.ActiveDocument;
                    if (activeDocument?.ProjectItem?.ContainingProject != null)
                    {
                        LogAsync($"Found project from active document: {activeDocument.ProjectItem.ContainingProject.Name}").ConfigureAwait(false);
                        return activeDocument.ProjectItem.ContainingProject;
                    }
                }
                catch (Exception ex)
                {
                    LogAsync($"Error getting project from active document: {ex.Message}").ConfigureAwait(false);
                }

                // Method 3: Try to get the startup project
                try
                {
                    var solutionBuild = _dte.Solution?.SolutionBuild;
                    if (solutionBuild?.StartupProjects != null)
                    {
                        var startupProjects = (Array)solutionBuild.StartupProjects;
                        LogAsync($"Startup projects count: {startupProjects?.Length ?? 0}").ConfigureAwait(false);
                        
                        if (startupProjects.Length > 0)
                        {
                            var projectName = startupProjects.GetValue(0).ToString();
                            LogAsync($"Looking for startup project: {projectName}").ConfigureAwait(false);
                            
                            foreach (Project project in _dte.Solution.Projects)
                            {
                                if (project.Name == projectName)
                                {
                                    LogAsync($"Found startup project: {project.Name}").ConfigureAwait(false);
                                    return project;
                                }
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    LogAsync($"Error getting startup project: {ex.Message}").ConfigureAwait(false);
                }

                // Method 4: Try to get any suitable project using our enhanced scanning
                try
                {
                    if (_dte.Solution?.Projects != null)
                    {
                        var allProjects = new List<ProjectInfo>();
                        // Use a synchronous version for this method since GetActiveProject is called synchronously
                        ScanProjectsRecursiveSync(_dte.Solution.Projects, allProjects);
                        
                        // Look for suitable project types
                        foreach (var projectInfo in allProjects)
                        {
                            // Find the actual project object
                            var project = FindProjectByFullName(projectInfo.FullName);
                            if (project != null)
                            {
                                LogAsync($"Checking project: {project.Name}, Kind: {project.Kind}").ConfigureAwait(false);
                                
                                // Look for C# or VB.NET projects (avoid solution folders and other project types)
                                if (project.Kind == "{FAE04EC0-301F-11D3-BF4B-00C04F79EFBC}" || // C# project
                                    project.Kind == "{F184B08F-C81C-45F6-A57F-5ABD9991F28F}" || // VB.NET project
                                    project.Kind == "{9A19103F-16F7-4668-BE54-9A1E7A4F7556}" || // .NET SDK-style project
                                    project.Kind == "{82b43b9b-a64c-4715-b499-d71e9ca2bd60}")   // VSIX project
                                {
                                    LogAsync($"Found suitable project: {project.Name}").ConfigureAwait(false);
                                    return project;
                                }
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    LogAsync($"Error using enhanced project scanning: {ex.Message}").ConfigureAwait(false);
                }

                // Method 5: Fallback to first project regardless of type
                try
                {
                    if (_dte.Solution?.Projects?.Count > 0)
                    {
                        var firstProject = _dte.Solution.Projects.Item(1);
                        LogAsync($"Using first project as fallback: {firstProject.Name}").ConfigureAwait(false);
                        return firstProject;
                    }
                }
                catch (Exception ex)
                {
                    LogAsync($"Error getting first project: {ex.Message}").ConfigureAwait(false);
                }

                LogAsync("No active project could be determined").ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                LogAsync($"Error in GetActiveProject: {ex.Message}").ConfigureAwait(false);
            }

            return null;
        }

        private async Task<List<ProjectInfo>> GetAllProjectsAsync()
        {
            var projects = new List<ProjectInfo>();
            
            try
            {
                await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync();

                if (_dte?.Solution?.Projects != null)
                {
                    await LogAsync($"Solution loaded, scanning {_dte.Solution.Projects.Count} items...");
                    
                    // Use recursive function to handle solution folders
                    await ScanProjectsRecursiveAsync(_dte.Solution.Projects, projects);
                }
                else
                {
                    await LogAsync("No solution or projects found");
                }
            }
            catch (Exception ex)
            {
                await LogAsync($"Error getting all projects: {ex.Message}");
            }

            await LogAsync($"Project detection complete: Found {projects.Count} projects");
            return projects;
        }

        private async Task ScanProjectsRecursiveAsync(Projects projectsCollection, List<ProjectInfo> foundProjects)
        {
            foreach (Project project in projectsCollection)
            {
                try
                {
                    await LogAsync($"Scanning item: {project.Name}, Kind: {project.Kind}");
                    
                    // Handle solution folders - recursively scan their projects
                    if (project.Kind == "{66A26720-8FB5-11D2-AA7E-00C04F688DDE}") // Solution Folder GUID
                    {
                        await LogAsync($"Found solution folder: {project.Name}, scanning contents...");
                        
                        // Solution folders can contain projects - scan them recursively
                        if (project.ProjectItems != null)
                        {
                            foreach (ProjectItem item in project.ProjectItems)
                            {
                                try
                                {
                                    if (item.SubProject != null)
                                    {
                                        await LogAsync($"Found project in solution folder: {item.SubProject.Name}");
                                        await ProcessProjectAsync(item.SubProject, foundProjects);
                                    }
                                }
                                catch (Exception ex)
                                {
                                    await LogAsync($"Error processing project item in solution folder: {ex.Message}");
                                }
                            }
                        }
                    }
                    else
                    {
                        // Regular project - process it
                        await ProcessProjectAsync(project, foundProjects);
                    }
                }
                catch (Exception ex)
                {
                    await LogAsync($"Error processing project {project?.Name}: {ex.Message}");
                }
            }
        }

        private async Task ProcessProjectAsync(Project project, List<ProjectInfo> foundProjects)
        {
            try
            {
                var projectDir = Path.GetDirectoryName(project.FullName);
                if (!string.IsNullOrEmpty(projectDir) && Directory.Exists(projectDir))
                {
                    foundProjects.Add(new ProjectInfo
                    {
                        Name = project.Name,
                        FullName = project.FullName,
                        Directory = projectDir,
                        Kind = project.Kind
                    });
                    await LogAsync($"Added project: {project.Name} at {projectDir}");
                }
                else
                {
                    await LogAsync($"Skipping project {project.Name}: Invalid or non-existent directory");
                }
            }
            catch (Exception ex)
            {
                await LogAsync($"Error processing individual project {project?.Name}: {ex.Message}");
            }
        }

        private Project FindProjectByFullName(string fullName)
        {
            try
            {
                ThreadHelper.ThrowIfNotOnUIThread();
                
                if (_dte?.Solution?.Projects != null)
                {
                    return FindProjectRecursive(_dte.Solution.Projects, fullName);
                }
            }
            catch (Exception ex)
            {
                LogAsync($"Error finding project by full name: {ex.Message}").ConfigureAwait(false);
            }
            return null;
        }

        private Project FindProjectByDirectoryRecursive(Projects projectsCollection, string targetDirectory)
        {
            foreach (Project project in projectsCollection)
            {
                try
                {
                    // Check if this is the project we're looking for
                    var projDir = Path.GetDirectoryName(project.FullName);
                    if (string.Equals(projDir, targetDirectory, StringComparison.OrdinalIgnoreCase))
                    {
                        return project;
                    }
                    
                    // If this is a solution folder, search within it recursively
                    if (project.Kind == "{66A26720-8FB5-11D2-AA7E-00C04F688DDE}" && project.ProjectItems != null)
                    {
                        var foundProject = SearchProjectItemsRecursive(project.ProjectItems, targetDirectory);
                        if (foundProject != null)
                        {
                            return foundProject;
                        }
                    }
                }
                catch (Exception ex)
                {
                    LogAsync($"Error in recursive project directory search: {ex.Message}").ConfigureAwait(false);
                }
            }
            return null;
        }

        /// <summary>
        /// Recursively searches through project items to find a project with the target directory
        /// </summary>
        private Project SearchProjectItemsRecursive(ProjectItems projectItems, string targetDirectory)
        {
            foreach (ProjectItem item in projectItems)
            {
                try
                {
                    if (item.SubProject != null)
                    {
                        var subProjDir = Path.GetDirectoryName(item.SubProject.FullName);
                        if (string.Equals(subProjDir, targetDirectory, StringComparison.OrdinalIgnoreCase))
                        {
                            return item.SubProject;
                        }
                        
                        // If this sub-project is also a solution folder, search it recursively
                        if (item.SubProject.Kind == "{66A26720-8FB5-11D2-AA7E-00C04F688DDE}" && item.SubProject.ProjectItems != null)
                        {
                            var foundProject = SearchProjectItemsRecursive(item.SubProject.ProjectItems, targetDirectory);
                            if (foundProject != null)
                            {
                                return foundProject;
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    LogAsync($"Error checking project item: {ex.Message}").ConfigureAwait(false);
                }
            }
            return null;
        }

        private Project FindProjectRecursive(Projects projectsCollection, string fullName)
        {
            foreach (Project project in projectsCollection)
            {
                try
                {
                    // Check if this is the project we're looking for
                    if (string.Equals(project.FullName, fullName, StringComparison.OrdinalIgnoreCase))
                    {
                        return project;
                    }
                    
                    // If this is a solution folder, search within it recursively
                    if (project.Kind == "{66A26720-8FB5-11D2-AA7E-00C04F688DDE}" && project.ProjectItems != null)
                    {
                        var foundProject = SearchProjectItemsByFullNameRecursive(project.ProjectItems, fullName);
                        if (foundProject != null)
                        {
                            return foundProject;
                        }
                    }
                }
                catch (Exception ex)
                {
                    LogAsync($"Error in recursive project search: {ex.Message}").ConfigureAwait(false);
                }
            }
            return null;
        }

        /// <summary>
        /// Recursively searches through project items to find a project with the target full name
        /// </summary>
        private Project SearchProjectItemsByFullNameRecursive(ProjectItems projectItems, string fullName)
        {
            foreach (ProjectItem item in projectItems)
            {
                try
                {
                    if (item.SubProject != null)
                    {
                        if (string.Equals(item.SubProject.FullName, fullName, StringComparison.OrdinalIgnoreCase))
                        {
                            return item.SubProject;
                        }
                        
                        // If this sub-project is also a solution folder, search it recursively
                        if (item.SubProject.Kind == "{66A26720-8FB5-11D2-AA7E-00C04F688DDE}" && item.SubProject.ProjectItems != null)
                        {
                            var foundProject = SearchProjectItemsByFullNameRecursive(item.SubProject.ProjectItems, fullName);
                            if (foundProject != null)
                            {
                                return foundProject;
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    LogAsync($"Error checking project item: {ex.Message}").ConfigureAwait(false);
                }
            }
            return null;
        }

        private void ScanProjectsRecursiveSync(Projects projectsCollection, List<ProjectInfo> foundProjects)
        {
            foreach (Project project in projectsCollection)
            {
                try
                {
                    LogAsync($"Scanning item: {project.Name}, Kind: {project.Kind}").ConfigureAwait(false);
                    
                    // Handle solution folders - recursively scan their projects
                    if (project.Kind == "{66A26720-8FB5-11D2-AA7E-00C04F688DDE}") // Solution Folder GUID
                    {
                        LogAsync($"Found solution folder: {project.Name}, scanning contents...").ConfigureAwait(false);
                        
                        // Solution folders can contain projects - scan them recursively
                        if (project.ProjectItems != null)
                        {
                            foreach (ProjectItem item in project.ProjectItems)
                            {
                                try
                                {
                                    if (item.SubProject != null)
                                    {
                                        LogAsync($"Found project in solution folder: {item.SubProject.Name}").ConfigureAwait(false);
                                        ProcessProjectSync(item.SubProject, foundProjects);
                                    }
                                }
                                catch (Exception ex)
                                {
                                    LogAsync($"Error processing project item in solution folder: {ex.Message}").ConfigureAwait(false);
                                }
                            }
                        }
                    }
                    else
                    {
                        // Regular project - process it
                        ProcessProjectSync(project, foundProjects);
                    }
                }
                catch (Exception ex)
                {
                    LogAsync($"Error processing project {project?.Name}: {ex.Message}").ConfigureAwait(false);
                }
            }
        }

        private void ProcessProjectSync(Project project, List<ProjectInfo> foundProjects)
        {
            try
            {
                var projectDir = Path.GetDirectoryName(project.FullName);
                if (!string.IsNullOrEmpty(projectDir) && Directory.Exists(projectDir))
                {
                    foundProjects.Add(new ProjectInfo
                    {
                        Name = project.Name,
                        FullName = project.FullName,
                        Directory = projectDir,
                        Kind = project.Kind
                    });
                    LogAsync($"Added project: {project.Name} at {projectDir}").ConfigureAwait(false);
                }
                else
                {
                    LogAsync($"Skipping project {project.Name}: Invalid or non-existent directory").ConfigureAwait(false);
                }
            }
            catch (Exception ex)
            {
                LogAsync($"Error processing individual project {project?.Name}: {ex.Message}").ConfigureAwait(false);
            }
        }

        private string CreateProjectsJson(List<ProjectInfo> projects)
        {
            var jsonBuilder = new StringBuilder();
            jsonBuilder.Append("{\"projects\":[");
            
            for (int i = 0; i < projects.Count; i++)
            {
                if (i > 0) jsonBuilder.Append(",");
                
                jsonBuilder.Append("{");
                jsonBuilder.Append($"\"name\":\"{EscapeJsonString(projects[i].Name)}\",");
                jsonBuilder.Append($"\"directory\":\"{EscapeJsonString(projects[i].Directory)}\",");
                jsonBuilder.Append($"\"fullName\":\"{EscapeJsonString(projects[i].FullName)}\"");
                jsonBuilder.Append("}");
            }
            
            jsonBuilder.Append("]}");
            return jsonBuilder.ToString();
        }

        private async Task WriteResponseAsync(HttpListenerResponse response, string message)
        {
            try
            {
                var buffer = Encoding.UTF8.GetBytes(message);
                response.ContentLength64 = buffer.Length;
                await response.OutputStream.WriteAsync(buffer, 0, buffer.Length);
                response.Close();
            }
            catch { /* Ignore write errors */ }
        }

        private async Task CreateOutputPaneAsync()
        {
            try
            {
                await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync();

                var guid = new Guid("12345678-1234-1234-1234-123456789012");
                _outputWindow.CreatePane(ref guid, "File Receiver Extension", 1, 1);
                _outputWindow.GetPane(ref guid, out _outputPane);
            }
            catch { /* Ignore output pane creation errors */ }
        }

        private async Task LogAsync(string message)
        {
            try
            {
                await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync();
                
                var timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
                var logMessage = $"[{timestamp}] {message}\n";
                
                _outputPane?.OutputString(logMessage);
            }
            catch { /* Ignore logging errors */ }
        }

        private class FileData
        {
            public string FileName { get; set; }
            public string Content { get; set; }
            public string FolderPath { get; set; } // Optional folder path relative to project root
            public string ProjectDirectory { get; set; } // Optional specific project directory
        }
    }
}