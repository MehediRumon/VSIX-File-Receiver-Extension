document.addEventListener('DOMContentLoaded', function() {
    const fileNameInput = document.getElementById('fileName');
    const fileContentInput = document.getElementById('fileContent');
    const folderSelect = document.getElementById('folderSelect');
    const refreshFoldersButton = document.getElementById('refreshFoldersButton');
    const sendButton = document.getElementById('sendButton');
    const statusDiv = document.getElementById('status');

    // Load folders on startup
    loadFolders();

    refreshFoldersButton.addEventListener('click', function() {
        loadFolders();
    });

    sendButton.addEventListener('click', function() {
        const fileName = fileNameInput.value.trim();
        const fileContent = fileContentInput.value;
        const folderPath = folderSelect.value;

        if (!fileName) {
            showStatus('Please enter a file name', 'error');
            return;
        }

        if (!fileContent) {
            showStatus('Please enter file content', 'error');
            return;
        }

        sendFileToVisualStudio(fileName, fileContent, folderPath);
    });

    function loadFolders() {
        refreshFoldersButton.disabled = true;
        refreshFoldersButton.textContent = '⏳';

        fetch('http://localhost:8080/folders')
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        })
        .then(data => {
            // Clear existing options except the first one (Project Root)
            folderSelect.innerHTML = '<option value="">Project Root</option>';
            
            if (data.folders && data.folders.length > 0) {
                data.folders.forEach(folder => {
                    if (folder.path !== "") { // Skip root folder as it's already added
                        const option = document.createElement('option');
                        option.value = folder.path;
                        option.textContent = folder.name;
                        folderSelect.appendChild(option);
                    }
                });
                showStatus(`Loaded ${data.folders.length} folders`, 'success');
            }
        })
        .catch(error => {
            console.error('Error loading folders:', error);
            showStatus(`Could not load folders: ${error.message}`, 'error');
        })
        .finally(() => {
            refreshFoldersButton.disabled = false;
            refreshFoldersButton.textContent = '🔄';
        });
    }

    function sendFileToVisualStudio(fileName, content, folderPath) {
        sendButton.disabled = true;
        sendButton.textContent = 'Sending...';

        const fileData = {
            fileName: fileName,
            content: content
        };

        // Add folderPath only if it's not empty
        if (folderPath && folderPath.trim() !== '') {
            fileData.folderPath = folderPath.trim();
        }

        fetch('http://localhost:8080/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(fileData)
        })
        .then(response => {
            if (response.ok) {
                return response.text();
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        })
        .then(data => {
            const location = folderPath ? `folder '${folderPath}'` : 'project root';
            showStatus(`File sent successfully to ${location}!`, 'success');
            // Clear the form
            fileNameInput.value = '';
            fileContentInput.value = '';
            folderSelect.value = '';
        })
        .catch(error => {
            console.error('Error sending file:', error);
            showStatus(`Error: ${error.message}`, 'error');
        })
        .finally(() => {
            sendButton.disabled = false;
            sendButton.textContent = 'Send to Visual Studio';
        });
    }

    function showStatus(message, type) {
        statusDiv.textContent = message;
        statusDiv.className = `status ${type}`;
        statusDiv.style.display = 'block';

        // Hide status after 5 seconds
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    }
});