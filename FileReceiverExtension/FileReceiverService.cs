using System;
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

        public async Task StartAsync()
        {
            try
            {
                // Create output pane for logging
                await CreateOutputPaneAsync();

                // Start HTTP listener on localhost port 8080
                _httpListener = new HttpListener();
                _httpListener.Prefixes.Add("http://localhost:8080/");
                _httpListener.Start();

                await LogAsync("File Receiver Service started on http://localhost:8080/");

                // Start listening for requests
                _ = Task.Run(async () => await ListenForRequestsAsync(_cancellationTokenSource.Token));
            }
            catch (Exception ex)
            {
                await LogAsync($"Error starting File Receiver Service: {ex.Message}");
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

                // Enable CORS for Chrome extension
                response.Headers.Add("Access-Control-Allow-Origin", "*");
                response.Headers.Add("Access-Control-Allow-Methods", "POST, OPTIONS");
                response.Headers.Add("Access-Control-Allow-Headers", "Content-Type");

                if (request.HttpMethod == "OPTIONS")
                {
                    // Handle preflight request
                    response.StatusCode = 200;
                    response.Close();
                    return;
                }

                if (request.HttpMethod == "POST")
                {
                    await HandleFileUploadAsync(request, response);
                }
                else
                {
                    response.StatusCode = 405; // Method Not Allowed
                    response.Close();
                }
            }
            catch (Exception ex)
            {
                await LogAsync($"Error processing request: {ex.Message}");
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

                if (string.IsNullOrEmpty(content))
                {
                    response.StatusCode = 400;
                    response.Close();
                    return;
                }

                // Parse JSON content (simple parsing for filename and content)
                var fileData = ParseFileData(content);
                if (fileData == null)
                {
                    response.StatusCode = 400;
                    await WriteResponseAsync(response, "Invalid file data format");
                    return;
                }

                // Add file to active project
                var success = await AddFileToProjectAsync(fileData.FileName, fileData.Content);
                
                if (success)
                {
                    response.StatusCode = 200;
                    await WriteResponseAsync(response, "File added successfully");
                    await LogAsync($"File '{fileData.FileName}' added to active project");
                }
                else
                {
                    response.StatusCode = 500;
                    await WriteResponseAsync(response, "Failed to add file to project");
                }
            }
            catch (Exception ex)
            {
                await LogAsync($"Error handling file upload: {ex.Message}");
                response.StatusCode = 500;
                await WriteResponseAsync(response, "Internal server error");
            }
        }

        private FileData ParseFileData(string json)
        {
            try
            {
                // Simple JSON parsing - in production, use a proper JSON library
                string fileName = null;
                string content = null;

                // Handle both single-line and multi-line JSON by using regex or string manipulation
                // Look for "fileName" field
                var fileNameMatch = Regex.Match(json, @"""fileName""\s*:\s*""([^""]+)""");
                if (fileNameMatch.Success)
                {
                    fileName = fileNameMatch.Groups[1].Value;
                }

                // Look for "content" field - handle escaped quotes properly
                // Find the opening quote after "content":
                var contentStart = json.IndexOf("\"content\"");
                if (contentStart >= 0)
                {
                    var colonIndex = json.IndexOf(':', contentStart);
                    if (colonIndex >= 0)
                    {
                        var quoteIndex = json.IndexOf('"', colonIndex);
                        if (quoteIndex >= 0)
                        {
                            var contentStartIndex = quoteIndex + 1;
                            var contentEndIndex = FindEndOfJsonString(json, contentStartIndex);
                            if (contentEndIndex > contentStartIndex)
                            {
                                content = json.Substring(contentStartIndex, contentEndIndex - contentStartIndex);
                                // Unescape JSON string content
                                content = content.Replace("\\\"", "\"").Replace("\\\\", "\\").Replace("\\n", "\n").Replace("\\r", "\r").Replace("\\t", "\t");
                            }
                        }
                    }
                }

                if (!string.IsNullOrEmpty(fileName) && content != null)
                {
                    // Decode content if it's base64 encoded
                    if (IsBase64String(content))
                    {
                        content = Encoding.UTF8.GetString(Convert.FromBase64String(content));
                    }
                    
                    return new FileData { FileName = fileName, Content = content };
                }
            }
            catch (Exception ex)
            {
                LogAsync($"Error parsing file data: {ex.Message}").ConfigureAwait(false);
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
            try
            {
                Convert.FromBase64String(s);
                return true;
            }
            catch
            {
                return false;
            }
        }

        private async Task<bool> AddFileToProjectAsync(string fileName, string content)
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

                // Create the full file path
                var filePath = Path.Combine(projectDir, fileName);

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
        }
    }
}