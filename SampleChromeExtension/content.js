// Content script for automatically sending generated files
// This script can be extended to automatically detect when files are generated
// and send them to Visual Studio without user interaction

// Example function to automatically send a file
function autoSendFile(fileName, content) {
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
            console.log('File automatically sent to Visual Studio:', fileName);
        } else {
            console.error('Failed to send file to Visual Studio:', response.statusText);
        }
    })
    .catch(error => {
        console.error('Error sending file to Visual Studio:', error);
    });
}

// Example: Listen for custom events or DOM changes that indicate file generation
// This is where you would add your specific logic for detecting generated files
window.addEventListener('fileGenerated', function(event) {
    if (event.detail && event.detail.fileName && event.detail.content) {
        autoSendFile(event.detail.fileName, event.detail.content);
    }
});

// Example usage:
// To trigger file sending from any webpage, dispatch a custom event:
// window.dispatchEvent(new CustomEvent('fileGenerated', {
//     detail: {
//         fileName: 'generated-file.txt',
//         content: 'This is the generated content'
//     }
// }));