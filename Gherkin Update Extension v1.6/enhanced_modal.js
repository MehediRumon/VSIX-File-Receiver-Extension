// Enhanced modal function with File Manager option

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
        max-width: 550px;
        width: 90%;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    `;
    
    const modalId = 'modal_' + Date.now(); // Unique ID
    
    modalContent.innerHTML = `
        <div style="margin-bottom: 20px;">
            <h3 style="margin: 0 0 15px 0; color: #1f2937;">📁 Save to Custom Location</h3>
            <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                Target path: <strong style="color: #059669;">${downloadPath}</strong>
            </p>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
                File: <strong>${filename}</strong>
            </p>
        </div>
        
        <div style="margin-bottom: 15px;">
            <button id="${modalId}_filemanager" style="
                background: linear-gradient(135deg, #059669, #10b981);
                color: white;
                border: none;
                padding: 15px 20px;
                border-radius: 10px;
                cursor: pointer;
                font-size: 16px;
                font-weight: bold;
                width: 100%;
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
                transition: all 0.2s ease;
            " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                📁 Open File Manager & Choose Location
            </button>
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
            ">📥 Downloads Folder</button>
            
            <button id="${modalId}_copy" style="
                background: #7c3aed;
                color: white;
                border: none;
                padding: 10px 16px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                flex: 1;
                min-width: 120px;
            ">📋 Copy Content</button>
            
            <button id="${modalId}_view" style="
                background: #f59e0b;
                color: white;
                border: none;
                padding: 10px 16px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                flex: 1;
                min-width: 120px;
            ">👁️ View</button>
        </div>
        
        <div style="margin-top: 15px; padding: 12px; background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; font-size: 13px; color: #065f46;">
            💡 <strong>Recommended:</strong> Use "Open File Manager" to browse directly to your folder and save the file exactly where you want it!
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
        const fileManagerBtn = document.getElementById(`${modalId}_filemanager`);
        const downloadBtn = document.getElementById(`${modalId}_download`);
        const copyBtn = document.getElementById(`${modalId}_copy`);
        const viewBtn = document.getElementById(`${modalId}_view`);
        const closeBtn = document.getElementById(`${modalId}_close`);
        
        if (fileManagerBtn) {
            fileManagerBtn.onclick = async () => {
                document.body.removeChild(modal);
                await tryFileSystemAccess(filename, content, downloadPath);
            };
        }
        
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

// Enhanced File System Access with better error handling
async function tryFileSystemAccess(filename, content, downloadPath) {
    // Check if File System Access API is available
    if ('showSaveFilePicker' in window) {
        try {
            // Get file extension
            const ext = filename.split('.').pop();
            const acceptTypes = {};
            
            if (ext === 'cs') {
                acceptTypes['text/x-csharp'] = ['.cs'];
            } else if (ext === 'feature') {
                acceptTypes['text/plain'] = ['.feature'];
            } else {
                acceptTypes['text/plain'] = ['.txt', '.cs', '.feature'];
            }
            
            const fileHandle = await window.showSaveFilePicker({
                suggestedName: filename,
                startIn: 'downloads', // Start in Downloads, user can navigate
                types: [{
                    description: 'Generated test files',
                    accept: acceptTypes
                }]
            });
            
            const writable = await fileHandle.createWritable();
            await writable.write(content);
            await writable.close();
            
            showToast(`📄 ${filename} saved successfully to your chosen location!`, 'success');
            return true;
            
        } catch (error) {
            if (error.name === 'AbortError') {
                // User cancelled - that's fine
                showToast('📄 Save cancelled', 'info');
                return false;
            } else {
                console.warn('File System Access API failed:', error);
                showToast('❌ File manager not available. Using fallback download.', 'warning');
                fallbackDownload(filename, content);
                return false;
            }
        }
    } else {
        // API not available
        showToast('❌ File manager not supported in this context. Using fallback download.', 'warning');
        fallbackDownload(filename, content);
        return false;
    }
}
