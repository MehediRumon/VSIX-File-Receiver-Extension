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
                response.Headers.Add("Access-Control-Allow-Methods", "POST, OPTIONS");
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

                // Add file to active project
                var success = await AddFileToProjectAsync(fileData.FileName, fileData.Content, fileData.FolderPath);
                
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
                await LogAsync("Retrieving project folder structure");

                // Get the active project
                var project = GetActiveProject();
                if (project == null)
                {
                    await LogAsync("No active project found for folder request");
                    response.StatusCode = 404;
                    await WriteResponseAsync(response, "{\"error\":\"No active project found\"}");
                    return;
                }

                // Get project directory
                var projectDir = Path.GetDirectoryName(project.FullName);
                if (string.IsNullOrEmpty(projectDir))
                {
                    await LogAsync("Could not determine project directory");
                    response.StatusCode = 500;
                    await WriteResponseAsync(response, "{\"error\":\"Could not determine project directory\"}");
                    return;
                }

                // Get folder structure
                var folders = GetProjectFolders(projectDir);
                var jsonResponse = CreateFoldersJson(folders);

                response.StatusCode = 200;
                response.ContentType = "application/json";
                await WriteResponseAsync(response, jsonResponse);
                await LogAsync($"Sent folder structure with {folders.Count} folders");
            }
            catch (Exception ex)
            {
                await LogAsync($"Error handling get folders request: {ex.Message}");
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

                    var relativePath = Path.GetRelativePath(projectDir, dir);
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

        private async Task<FileData> ParseFileDataAsync(string json)
        {
            try
            {
                await LogAsync($"Parsing JSON data: {json.Substring(0, Math.Min(100, json.Length))}...");
                
                // Simple JSON parsing - handles both single-line and multi-line JSON
                string fileName = null;
                string content = null;
                string folderPath = null;

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

                if (!string.IsNullOrEmpty(fileName) && content != null)
                {
                    await LogAsync($"Successfully parsed file: {fileName}" + 
                                  (string.IsNullOrEmpty(folderPath) ? "" : $" in folder: {folderPath}"));
                    
                    // Decode content if it's base64 encoded
                    if (IsBase64String(content))
                    {
                        await LogAsync("Content appears to be base64 encoded, decoding...");
                        content = Encoding.UTF8.GetString(Convert.FromBase64String(content));
                    }
                    
                    return new FileData { FileName = fileName, Content = content, FolderPath = folderPath };
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

        private async Task<bool> AddFileToProjectAsync(string fileName, string content, string folderPath = null)
        {
            try
            {
                await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync();

                // Get the active project
                var project = GetActiveProject();
                if (project == null)
                {
                    await LogAsync("No active project found");
                    return false;
                }

                // Get project directory
                var projectDir = Path.GetDirectoryName(project.FullName);
                if (string.IsNullOrEmpty(projectDir))
                {
                    await LogAsync("Could not determine project directory");
                    return false;
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

                // Try to get the active project from solution explorer
                var items = _dte.SelectedItems;
                if (items.Count > 0)
                {
                    var item = items.Item(1);
                    if (item.Project != null)
                    {
                        return item.Project;
                    }
                }

                // Try to get from active document
                var activeDocument = _dte.ActiveDocument;
                if (activeDocument?.ProjectItem?.ContainingProject != null)
                {
                    return activeDocument.ProjectItem.ContainingProject;
                }

                // Get the startup project
                var solutionBuild = _dte.Solution.SolutionBuild;
                if (solutionBuild?.StartupProjects != null)
                {
                    var startupProjects = (Array)solutionBuild.StartupProjects;
                    if (startupProjects.Length > 0)
                    {
                        var projectName = startupProjects.GetValue(0).ToString();
                        foreach (Project project in _dte.Solution.Projects)
                        {
                            if (project.Name == projectName)
                            {
                                return project;
                            }
                        }
                    }
                }

                // Fall back to first project in solution
                if (_dte.Solution.Projects.Count > 0)
                {
                    return _dte.Solution.Projects.Item(1);
                }
            }
            catch (Exception ex)
            {
                LogAsync($"Error getting active project: {ex.Message}").ConfigureAwait(false);
            }

            return null;
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
        }
    }
}