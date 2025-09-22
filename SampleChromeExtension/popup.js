document.addEventListener('DOMContentLoaded', function() {
    const fileNameInput = document.getElementById('fileName');
    const fileContentInput = document.getElementById('fileContent');
    const sendButton = document.getElementById('sendButton');
    const statusDiv = document.getElementById('status');

    sendButton.addEventListener('click', function() {
        const fileName = fileNameInput.value.trim();
        const fileContent = fileContentInput.value;

        if (!fileName) {
            showStatus('Please enter a file name', 'error');
            return;
        }

        if (!fileContent) {
            showStatus('Please enter file content', 'error');
            return;
        }

        sendFileToVisualStudio(fileName, fileContent);
    });

    function sendFileToVisualStudio(fileName, content) {
        sendButton.disabled = true;
        sendButton.textContent = 'Sending...';

        const fileData = {
            fileName: fileName,
            content: content
        };

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
            showStatus('File sent successfully!', 'success');
            // Clear the form
            fileNameInput.value = '';
            fileContentInput.value = '';
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