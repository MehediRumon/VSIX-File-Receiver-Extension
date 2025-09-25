// Fixed modal function to replace the problematic one in view.js

function showCustomPathDownloadModal(filename, content, downloadPath) {
    // Create modal for custom path download
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        padding: 25px;
        border-radius: 12px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    `;
    
    const modalId = 'modal_' + Date.now(); // Unique ID
    
    modalContent.innerHTML = `
        <div style="margin-bottom: 20px;">
            <h3 style="margin: 0 0 15px 0; color: #1f2937;">📁 Custom Download Location</h3>
            <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                Your custom download path: <strong style="color: #059669;">${downloadPath}</strong>
            </p>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
                Choose how you want to save <strong>${filename}</strong>:
            </p>
        </div>
        
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <button id="${modalId}_download" style="
                background: #3b82f6;
                color: white;
                border: none;
                padding: 10px 16px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                flex: 1;
                min-width: 120px;
            ">📥 Download to Downloads</button>
            
            <button id="${modalId}_copy" style="
                background: #7c3aed;
                color: white;
                border: none;
                padding: 10px 16px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                flex: 1;
                min-width: 140px;
            ">📋 Copy & Create File</button>
            
            <button id="${modalId}_view" style="
                background: #059669;
                color: white;
                border: none;
                padding: 10px 16px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                flex: 1;
                min-width: 120px;
            ">👁️ View Content</button>
        </div>
        
        <div style="margin-top: 15px; padding: 12px; background: #f3f4f6; border-radius: 8px; font-size: 13px; color: #374151;">
            💡 <strong>To save to your custom path:</strong><br>
            1. Use "Copy & Create File" to copy content<br>
            2. Open File Explorer → Navigate to <code style="background: #e5e7eb; padding: 2px 4px; border-radius: 3px;">${downloadPath}</code><br>
            3. Create new file → Paste content → Save as <code style="background: #e5e7eb; padding: 2px 4px; border-radius: 3px;">${filename}</code>
        </div>
        
        <button id="${modalId}_close" style="
            background: #6b7280;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            margin-top: 15px;
            width: 100%;
        ">✕ Cancel</button>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Event handlers with unique IDs
    setTimeout(() => {
        const downloadBtn = document.getElementById(`${modalId}_download`);
        const copyBtn = document.getElementById(`${modalId}_copy`);
        const viewBtn = document.getElementById(`${modalId}_view`);
        const closeBtn = document.getElementById(`${modalId}_close`);
        
        if (downloadBtn) {
            downloadBtn.onclick = () => {
                fallbackDownload(filename, content);
                document.body.removeChild(modal);
                showToast(`📄 ${filename} downloaded to Downloads folder`, 'info');
            };
        }
        
        if (copyBtn) {
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(content).then(() => {
                    document.body.removeChild(modal);
                    showToast(`📋 ${filename} copied! Navigate to ${downloadPath} and create the file`, 'success');
                }).catch(() => {
                    // Fallback for clipboard
                    const textArea = document.createElement('textarea');
                    textArea.value = content;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    document.body.removeChild(modal);
                    showToast(`📋 ${filename} copied! Navigate to ${downloadPath} and create the file`, 'success');
                });
            };
        }
        
        if (viewBtn) {
            viewBtn.onclick = () => {
                document.body.removeChild(modal);
                showContentViewModal(filename, content, downloadPath);
            };
        }
        
        if (closeBtn) {
            closeBtn.onclick = () => {
                document.body.removeChild(modal);
            };
        }
    }, 50);
    
    // Close on background click
    modal.onclick = (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    };
}
