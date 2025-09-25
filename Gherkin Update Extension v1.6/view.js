// Modern view.js: cards, dark mode, copy, edit, search, toasts

function parseLocator(locator) {
    const labelMatch = locator.match(/IWebElement\s+(\w+)/);
    const xpathMatch = locator.match(/By\.XPath\("([^"]+)"\)/);
    return {
        label: labelMatch ? labelMatch[1] : '',
        xpath: xpathMatch ? xpathMatch[1] : '',
        original: locator
    };
}

function filterDuplicateStrings(arr) {
    return Array.from(new Set(arr));
}
function filterDuplicateLocators(locators) {
    const seen = new Set();
    return locators.filter(loc => {
        if (seen.has(loc)) return false;
        seen.add(loc);
        return true;
    });
}

// Helper function to update Gherkin steps with current action name

function updateConfigurationInfo() {
    console.log('updateConfigurationInfo called');
    getStoredData((result) => {
        const actionName = result.actionName || '';
        const rootFileName = result.rootFileName || '';
        
        console.log('Configuration data:', { actionName, rootFileName });
        
        // Update configuration info
        const actionNameInfo = document.getElementById('actionNameInfo');
        const rootFileNameInfo = document.getElementById('rootFileNameInfo');
        const namespaceInfo = document.getElementById('namespaceInfo');
        
        if (actionNameInfo) {
            actionNameInfo.textContent = actionName || 'Not set';
            console.log('Action name set to:', actionNameInfo.textContent);
        }
        
        if (rootFileNameInfo) {
            rootFileNameInfo.textContent = rootFileName || 'Not set';
            console.log('Root file name set to:', rootFileNameInfo.textContent);
        }
        
        if (namespaceInfo) {
            const namespace = generateNamespace(rootFileName);
            namespaceInfo.textContent = namespace;
            console.log('Namespace generated:', namespace);
        }
        
        console.log('Configuration info updated');
        
        // Also update Locator and Method sections to maintain namespace
        updateCodeSectionsWithNamespace(result);
        
        // Also update file names preview
        updateFileNamesPreview();
    });
}

function updateCodeSectionsWithNamespace(result) {
    const actionName = result.actionName || '';
    const rootFileName = result.rootFileName || '';
    const locators = filterDuplicateLocators(result.collectedLocators || []);
    const methods = filterDuplicateStrings(result.collectedMethods || []);
    
    // Generate class names based on action name
    let className, pageClassName;
    if (actionName && actionName.trim()) {
        const cleanActionName = actionName.replace(/\s+/g, '');
        className = `${cleanActionName}Element`;
        pageClassName = `${cleanActionName}Page`;
    } else {
        className = result.elementClassName || 'DefaultElementClass';
        pageClassName = result.pageClassName || 'DefaultPageClass';
    }
    
    const namespace = generateNamespace(rootFileName);
    console.log('Updating code sections with namespace:', namespace);
    
    // Update locator code with namespace
    const locatorElement = document.getElementById('locatorCode');
    if (locatorElement) {
        const locatorContent = locators.length
            ? `namespace ${namespace}\n{\n    public static class ${className}\n    {\n${locators.map(l => '        ' + l).join('\n')}\n    }\n}`
            : `namespace ${namespace}\n{\n    public static class ${className}\n    {\n        // No locators collected\n    }\n}`;
        locatorElement.innerText = locatorContent;
        console.log('Locator code updated with namespace');
    }
    
    // Update method code with namespace
    const methodElement = document.getElementById('methodCode');
    if (methodElement) {
        const methodContent = methods.length
            ? `namespace ${namespace}\n{\n    public class ${pageClassName}(IWebDriver driver)\n    {\n        public IWebDriver Driver => driver;\n\n        public IJavaScriptExecutor Js => (IJavaScriptExecutor)driver;\n\n${methods.map(m => '        ' + m).join('\n')}\n    }\n}`
            : `namespace ${namespace}\n{\n    public class ${pageClassName}(IWebDriver driver)\n    {\n        public IWebDriver Driver => driver;\n\n        public IJavaScriptExecutor Js => (IJavaScriptExecutor)driver;\n\n        // No methods collected\n    }\n}`;
        methodElement.innerText = methodContent;
        console.log('Method code updated with namespace');
    }
}

function generateNamespace(rootFileName) {
    if (!rootFileName || !rootFileName.trim()) {
        return 'YourNamespacehere';
    }
    
    const trimmedRoot = rootFileName.trim();
    
    // If it already contains the full UMS.UI.Test.ERP.Areas path, use as-is but clean it
    if (trimmedRoot.includes('UMS.UI.Test.ERP.Areas')) {
        // Remove any potential duplications and clean up
        let cleanNamespace = trimmedRoot;
        // Remove multiple occurrences of the base path
        cleanNamespace = cleanNamespace.replace(/UMS\.UI\.Test\.ERP\.Areas\.UMS\.UI\.Test\.ERP\.Areas\./g, 'UMS.UI.Test.ERP.Areas.');
        // Remove .Steps if present (we'll add it separately for step files)
        cleanNamespace = cleanNamespace.replace(/\.Steps$/, '');
        return cleanNamespace;
    }
    
    // If it contains dots but not the full path, assume it's a custom namespace
    if (trimmedRoot.includes('.')) {
        return trimmedRoot.replace(/\.Steps$/, ''); // Remove .Steps if present
    }
    
    // Otherwise, treat as area name and build full namespace
    const cleanRootFileName = trimmedRoot.replace(/\s+/g, '').replace(/[^a-zA-Z0-9\.]/g, '');
    return `UMS.UI.Test.ERP.Areas.${cleanRootFileName}`;
}

function getStoredData(callback) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.get([
            'collectedLocators', 'collectedGherkinSteps', 'collectedMethods',
            'elementClassName', 'pageClassName', 'actionName', 'collectedParamValues', 'menuName', 'rootFileName'
        ], callback);
    } else {
        // Fallback to localStorage for testing
        const result = {
            collectedLocators: JSON.parse(localStorage.getItem('collectedLocators') || '[]'),
            collectedGherkinSteps: JSON.parse(localStorage.getItem('collectedGherkinSteps') || '[]'),
            collectedMethods: JSON.parse(localStorage.getItem('collectedMethods') || '[]'),
            elementClassName: JSON.parse(localStorage.getItem('elementClassName') || '"DefaultElementClass"'),
            pageClassName: JSON.parse(localStorage.getItem('pageClassName') || '"DefaultPageClass"'),
            actionName: JSON.parse(localStorage.getItem('actionName') || '""'),
            collectedParamValues: JSON.parse(localStorage.getItem('collectedParamValues') || '{}'),
            menuName: JSON.parse(localStorage.getItem('menuName') || '"ExportedSheet"'),
            rootFileName: JSON.parse(localStorage.getItem('rootFileName') || '""')
        };
        callback(result);
    }
}

getStoredData((result) => {
    console.log('Loaded data:', result); // Debug log
    
    const locators = filterDuplicateLocators(result.collectedLocators || []);
    const gherkinSteps = filterDuplicateStrings(result.collectedGherkinSteps || []);
    const methods = filterDuplicateStrings(result.collectedMethods || []);
    const actionName = result.actionName || '';
    const menuName = result.menuName || '';
    const rootFileName = result.rootFileName || '';
    
    // Update configuration info persistently
    updateConfigurationInfo();
    
    // Generate class names based on action name
    let className, pageClassName;
    if (actionName && actionName.trim()) {
        const cleanActionName = actionName.replace(/\s+/g, ''); // Remove spaces
        className = `${cleanActionName}Element`;
        pageClassName = `${cleanActionName}Page`;
    } else {
        className = result.elementClassName || 'DefaultElementClass';
        pageClassName = result.pageClassName || 'DefaultPageClass';
    }

    const locatorElement = document.getElementById('locatorCode');
    const gherkinElement = document.getElementById('gherkinCode');
    const methodElement = document.getElementById('methodCode');
    
    // Generate namespace using the helper function
    const namespace = generateNamespace(rootFileName);
    
    // Update locator code with namespace
    if (locatorElement) {
        const locatorContent = locators.length
            ? `namespace ${namespace}\n{\n    public static class ${className}\n    {\n${locators.map(l => '        ' + l).join('\n')}\n    }\n}`
            : `namespace ${namespace}\n{\n    public static class ${className}\n    {\n        // No locators collected\n    }\n}`;
        locatorElement.innerText = locatorContent;
    }

    if (gherkinElement) {
        gherkinElement.innerText = gherkinSteps.length
            ? gherkinSteps.join('\n')
            : 'No Gherkin steps collected.';
    }

    // Update method code with namespace
    if (methodElement) {
        const methodContent = methods.length
            ? `namespace ${namespace}\n{\n    public class ${pageClassName}(IWebDriver driver)\n    {\n        public IWebDriver Driver => driver;\n\n        public IJavaScriptExecutor Js => (IJavaScriptExecutor)driver;\n\n${methods.map(m => '        ' + m).join('\n')}\n    }\n}`
            : `namespace ${namespace}\n{\n    public class ${pageClassName}(IWebDriver driver)\n    {\n        public IWebDriver Driver => driver;\n\n        public IJavaScriptExecutor Js => (IJavaScriptExecutor)driver;\n\n        // No methods collected\n    }\n}`;
        methodElement.innerText = methodContent;
    }

    console.log('Gherkin steps found:', gherkinSteps.length); // Debug log
    console.log('Action name:', actionName); // Debug log
    console.log('Menu name:', menuName); // Debug log
    console.log('Generated class names:', { className, pageClassName }); // Debug log
    
    // Initialize Excel values display - force fresh data load
    setTimeout(() => {
        refreshExcelValues();
        // Also ensure configuration info is updated and persists
        updateConfigurationInfo();
        // Update it again after a short delay to ensure it sticks
        setTimeout(updateConfigurationInfo, 1000);
    }, 500);
    
    // Force update all sections when page loads
    setTimeout(() => {
        forceRefreshAllSections();
    }, 800);
    
    // Initialize step file generator - ensure DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => initializeStepFileGenerator(gherkinSteps, pageClassName), 100);
        });
    } else {
        setTimeout(() => initializeStepFileGenerator(gherkinSteps, pageClassName), 100);
    }
});

function renderActionList(actions) {
    const container = document.getElementById('xhrActions');
    if (!container) return;
    const list = actions.map(a => `• ${a}`).join('\n');
    container.innerText = list || 'No actions found.';
}

// 🔥 Load and group XHR logs
function loadXHRLogs() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['urls', 'actions'], processXHRData);
    } else {
        // Fallback for testing
        const urls = JSON.parse(localStorage.getItem('urls') || '[]');
        const actions = JSON.parse(localStorage.getItem('actions') || '[]');
        processXHRData({ urls, actions });
    }
}

function processXHRData(res) {
    const urls = res.urls || [];
    const actionMap = {};
    urls.forEach(entry => {
        if (!actionMap[entry.action]) actionMap[entry.action] = [];
        actionMap[entry.action].push(entry);
    });

    const actionFilter = document.getElementById('actionFilter');
    const xhrSearch = document.getElementById('xhrSearch');
	
	actionFilter.innerHTML = '<option value="All">All</option>';

    Object.keys(actionMap).sort().forEach(action => {
        const opt = document.createElement('option');
        opt.value = action;
        opt.textContent = action;
        actionFilter.appendChild(opt);
    });

    function renderLogs(actionKey, search = '') {
        let logOutput = '';
        const targetActions = actionKey === 'All' ? Object.keys(actionMap) : [actionKey];
        targetActions.forEach(action => {
            const filteredEntries = actionMap[action].filter(u =>
                u.url.toLowerCase().includes(search) ||
                (u.method && u.method.toLowerCase().includes(search)) ||
                (u.time && u.time.toLowerCase().includes(search)) ||
                (u.payload && JSON.stringify(u.payload).toLowerCase().includes(search))
            );
            if (filteredEntries.length === 0) return;
            logOutput += `# ${action}\n`;
            filteredEntries.forEach(u => {
                logOutput += `[${u.method}] ${u.url} (${u.time})\n`;
                if (u.payload) {
                    if (typeof u.payload === 'object') {
                        const formattedPayload = JSON.stringify(u.payload, null, 2)
                            .split('\n')
                            .map(line => `    ${line}`)
                            .join('\n');
                        logOutput += `  Payload:\n${formattedPayload}\n`;
                    } else {
                        logOutput += `  Payload: ${u.payload}\n`;
                    }
                }
            });
            logOutput += '\n';
        });
        document.getElementById('xhrLogs').innerText = logOutput || 'No URLs found.';
    }

    actionFilter.addEventListener('change', () => {
        renderLogs(actionFilter.value, xhrSearch.value.trim().toLowerCase());
    });
    if (xhrSearch) {
        xhrSearch.addEventListener('input', () => {
            renderLogs(actionFilter.value, xhrSearch.value.trim().toLowerCase());
        });
    }

    renderLogs('All');
    renderActionList(res.actions || []);
}

// Call the function to load XHR logs
loadXHRLogs();

// Sample data functions
function loadSampleData() {
    const sampleData = {
        collectedGherkinSteps: [
            "When Click On Login Button",
            "When Enter TestMenu Username \"<username>\"",
            "When Select ClassAttendance Organization \"<organization>\"",
            "When Enter ExamReport Date From \"<dateFrom>\"",
            "When Enter StudentReport Date To \"<dateTo>\"",
            "When Select AdminPanel Multiple Courses \"<courses>\"",
            "When Select StudentData Version \"<version>\"",
            "When Enter ManageGroup Excel File \"<excelFile>\"",
            "When Upload StudentData Image \"<imageFile>\"",
            "When Click On Search Button",
            "When Select ReportFilter Dropdown Option \"<option>\""
        ],
        collectedLocators: [
            "public static By LoginButton => By.XPath(\"//button[@id='login']\");",
            "public static By Username => By.XPath(\"//input[@id='username']\");",
            "public static By Organization => By.XPath(\"//select[@id='organization']\");",
            "public static By DateFrom => By.XPath(\"//input[@id='dateFrom']\");",
            "public static By DateTo => By.XPath(\"//input[@id='dateTo']\");",
            "public static By Courses => By.XPath(\"//select[@id='courses']/following-sibling::div//button\");",
            "public static By Version => By.XPath(\"//select[@id='Version']/following-sibling::div//button\");",
            "public static By ExcelFile => By.XPath(\"//input[@id='excelFile']\");",
            "public static By ImageUpload => By.XPath(\"//input[@id='imageUpload']\");",
            "public static By SearchButton => By.XPath(\"//button[@id='search']\");",
            "public static By DropdownOption => By.XPath(\"//select[@id='dropdown']\");"
        ],
        collectedMethods: [
            "public IWebElement GetLoginButton() => driver.FindElement(ElementClass.LoginButton);",
            "public IWebElement GetUsername() => driver.FindElement(ElementClass.Username);",
            "public IWebElement GetOrganization() => driver.FindElement(ElementClass.Organization);",
            "public IWebElement GetDateFrom() => driver.FindElement(ElementClass.DateFrom);",
            "public IWebElement GetDateTo() => driver.FindElement(ElementClass.DateTo);",
            "public IWebElement GetCourses() => driver.FindElement(ElementClass.Courses);",
            "public IWebElement GetVersion() => driver.FindElement(ElementClass.Version);",
            "public IWebElement GetExcelFile() => driver.FindElement(ElementClass.ExcelFile);",
            "public IWebElement GetImageUpload() => driver.FindElement(ElementClass.ImageUpload);",
            "public IWebElement GetSearchButton() => driver.FindElement(ElementClass.SearchButton);",
            "public IWebElement GetDropdownOption() => driver.FindElement(ElementClass.DropdownOption);"
        ],
        elementClassName: "TestElementClass",
        pageClassName: "TestPage",
        actionName: "TestAction"
    };

    // Store data
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.set(sampleData, () => {
            showToast('Sample data loaded successfully!', 'success');
            location.reload(); // Reload to show the data
        });
    } else {
        // Fallback to localStorage
        Object.keys(sampleData).forEach(key => {
            localStorage.setItem(key, JSON.stringify(sampleData[key]));
        });
        showToast('Sample data loaded successfully!', 'success');
        location.reload(); // Reload to show the data
    }
}

function clearAllData() {
    const keys = ['collectedGherkinSteps', 'collectedLocators', 'collectedMethods', 'elementClassName', 'pageClassName', 'actionName'];
    
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        const clearData = {};
        keys.forEach(key => {
            if (key === 'elementClassName') {
                clearData[key] = 'DefaultElementClass';
            } else if (key === 'pageClassName') {
                clearData[key] = 'DefaultPageClass';
            } else if (key === 'actionName') {
                clearData[key] = '';
            } else {
                clearData[key] = [];
            }
        });
        
        chrome.storage.sync.set(clearData, () => {
            showToast('All data cleared!', 'info');
            location.reload();
        });
    } else {
        // Fallback to localStorage
        keys.forEach(key => localStorage.removeItem(key));
        showToast('All data cleared!', 'info');
        location.reload();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('themeToggleBtn');
    const forceRefreshBtn = document.getElementById('forceRefreshBtn');
    
    if (localStorage.getItem("darkMode") === "enabled") {
        document.body.classList.add("dark-mode");
    }
    toggleBtn?.addEventListener('click', () => {
        const isDark = document.body.classList.toggle("dark-mode");
        localStorage.setItem("darkMode", isDark ? "enabled" : "disabled");
    });

    // Force refresh all sections
    if (forceRefreshBtn) {
        forceRefreshBtn.addEventListener('click', () => {
            showToast('🔄 Force refreshing all sections...', 'info');
            forceRefreshAllSections();
        });
    }

    // Add sample data button functionality
    const loadSampleBtn = document.getElementById('loadSampleDataBtn');
    const clearDataBtn = document.getElementById('clearDataBtn');
    const refreshDataBtn = document.getElementById('refreshDataBtn');
    
    if (loadSampleBtn) {
        loadSampleBtn.addEventListener('click', loadSampleData);
    }
    
    if (clearDataBtn) {
        clearDataBtn.addEventListener('click', clearAllData);
    }
    
    if (refreshDataBtn) {
        refreshDataBtn.addEventListener('click', () => {
            showToast('Refreshing data...', 'info');
            location.reload();
        });
    }

    // Excel Values section button functionality
    const exportExcelBtn = document.getElementById('exportExcelBtn');
    const addParameterBtn = document.getElementById('addParameterBtn');
    const refreshExcelBtn = document.getElementById('refreshExcelBtn');
    const clearParametersBtn = document.getElementById('clearParametersBtn');
    
    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', exportToExcel);
    }
    
    if (addParameterBtn) {
        addParameterBtn.addEventListener('click', addNewParameter);
    }
    
    if (refreshExcelBtn) {
        refreshExcelBtn.addEventListener('click', () => {
            showToast('Refreshing Excel values...', 'info');
            refreshExcelValues();
        });
    }
    
    if (clearParametersBtn) {
        clearParametersBtn.addEventListener('click', clearAllParameters);
    }

    document.querySelectorAll('.copy-btn').forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.getAttribute('data-target');
            const statusId = button.getAttribute('data-status');
            const content = document.getElementById(targetId)?.innerText;
            const statusSpan = document.getElementById(statusId);
            if (content && statusSpan) {
                navigator.clipboard.writeText(content).then(() => {
                    statusSpan.textContent = 'Copied!';
                    statusSpan.classList.add('show');
                    statusSpan.style.color = '#10b981';
                    setTimeout(() => {
                        statusSpan.classList.remove('show');
                        statusSpan.textContent = '';
                        statusSpan.style.color = '';
                    }, 1200);
                });
            }
        });
    });
    document.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.getAttribute('data-target');
            const preElement = document.getElementById(targetId);
            if (!preElement) return;
            const textArea = document.createElement('textarea');
            textArea.value = preElement.innerText;
            textArea.style.width = '100%';
            textArea.style.height = '200px';
            textArea.style.fontFamily = 'monospace';
            textArea.style.borderRadius = '8px';
            preElement.replaceWith(textArea);
            button.textContent = '💾';
            button.addEventListener('click', () => {
                const newPre = document.createElement('pre');
                newPre.id = targetId;
                newPre.innerText = textArea.value;
                textArea.replaceWith(newPre);
                button.textContent = '✏️';
                
                // If editing Gherkin steps, update storage and refresh step file generator
                if (targetId === 'gherkinCode') {
                    const newSteps = textArea.value.split('\n').filter(step => step.trim() !== '');
                    const uniqueSteps = filterDuplicateStrings(newSteps);
                    
                    // Update storage
                    const updateData = { collectedGherkinSteps: uniqueSteps };
                    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
                        chrome.storage.sync.set(updateData, () => {
                            console.log('Gherkin steps updated from edit:', uniqueSteps.length);
                            
                            // Get current page class name and refresh step file generator
                            getStoredData((result) => {
                                const pageClassName = result.pageClassName || 'DefaultPageClass';
                                initializeStepFileGenerator(uniqueSteps, pageClassName);
                                showToast('Gherkin steps updated! Step File Generator refreshed.', 'success');
                            });
                        });
                    } else {
                        // Fallback to localStorage
                        localStorage.setItem('collectedGherkinSteps', JSON.stringify(uniqueSteps));
                        console.log('Gherkin steps updated in localStorage:', uniqueSteps.length);
                        
                        // Get current page class name and refresh step file generator
                        getStoredData((result) => {
                            const pageClassName = result.pageClassName || 'DefaultPageClass';
                            initializeStepFileGenerator(uniqueSteps, pageClassName);
                            showToast('Gherkin steps updated! Step File Generator refreshed.', 'success');
                        });
                    }
                }
                
                // If editing Excel Values, parse and update parameter values
                if (targetId === 'excelValuesCode') {
                    const editedContent = textArea.value;
                    const updatedParamValues = parseExcelValuesFromText(editedContent);
                    
                    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
                        chrome.storage.sync.set({ collectedParamValues: updatedParamValues }, () => {
                            console.log('Parameter values updated from edit:', updatedParamValues);
                            showToast('Parameter values updated! Excel export will use new values.', 'success');
                        });
                    } else {
                        // Fallback to localStorage
                        localStorage.setItem('collectedParamValues', JSON.stringify(updatedParamValues));
                        console.log('Parameter values updated in localStorage:', updatedParamValues);
                        showToast('Parameter values updated! Excel export will use new values.', 'success');
                    }
                }
            }, { once: true });
        });
    });
});

// ✅ Clear Action Names, Logs, and Filter on Reset
chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'reset') {
        const xhrActions = document.getElementById('xhrActions');
        if (xhrActions) xhrActions.innerText = 'No actions found.';
        const xhrLogs = document.getElementById('xhrLogs');
        if (xhrLogs) xhrLogs.innerText = 'No URLs found.';
        const actionFilter = document.getElementById('actionFilter');
        if (actionFilter) {
            actionFilter.innerHTML = '<option value="All">All</option>';
        }
        // Reset step file generator
        const stepFileCode = document.getElementById('stepFileCode');
        if (stepFileCode) stepFileCode.innerText = 'Select input types and click Generate Step File...';
        const stepConfigContainer = document.getElementById('stepConfigurationContainer');
        if (stepConfigContainer) stepConfigContainer.innerHTML = '<p style="color: #666; font-style: italic;">No Gherkin steps available. Collect some steps first.</p>';
        const generateBtn = document.getElementById('generateStepFileBtn');
        if (generateBtn) generateBtn.disabled = true;
    }
});

// Optional: Toast for feedback (reuse popup.js showToast for consistency)
window.showToast = function (message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast-message toast-' + type;
    toast.innerHTML = (type === 'success' ? '✅ ' : type === 'error' ? '❌ ' : 'ℹ️ ') + message;
    document.body.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 2200);
};

// Step File Generator Functions
function initializeStepFileGenerator(gherkinSteps, pageClassName) {
    console.log('Initializing Step File Generator with steps:', gherkinSteps);
    
    const container = document.getElementById('stepConfigurationContainer');
    const generateBtn = document.getElementById('generateStepFileBtn');
    
    if (!container || !generateBtn) {
        console.error('Step File Generator elements not found:', { container: !!container, generateBtn: !!generateBtn });
        return;
    }
    
    // Clear container
    container.innerHTML = '';
    
    if (gherkinSteps.length === 0) {
        container.innerHTML = '<p style="color: #666; font-style: italic;">No Gherkin steps available. Collect some steps first.</p>';
        generateBtn.disabled = true;
        return;
    }
    
    generateBtn.disabled = false;
    
    // Create configuration for each step
    gherkinSteps.forEach((step, index) => {
        const configItem = createStepConfigItem(step, index);
        container.appendChild(configItem);
    });
    
    // Add event listener to generate button
    generateBtn.onclick = () => generateStepFile(gherkinSteps, pageClassName);
    
    console.log('Step File Generator initialized successfully');
}

// Excel Values Functions
function loadAndDisplayExcelValues(result) {
    console.log('Loading Excel values with result:', result); // Debug log
    
    const excelValuesElement = document.getElementById('excelValuesCode');
    const parameterCountElement = document.getElementById('parameterCount');
    
    if (!excelValuesElement) {
        console.log('Excel values element not found'); // Debug log
        return;
    }
    
    const gherkinSteps = result.collectedGherkinSteps || [];
    const collectedParamValues = result.collectedParamValues || {};
    const menuName = result.menuName || 'ExportedSheet';
    
    console.log('Excel values data:', { gherkinSteps, collectedParamValues, menuName }); // Debug log
    
    // Extract parameters from Gherkin steps
    const paramSet = new Set();
    const paramRegex = /<([^>]+)>/g;
    
    gherkinSteps.forEach(step => {
        let match;
        while ((match = paramRegex.exec(step)) !== null) {
            paramSet.add(match[1]);
        }
    });
    
    const parameters = Array.from(paramSet);
    console.log('Extracted parameters:', parameters); // Debug log
    
    // Update parameter count
    if (parameterCountElement) {
        parameterCountElement.textContent = `Parameters: ${parameters.length}`;
    }
    
    // Create display content
    if (parameters.length === 0) {
        excelValuesElement.innerText = 'No parameters found in Gherkin steps.\nParameters are extracted from patterns like <parameterName>.';
        return;
    }
    
    // Format for display
    let displayContent = `Sheet Name: ${menuName}\n\n`;
    displayContent += `Parameters and Values:\n`;
    displayContent += `${'='.repeat(50)}\n\n`;
    
    parameters.forEach((param, index) => {
        const value = collectedParamValues[param] || '[No value set]';
        console.log(`Parameter ${param}: ${value}`); // Debug log
        displayContent += `${index + 1}. ${param}: "${value}"\n`;
    });
    
    displayContent += `\n${'='.repeat(50)}\n`;
    displayContent += `Excel Headers: ${parameters.join(', ')}\n`;
    displayContent += `Excel Values: ${parameters.map(p => collectedParamValues[p] || '').join(', ')}\n`;
    
    excelValuesElement.innerText = displayContent;
}

function parseExcelValuesFromText(text) {
    const paramValues = {};
    
    // Parse the edited text to extract parameter values
    // Look for lines in format: "1. paramName: "value""
    const lines = text.split('\n');
    
    lines.forEach(line => {
        // Match pattern like: "1. organization: "some value""
        const match = line.match(/^\d+\.\s*([^:]+):\s*"([^"]*)"/);
        if (match) {
            const paramName = match[1].trim();
            const paramValue = match[2];
            paramValues[paramName] = paramValue;
        }
    });
    
    console.log('Parsed parameter values from edited text:', paramValues);
    return paramValues;
}

function exportToExcel() {
    getStoredData((result) => {
        const gherkinSteps = result.collectedGherkinSteps || [];
        const paramMap = result.collectedParamValues || {};
        const rawMenuName = result.menuName || 'ExportedSheet';
        const cleanedMenuName = rawMenuName.replace(/\s+/g, '');

        // Gather all unique parameter names used in steps
        const paramSet = new Set();
        const paramRegex = /<([^>]+)>/g;
        gherkinSteps.forEach(step => {
            let match;
            while ((match = paramRegex.exec(step)) !== null) {
                paramSet.add(match[1]);
            }
        });

        const headers = Array.from(paramSet);
        if (headers.length === 0) {
            showToast("No parameters found in Gherkin steps", "error");
            return;
        }

        // Check if XLSX library is available
        if (typeof XLSX === 'undefined') {
            showToast("Excel export library not loaded", "error");
            return;
        }

        // Prepare worksheet for Excel
        const wsData = [headers, headers.map(h => paramMap[h] || '')];
        const worksheet = XLSX.utils.aoa_to_sheet(wsData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, cleanedMenuName);
        XLSX.writeFile(workbook, `${cleanedMenuName}.xlsx`);
        showToast("Excel file exported successfully!", "success");
    });
}

function addNewParameter() {
    const paramName = prompt("Enter parameter name:");
    if (!paramName || !paramName.trim()) return;
    
    const cleanParamName = paramName.trim();
    const paramValue = prompt(`Enter value for "${cleanParamName}":`);
    if (paramValue === null) return; // User cancelled
    
    // Update storage with new parameter
    getStoredData((result) => {
        const collectedParamValues = result.collectedParamValues || {};
        collectedParamValues[cleanParamName] = paramValue || '';
        
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
            chrome.storage.sync.set({ collectedParamValues }, () => {
                showToast(`Parameter "${cleanParamName}" added successfully!`, 'success');
                // Refresh the display with updated data
                refreshExcelValues();
            });
        } else {
            // Fallback to localStorage
            localStorage.setItem('collectedParamValues', JSON.stringify(collectedParamValues));
            showToast(`Parameter "${cleanParamName}" added successfully!`, 'success');
            // Refresh the display with updated data
            refreshExcelValues();
        }
    });
}

function refreshExcelValues() {
    // Force refresh of Excel values by getting fresh data from storage
    getStoredData((result) => {
        console.log('Refreshing Excel values with fresh data:', result);
        loadAndDisplayExcelValues(result);
    });
}

function forceRefreshAllSections() {
    console.log('Force refreshing all sections...');
    getStoredData((result) => {
        const locators = filterDuplicateLocators(result.collectedLocators || []);
        const rawGherkinSteps = filterDuplicateStrings(result.collectedGherkinSteps || []);
        const rawMethods = filterDuplicateStrings(result.collectedMethods || []);
        const actionName = result.actionName || '';
        const menuName = result.menuName || '';
        
        // Generate class names based on action name
        let className, pageClassName;
        if (actionName && actionName.trim()) {
            const cleanActionName = actionName.replace(/\s+/g, '');
            className = `${cleanActionName}Element`;
            pageClassName = `${cleanActionName}Page`;
        } else {
            className = result.elementClassName || 'DefaultElementClass';
            pageClassName = result.pageClassName || 'DefaultPageClass';
        }
        
        const gherkinSteps = rawGherkinSteps;
        const methods = rawMethods;
        
        console.log('Force refresh with current data:', { 
            actionName, 
            menuName, 
            className, 
            pageClassName 
        });
        
        // Update all sections
        const locatorElement = document.getElementById('locatorCode');
        const gherkinElement = document.getElementById('gherkinCode');
        const methodElement = document.getElementById('methodCode');
        
        if (locatorElement) {
            locatorElement.innerText = locators.length
                ? `public static class ${className} {\n${locators.map(l => '    ' + l).join('\n')}\n}`
                : 'No locators collected.';
        }
        
        if (gherkinElement) {
            gherkinElement.innerText = gherkinSteps.length
                ? gherkinSteps.join('\n')
                : 'No Gherkin steps collected.';
        }
        
        if (methodElement) {
            methodElement.innerText = methods.length
                ? `public static class ${pageClassName}(IWebDriver driver) {\n    public IWebDriver Driver => driver;\n\n    public IJavaScriptExecutor Js => (IJavaScriptExecutor)driver;\n\n${methods.map(m => '    ' + m).join('\n')}\n}`
                : 'No methods collected.';
        }
        
        // Refresh Step File Generator
        initializeStepFileGenerator(gherkinSteps, pageClassName);
        
        // Refresh Excel Values
        loadAndDisplayExcelValues(result);
        
        console.log('All sections force refreshed successfully');
    });
}

function clearAllParameters() {
    if (!confirm("Are you sure you want to clear all parameter values?")) return;
    
    const emptyParams = {};
    
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.set({ collectedParamValues: emptyParams }, () => {
            showToast('All parameter values cleared!', 'info');
            getStoredData((result) => {
                loadAndDisplayExcelValues({ ...result, collectedParamValues: emptyParams });
            });
        });
    } else {
        // Fallback to localStorage
        localStorage.setItem('collectedParamValues', JSON.stringify(emptyParams));
        showToast('All parameter values cleared!', 'info');
        getStoredData((result) => {
            loadAndDisplayExcelValues({ ...result, collectedParamValues: emptyParams });
        });
    }
}

function createStepConfigItem(step, index) {
    const div = document.createElement('div');
    div.className = 'step-config-item';
    
    const stepContainer = document.createElement('div');
    stepContainer.className = 'step-container';
    
    const label = document.createElement('div');
    label.className = 'step-config-label';
    label.textContent = step;
    label.dataset.originalStep = step;
    label.dataset.stepIndex = index;
    
    const editBtn = document.createElement('button');
    editBtn.className = 'step-edit-btn';
    editBtn.textContent = '✏️ Edit';
    editBtn.onclick = () => editStep(label, index);
    
    stepContainer.appendChild(label);
    stepContainer.appendChild(editBtn);
    
    const select = document.createElement('select');
    select.className = 'step-config-select';
    select.dataset.stepIndex = index;
    
    // Input type options
    const options = [
        { value: 'click', text: 'Click/Button' },
        { value: 'normal_select', text: 'Normal Select' },
        { value: 'multi_select', text: 'Multi Select' },
        { value: 'normal_input', text: 'Normal Input Field' },
        { value: 'search_dropdown', text: 'Search Dropdown' },
        { value: 'date_from', text: 'Date From' },
        { value: 'date_to', text: 'Date To' },
        { value: 'image_upload', text: 'Image Upload' },
        { value: 'excel_upload', text: 'Excel Upload' },
        { value: 'excel_file_upload', text: 'Excel File Upload' }
    ];
    
    options.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option.value;
        opt.textContent = option.text;
        select.appendChild(opt);
    });
    
    // Auto-select based on step content
    autoSelectInputType(step, select);
    
    // Add event listener to update step text when input type changes
    select.addEventListener('change', function() {
        const labelElement = this.closest('.step-config-item').querySelector('.step-config-label');
        const originalStep = labelElement.dataset.originalStep;
        const newStepText = generateGherkinStepByInputType(originalStep, this.value);
        labelElement.textContent = newStepText;
    });
    
    div.appendChild(stepContainer);
    div.appendChild(select);
    
    return div;
}

function autoSelectInputType(step, select) {
    const stepLower = step.toLowerCase();
    const stepIndex = parseInt(select.dataset.stepIndex);
    
    // Get the corresponding locator to check for multiselect patterns
    getStoredData((result) => {
        const locators = result.collectedLocators || [];
        let isMultiselectDropdown = false;
        
        // Check if the corresponding locator indicates a multiselect dropdown
        if (stepIndex < locators.length) {
            const locator = locators[stepIndex];
            // Check if locator contains the multiselect pattern
            if (locator.includes('/following-sibling::div//button')) {
                isMultiselectDropdown = true;
            }
        }
        
        // Enhanced pattern matching
        if (stepLower.includes('click')) {
            select.value = 'click';
        } else if (stepLower.includes('enter') && (stepLower.includes('date from') || stepLower.includes('datefrom'))) {
            select.value = 'date_from';
        } else if (stepLower.includes('enter') && (stepLower.includes('date to') || stepLower.includes('dateto'))) {
            select.value = 'date_to';
        } else if (stepLower.includes('enter') && (stepLower.includes('image') || stepLower.includes('img'))) {
            select.value = 'image_upload';
        } else if (stepLower.includes('enter') && stepLower.includes('excel') && !stepLower.includes('file')) {
            select.value = 'excel_upload';
        } else if ((stepLower.includes('select') || stepLower.includes('upload')) && stepLower.includes('excel file')) {
            select.value = 'excel_file_upload';
        } else if (stepLower.includes('enter') && (stepLower.includes('upload') || stepLower.includes('file'))) {
            select.value = 'excel_upload';
        } else if (stepLower.includes('enter')) {
            // Check if this is actually a multiselect dropdown based on locator
            if (isMultiselectDropdown) {
                select.value = 'multi_select';
            } else {
                select.value = 'normal_input';
            }
        } else if (stepLower.includes('select') && (stepLower.includes('multiple') || stepLower.includes('multi'))) {
            select.value = 'multi_select';
        } else if (stepLower.includes('select')) {
            // Check if it might be a search dropdown based on common patterns
            if (stepLower.includes('search') || stepLower.includes('dropdown') || stepLower.includes('filter')) {
                select.value = 'search_dropdown';
            } else if (isMultiselectDropdown) {
                // If locator indicates multiselect but step says "select", it's likely a multiselect
                select.value = 'multi_select';
            } else {
                select.value = 'normal_select';
            }
        }
    });
}

function editStep(labelElement, stepIndex) {
    const currentText = labelElement.textContent;
    
    // Create input field
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentText;
    input.className = 'step-edit-input';
    input.style.width = '100%';
    input.style.padding = '8px';
    input.style.border = '1px solid #ddd';
    input.style.borderRadius = '4px';
    input.style.fontSize = '14px';
    
    // Create save and cancel buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'edit-buttons';
    buttonContainer.style.marginTop = '8px';
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '8px';
    
    const saveBtn = document.createElement('button');
    saveBtn.textContent = '💾 Save';
    saveBtn.className = 'edit-save-btn';
    saveBtn.style.padding = '4px 8px';
    saveBtn.style.backgroundColor = '#10b981';
    saveBtn.style.color = 'white';
    saveBtn.style.border = 'none';
    saveBtn.style.borderRadius = '4px';
    saveBtn.style.cursor = 'pointer';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '❌ Cancel';
    cancelBtn.className = 'edit-cancel-btn';
    cancelBtn.style.padding = '4px 8px';
    cancelBtn.style.backgroundColor = '#ef4444';
    cancelBtn.style.color = 'white';
    cancelBtn.style.border = 'none';
    cancelBtn.style.borderRadius = '4px';
    cancelBtn.style.cursor = 'pointer';
    
    buttonContainer.appendChild(saveBtn);
    buttonContainer.appendChild(cancelBtn);
    
    // Replace label content with input and buttons
    const originalContent = labelElement.innerHTML;
    labelElement.innerHTML = '';
    labelElement.appendChild(input);
    labelElement.appendChild(buttonContainer);
    
    // Focus on input
    input.focus();
    input.select();
    
    // Save functionality
    function saveEdit() {
        const newStepText = input.value.trim();
        if (newStepText && newStepText !== currentText) {
            // Update the label
            labelElement.textContent = newStepText;
            labelElement.dataset.originalStep = newStepText;
            
            // Update the step in the global array and storage
            updateStepInStorage(stepIndex, newStepText);
            
            // Auto-detect input type based on new text
            const select = labelElement.closest('.step-config-item').querySelector('.step-config-select');
            autoSelectInputType(newStepText, select);
            
            showToast('Step updated successfully!', 'success');
            
            // Refresh the step file generator to handle any duplicates
            setTimeout(() => {
                getStoredData((result) => {
                    const uniqueSteps = filterDuplicateStrings(result.collectedGherkinSteps || []);
                    if (uniqueSteps.length !== result.collectedGherkinSteps.length) {
                        // Duplicates were found and removed, refresh the UI
                        showToast('Duplicate steps removed!', 'info');
                        location.reload();
                    }
                });
            }, 500);
        } else {
            labelElement.innerHTML = originalContent;
        }
    }
    
    // Cancel functionality
    function cancelEdit() {
        labelElement.innerHTML = originalContent;
    }
    
    // Event listeners
    saveBtn.onclick = saveEdit;
    cancelBtn.onclick = cancelEdit;
    
    // Save on Enter, Cancel on Escape
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            saveEdit();
        } else if (e.key === 'Escape') {
            cancelEdit();
        }
    });
}

function updateStepInStorage(stepIndex, newStepText) {
    // Get current data
    getStoredData((result) => {
        const gherkinSteps = result.collectedGherkinSteps || [];
        
        // Update the specific step
        if (stepIndex < gherkinSteps.length) {
            gherkinSteps[stepIndex] = newStepText;
            
            // Filter duplicates before saving to storage
            const uniqueSteps = filterDuplicateStrings(gherkinSteps);
            
            // Save back to storage with unique steps only
            const updateData = { collectedGherkinSteps: uniqueSteps };
            
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
                chrome.storage.sync.set(updateData, () => {
                    console.log('Step updated in storage:', newStepText);
                    console.log('Unique steps count:', uniqueSteps.length);
                });
            } else {
                // Fallback to localStorage
                localStorage.setItem('collectedGherkinSteps', JSON.stringify(uniqueSteps));
                console.log('Step updated in localStorage:', newStepText);
                console.log('Unique steps count:', uniqueSteps.length);
            }
            
            // Update the main Gherkin display as well
            updateGherkinDisplay(uniqueSteps);
        }
    });
}

function updateGherkinDisplay(gherkinSteps) {
    // Filter duplicates before displaying
    const uniqueSteps = filterDuplicateStrings(gherkinSteps);
    const gherkinElement = document.getElementById('gherkinCode');
    if (gherkinElement) {
        gherkinElement.innerText = uniqueSteps.length
            ? uniqueSteps.join('\n')
            : 'No Gherkin steps collected.';
    }
}

// Function to generate custom Gherkin step based on input type
function generateGherkinStepByInputType(originalStep, inputType) {
    // Extract the menu/element name from the original step
    // Remove common prefixes like "Click on", "When I click on", etc.
    let menuName = originalStep
        .replace(/^(When I |When |And |Then |Given |I )?click on /i, '')
        .replace(/^(When I |When |And |Then |Given |I )?select /i, '')
        .replace(/^(When I |When |And |Then |Given |I )?enter /i, '')
        .replace(/^(When I |When |And |Then |Given |I )?(choose|pick) /i, '')
        .trim();
    
    // Remove any trailing punctuation or words like "button", "field", "dropdown"
    menuName = menuName
        .replace(/\s+(button|field|dropdown|input|element|control)$/i, '')
        .replace(/[:\.\,\;]+$/, '')
        .trim();
    
    // Generate step based on input type
    switch (inputType) {
        case 'date_from':
            return `When Enter ${menuName} `;
        case 'date_to':
            return `When Enter ${menuName} `;
        case 'input':
        case 'textarea':
        case 'normal_input':
            return `When Enter ${menuName}`;
        case 'select':
        case 'multiselect':
        case 'normal_select':
        case 'multi_select':
        case 'search_dropdown':
        case 'excel_upload':
        case 'excel_file_upload':
        case 'image_upload':
            return `When Select ${menuName}`;
        case 'checkbox':
            return `When Check ${menuName}`;
        case 'radio':
            return `When Select ${menuName} Option`;
        case 'button':
        case 'click':
            return `When Click On ${menuName}`;
        case 'link':
            return `When Click ${menuName} Link`;
        default:
            return `When Click On ${menuName}`;
    }
}

function generateStepFile(gherkinSteps, pageClassName) {
    const selects = document.querySelectorAll('.step-config-select');
    const labels = document.querySelectorAll('.step-config-label');
    const stepConfigurations = [];
    
    selects.forEach((select, index) => {
        // Get the current text from the label (which might be edited)
        const currentStepText = labels[index] ? labels[index].textContent : gherkinSteps[index];
        
        // Generate updated Gherkin step based on input type
        const updatedStep = generateGherkinStepByInputType(currentStepText, select.value);
        
        stepConfigurations.push({
            step: updatedStep,
            inputType: select.value
        });
    });
    
    generateStepFileCode(stepConfigurations, pageClassName).then(stepFileCode => {
        console.log('Generated step file code length:', stepFileCode.length);
        console.log('First 200 characters:', stepFileCode.substring(0, 200));
        console.log('Contains line breaks:', stepFileCode.includes('\n'));
        
        const stepFileElement = document.getElementById('stepFileCode');
        if (stepFileElement) {
            // Use textContent to preserve formatting and add explicit line breaks
            stepFileElement.textContent = stepFileCode;
            // Also ensure the element has the right CSS for preserving whitespace
            stepFileElement.style.whiteSpace = 'pre-wrap';
            stepFileElement.style.fontFamily = 'monospace';
            
            console.log('Set step file content, element text length:', stepFileElement.textContent.length);
        }
        showToast('Step file generated successfully!', 'success');
    }).catch(error => {
        console.error('Error generating step file:', error);
        showToast('Error generating step file', 'error');
    });
}

function generateStepFileCode(stepConfigurations, pageClassName) {
    return new Promise(async (resolve) => {
        // Get root file name for namespace from storage
        getStoredData((result) => {
            const rootFileName = result.rootFileName || '';
            
            // Extract menu name from pageClassName (remove "Page" suffix)
            let stepClassName = pageClassName.replace('Page', 'Step');
            
            // Count multi-select inputs
            const multiSelectCount = stepConfigurations.filter(config => config.inputType === 'multi_select').length;
            
            // Generate namespace using helper function
            const namespace = generateNamespace(rootFileName);
            
            const imports = `using UMS.UI.Test.BusinessModel.Helper;
using UMS.UI.Test.ERP.Areas.Common;

namespace ${namespace}.Steps
{
    [Binding]
    public class ${stepClassName}(${pageClassName} page)
    {
        private IWebElement? _webElement;
        private static SelectElement SelectElement(IWebElement webElement) => new(webElement);
`;

        // Add MultiSelectTextarea helper method if there are 2 or more multi-selects
        let helperMethods = '';
        if (multiSelectCount >= 2) {
            helperMethods = `
        private void MultiSelectTextarea(string excelValue, string defaultValue, IWebElement webElement)
        {
            var excelValues = TestHelper.GetStringsBySplit(excelValue);
            if (excelValues.Count == 0)
                excelValues.Add(defaultValue);

            if (excelValues.Any())
            {
                var selectElement = SelectElement(webElement);
                foreach (var selectItem in excelValues)
                {
                    selectElement.Options
                        .FirstOrDefault(x => x.Text.Contains(selectItem, StringComparison.OrdinalIgnoreCase))?
                        .Click();
                }
            }

            else
                throw new ArgumentException($"No valid values found in the input: {excelValue}");
        }
`;
        }

        processSteps();
        
        async function processSteps() {
            let methods = '';
            
            // Process each step configuration asynchronously
            for (let i = 0; i < stepConfigurations.length; i++) {
                const config = stepConfigurations[i];
                const method = await generateMethodFromStep(config.step, config.inputType, multiSelectCount >= 2, i);
                if (method) {
                    if (methods) {
                        methods += '\n\n' + method;
                    } else {
                        methods = method;
                    }
                }
            }
            
            const closing = `    }
}`;
            
            // Ensure proper line breaks by explicitly joining with newlines
            const finalCode = [
                imports.trim(),
                helperMethods.trim(),
                methods,
                closing.trim()
            ].filter(part => part.length > 0).join('\n\n');
            
            resolve(finalCode);
        }
        
        }); // End of getStoredData callback
    });
}

function generateMethodFromStep(step, inputType, useMultiSelectHelper = false, stepIndex = -1) {
    return new Promise(async (resolve) => {
        // For custom step patterns, add parameter placeholders if missing
        let processedStep = step;
        
        // Add parameter placeholders for different input types
        if (inputType === 'date_from' && !processedStep.includes('<')) {
            processedStep = processedStep.replace(/FromDate$/, 'FromDate "<fromDate>"');
        } else if (inputType === 'date_to' && !processedStep.includes('<')) {
            processedStep = processedStep.replace(/ToDate$/, 'ToDate "<toDate>"');
        } else if ((inputType === 'select' || inputType === 'multiselect' || inputType === 'normal_select' || inputType === 'multi_select') && !processedStep.includes('<')) {
            // Add parameter for select operations
            const words = processedStep.split(' ');
            const lastWord = words[words.length - 1];
            processedStep = processedStep + ' "<' + lastWord.toLowerCase() + '>"';
        } else if ((inputType === 'input' || inputType === 'textarea' || inputType === 'normal_input') && !processedStep.includes('<')) {
            // Add parameter for input operations
            const words = processedStep.split(' ');
            const lastWord = words[words.length - 1];
            processedStep = processedStep + ' "<' + lastWord.toLowerCase() + '>"';
        }
        
        const methodName = extractMethodNameFromStep(processedStep);
        const paramName = extractParamNameFromStep(processedStep);
        const elementName = await extractElementNameFromStep(processedStep, stepIndex);
        
        console.log(`Step ${stepIndex}: "${step}" -> Method: ${methodName}, Element: ${elementName}`);
        
        // Convert step format for SpecFlow attribute: remove "When " prefix and replace "<parameter>" with {string}
        const specFlowStep = processedStep.replace(/^When\s+/, '').replace(/"<[^>]+>"/g, '{string}').trim();
        
        const templates = {
            click: `        [When("${specFlowStep}")]
        public void ${methodName}()
        {
            page.Get${elementName}().Click();
        }`,
            
            normal_select: `        [When("${specFlowStep}")]
        public void ${methodName}(string ${paramName})
        {
            _webElement = page.Get${elementName}();
            SelectElement(_webElement).SelectByText(${paramName});
        }`,
            
            multi_select: useMultiSelectHelper 
                ? `        [When("${specFlowStep}")]
        public void ${methodName}(string ${paramName})
        {
            _webElement = page.Get${elementName}();
            MultiSelectTextarea(${paramName}, "", _webElement);
        }`
                : `        [When("${specFlowStep}")]
        public void ${methodName}(string ${paramName})
        {
            _webElement = page.Get${elementName}();
            var ${paramName}s = TestHelper.GetStringsBySplit(${paramName});
            foreach (var item in ${paramName}s)
                SelectElement(_webElement).SelectByText(item);
        }`,
            
            normal_input: `        [When("${specFlowStep}")]
        public void ${methodName}(string ${paramName})
        {
            _webElement = page.Get${elementName}();
            _webElement.Clear();
            _webElement.SendKeys(${paramName});
        }`,
            
            search_dropdown: `        [When("${specFlowStep}")]
        public void ${methodName}(string ${paramName})
        {
            page.Get${elementName}().Click();
            TestHelper.SelectMultiItems(page.Driver, ${paramName});
        }`,
            
            date_from: `        [When("${specFlowStep}")]
        public void ${methodName}(string ${paramName})
        {
            ${paramName} = !string.IsNullOrEmpty(${paramName})
               ? ${paramName}
               : DateTime.Now.ToString("yyyy-MM-dd");
            page.Js.ExecuteScript($"arguments[0].value = '{${paramName}}';", page.Get${elementName}());
        }`,
            
            date_to: `        [When("${specFlowStep}")]
        public void ${methodName}(string ${paramName})
        {
            ${paramName} = !string.IsNullOrEmpty(${paramName})
                ? ${paramName}
                : DateTime.Now.ToString("yyyy-MM-dd");
            page.Js.ExecuteScript($"arguments[0].value = '{${paramName}}';", page.Get${elementName}());
        }`,
            
            image_upload: `        [When("${specFlowStep}")]
        public void When${methodName}(string ${paramName})
        {
            if (string.IsNullOrEmpty(${paramName}))
                throw new Exception("Excel file does not have values for ${elementName}");

            var imgPath = AppHelper.GetFilePath("TestData\\\\Administration\\\\Image", ${paramName});
            page.Get${elementName}().SendKeys(imgPath);
        }`,
            
            excel_upload: `        [When("${specFlowStep}")]
        public void When${methodName}(string ${paramName})
        {
            if (string.IsNullOrEmpty(${paramName}))
                throw new Exception("Excel file does not have values for ${elementName}");

            var excelPath = AppHelper.GetFilePath("TestData\\\\Administration\\\\Excel", ${paramName});
            page.Get${elementName}().SendKeys(excelPath);
        }`,
            
            excel_file_upload: `        [When("${specFlowStep}")]
        public void When${methodName}(string ${paramName})
        {
            page.Get${elementName}().SendKeys(AppHelper.GetFilePath("TestData\\\\Student\\\\Excel", ${paramName}));
        }`
        };
        
        resolve(templates[inputType] || templates.click);
    });
}

function extractMethodNameFromStep(step) {
    // Remove "When " and quotes, then convert to PascalCase
    let methodName = step.replace(/^When\s+/, '').replace(/"/g, '').replace(/<[^>]+>/g, '');
    
    // Clean up the method name to match the format like "WhenSelectLive5555Organization"
    methodName = methodName.split(' ').map(word => {
        // Skip common words and clean the word
        if (['on', 'the', 'a', 'an'].includes(word.toLowerCase())) {
            return '';
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).filter(word => word.length > 0).join('');
    
    // Add "When" prefix to match the expected format
    return 'When' + methodName || 'WhenDefaultMethod';
}

function extractParamNameFromStep(step) {
    // Extract parameter from <parameter> format
    const match = step.match(/<([^>]+)>/);
    if (match) {
        let paramName = match[1];
        // Convert to proper camelCase
        paramName = paramName.replace(/\s+/g, ''); // Remove spaces
        // Convert PascalCase to camelCase
        paramName = paramName.charAt(0).toLowerCase() + paramName.slice(1);
        return paramName;
    }
    
    // Try to derive parameter name from step content
    const stepWords = step.replace(/^When\s+/, '').replace(/"/g, '').split(' ');
    const lastMeaningfulWords = stepWords.filter(word => 
        !['click', 'on', 'enter', 'select', 'the', 'a', 'an'].includes(word.toLowerCase())
    );
    
    if (lastMeaningfulWords.length >= 2) {
        // Take last 2-3 words and convert to camelCase
        const words = lastMeaningfulWords.slice(-3);
        let paramName = words.map((word, index) => {
            if (index === 0) {
                return word.toLowerCase();
            }
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }).join('');
        return paramName;
    }
    
    if (lastMeaningfulWords.length === 1) {
        return lastMeaningfulWords[0].toLowerCase();
    }
    
    // Default parameter name
    return 'value';
}

function extractElementNameFromStep(step, stepIndex = -1) {
    // Get the current method names from storage to match against
    return new Promise((resolve) => {
        getStoredData((result) => {
            const methods = result.collectedMethods || [];
            
            // Extract element name from step text
            let elementName = step.replace(/^When\s+/, '').replace(/"/g, '').replace(/<[^>]+>/g, '');
            
            // Remove action words and common words
            const actionWords = ['click', 'on', 'enter', 'select', 'the', 'a', 'an', 'when', 'and', 'then', 'add', 'device'];
            let words = elementName.split(' ').filter(word => 
                !actionWords.includes(word.toLowerCase()) && word.trim().length > 0
            );
            
            // Try to match with existing method names first
            if (methods.length > 0) {
                // Extract method names from the stored methods
                const methodNames = methods.map(method => {
                    const match = method.match(/Get(\w+)\(\)/);
                    return match ? match[1] : null;
                }).filter(Boolean);
                
                console.log('Available method names:', methodNames);
                console.log('Step words to match:', words);
                console.log('Step index:', stepIndex);
                
                // First try: Direct index mapping if available and valid
                if (stepIndex >= 0 && stepIndex < methodNames.length) {
                    const directMatch = methodNames[stepIndex];
                    console.log('Direct index match:', directMatch);
                    
                    // Verify this direct match makes sense by checking for any word overlap
                    const stepText = words.join('').toLowerCase();
                    const methodText = directMatch.toLowerCase();
                    
                    // Check if there's some logical connection
                    let hasConnection = false;
                    const directMethodWords = directMatch.split(/(?=[A-Z])/).map(w => w.toLowerCase()).filter(w => w.length > 0);
                    const stepWords = words.map(w => w.toLowerCase());
                    
                    // Check for word connections
                    for (const stepWord of stepWords) {
                        for (const methodWord of directMethodWords) {
                            if (stepWord.includes(methodWord) || methodWord.includes(stepWord) || 
                                stepWord === methodWord || (stepWord.length >= 3 && methodWord.length >= 3 && 
                                (stepWord.substring(0, 3) === methodWord.substring(0, 3)))) {
                                hasConnection = true;
                                break;
                            }
                        }
                        if (hasConnection) break;
                    }
                    
                    // If there's a reasonable connection, use direct mapping
                    if (hasConnection) {
                        console.log('Using direct index mapping:', directMatch);
                        resolve(directMatch);
                        return;
                    }
                }
                
                // Second try: Improved matching algorithm
                let bestMatch = null;
                let bestScore = 0;
                
                methodNames.forEach((methodName, index) => {
                    // Split method name into words (PascalCase)
                    const methodWords = methodName.split(/(?=[A-Z])/).map(w => w.toLowerCase()).filter(w => w.length > 0);
                    const stepWords = words.map(w => w.toLowerCase());
                    
                    let score = 0;
                    let exactMatches = 0;
                    let partialMatches = 0;
                    
                    // Calculate exact word matches (highest priority)
                    methodWords.forEach(methodWord => {
                        stepWords.forEach(stepWord => {
                            if (methodWord === stepWord) {
                                exactMatches++;
                                score += 100; // High score for exact matches
                            } else if (methodWord.includes(stepWord) && stepWord.length >= 3) {
                                partialMatches++;
                                score += 50; // Medium score for partial matches
                            } else if (stepWord.includes(methodWord) && methodWord.length >= 3) {
                                partialMatches++;
                                score += 30; // Lower score for reverse partial matches
                            }
                        });
                    });
                    
                    // Special handling for compound words and common patterns
                    const stepText = stepWords.join('');
                    const methodText = methodWords.join('');
                    
                    // Check for exact substring matches in compound form
                    if (stepText.includes(methodText) || methodText.includes(stepText)) {
                        score += 75; // Good score for compound matches
                    }
                    
                    // Bonus for matching the last word (often the most important)
                    if (stepWords.length > 0 && methodWords.length > 0) {
                        const lastStepWord = stepWords[stepWords.length - 1];
                        const lastMethodWord = methodWords[methodWords.length - 1];
                        if (lastStepWord === lastMethodWord || lastStepWord.includes(lastMethodWord) || lastMethodWord.includes(lastStepWord)) {
                            score += 25;
                        }
                    }
                    
                    // Bonus for index proximity (prefer methods that are close in position)
                    if (stepIndex >= 0) {
                        const indexDistance = Math.abs(stepIndex - index);
                        if (indexDistance <= 2) { // Close methods get small bonus
                            score += (3 - indexDistance) * 5;
                        }
                    }
                    
                    // Penalty for length mismatch to avoid false positives
                    const lengthDiff = Math.abs(stepWords.length - methodWords.length);
                    if (lengthDiff > 2) {
                        score -= lengthDiff * 5;
                    }
                    
                    console.log(`Method: ${methodName}, Score: ${score}, Exact: ${exactMatches}, Partial: ${partialMatches}`);
                    
                    // Update best match if score is better and we have at least one meaningful match
                    if (score > bestScore && (exactMatches > 0 || partialMatches > 0 || score >= 75)) {
                        bestScore = score;
                        bestMatch = methodName;
                    }
                });
                
                console.log(`Best match: ${bestMatch} with score: ${bestScore}`);
                
                if (bestMatch && bestScore > 20) { // Lower threshold but require some match
                    resolve(bestMatch);
                    return;
                }
            }
            
            // Fallback to improved word extraction logic
            console.log('Fallback: No method match found, using word extraction');
            console.log('Original words:', words);
            
            // Remove menu/page names and common prefixes more intelligently
            if (words.length > 1) {
                // Common menu/page name patterns to remove (first words usually)
                const menuPatterns = [
                    'test', 'page', 'menu', 'report', 'admin', 'student', 'class', 'exam',
                    'manage', 'clear', 'attendance', 'entry', 'filter', 'search', 'view',
                    'add', 'edit', 'delete', 'update', 'create', 'new', 'list', 'live', 'check'
                ];
                
                let filteredWords = [...words];
                
                // Remove menu-like words from the beginning, but keep meaningful words
                while (filteredWords.length > 1) {
                    const firstWord = filteredWords[0].toLowerCase();
                    const hasMenuPattern = menuPatterns.some(pattern => 
                        firstWord.includes(pattern) || firstWord.length < 3
                    );
                    
                    if (hasMenuPattern) {
                        filteredWords = filteredWords.slice(1);
                    } else {
                        break;
                    }
                }
                
                // Use filtered words if we still have meaningful content
                if (filteredWords.length > 0) {
                    words = filteredWords;
                }
                
                // For patterns like "Add Device Campus", take the last word which is usually the field name
                if (words.length >= 2) {
                    // Check if we have pattern like [action] [entity] [field]
                    const potentialField = words[words.length - 1];
                    if (potentialField.length >= 3 && !menuPatterns.includes(potentialField.toLowerCase())) {
                        // If the last word looks like a field name, prioritize it
                        const secondToLast = words.length >= 2 ? words[words.length - 2].toLowerCase() : '';
                        
                        // Common entity words that we can skip to get to the field name
                        const entityWords = ['device', 'user', 'student', 'admin', 'class', 'report', 'data', 'info'];
                        
                        if (entityWords.includes(secondToLast)) {
                            // Take just the last word (field name)
                            words = [potentialField];
                        } else if (words.length >= 3) {
                            // Take last 2 words but prefer the last one
                            const lastTwo = words.slice(-2);
                            if (entityWords.includes(lastTwo[0].toLowerCase())) {
                                words = [lastTwo[1]]; // Just the field name
                            } else {
                                words = lastTwo; // Both words
                            }
                        }
                    }
                }
            }
            
            console.log('Filtered words:', words);
            
            // Handle special cases for common form elements
            if (words.length >= 2) {
                const lastTwoWords = words.slice(-2).map(w => w.toLowerCase());
                
                // Common patterns like "Date From" -> "DateFrom"
                if (lastTwoWords.includes('date') && (lastTwoWords.includes('from') || lastTwoWords.includes('to'))) {
                    words = words.slice(-2);
                }
                // Patterns like "Excel File" -> "ExcelFile" 
                else if (lastTwoWords.includes('excel') && lastTwoWords.includes('file')) {
                    words = words.slice(-2);
                }
                // Patterns like "User Name" -> "Username"
                else if (lastTwoWords.includes('user') && lastTwoWords.includes('name')) {
                    words = ['Username'];
                }
                // Patterns like "Save And Exit" -> "SaveAndExit"
                else if (lastTwoWords.join(' ') === 'and exit' && words.length >= 3) {
                    words = words.slice(-3); // Include "Save And Exit"
                }
            }
            
            // If no meaningful words left, try to extract from the original step differently
            if (words.length === 0) {
                console.log('No words found, trying alternative extraction');
                // Try to get the last meaningful part of the step
                const stepParts = step.replace(/^When\s+/, '').replace(/"/g, '').replace(/<[^>]+>/g, '').split(' ');
                const actionWords = ['click', 'on', 'enter', 'select', 'the', 'a', 'an', 'when', 'and', 'then', 'add', 'device'];
                words = stepParts.filter(word => 
                    !actionWords.includes(word.toLowerCase()) && 
                    word.trim().length > 0 && 
                    !word.includes('<') && 
                    !word.includes('>')
                ).slice(-2); // Get last 2 meaningful words
                console.log('Alternative extracted words:', words);
            }
            
            // Convert to PascalCase
            elementName = words.map(word => 
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            ).join('');
            
            console.log('Final element name:', elementName);
            resolve(elementName || 'DefaultElement');
        });
    });
}

// নিচের listener টা এখানে রাখুন (global scope এ)
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'sync') return;
        // Relevant keys to observe
        const keys = [
            'collectedLocators', 'collectedGherkinSteps', 'collectedMethods',
            'elementClassName', 'pageClassName', 'actionName', 'collectedParamValues', 'menuName'
        ];
        const changed = keys.some(key => changes[key]);
        if (changed) {
            console.log('Storage changed, updating view...', changes); // Debug log
            
            getStoredData((result) => {
                // Display/refresh logic (same as initial load)
                const locators = filterDuplicateLocators(result.collectedLocators || []);
                const rawGherkinSteps = filterDuplicateStrings(result.collectedGherkinSteps || []);
                const rawMethods = filterDuplicateStrings(result.collectedMethods || []);
                const actionName = result.actionName || '';
                const menuName = result.menuName || '';
                
                let className, pageClassName;
                if (actionName && actionName.trim()) {
                    const cleanActionName = actionName.replace(/\s+/g, '');
                    className = `${cleanActionName}Element`;
                    pageClassName = `${cleanActionName}Page`;
                } else {
                    className = result.elementClassName || 'DefaultElementClass';
                    pageClassName = result.pageClassName || 'DefaultPageClass';
                }
                
                const gherkinSteps = rawGherkinSteps;
                const methods = rawMethods;
                
                console.log('Updating view with:', { className, pageClassName, actionName, menuName }); // Debug log
                
                const locatorElement = document.getElementById('locatorCode');
                const gherkinElement = document.getElementById('gherkinCode');
                const methodElement = document.getElementById('methodCode');
                
                if (locatorElement) {
                    locatorElement.innerText = locators.length
                        ? `public static class ${className} {\n${locators.map(l => '    ' + l).join('\n')}\n}`
                        : 'No locators collected.';
                }
                if (gherkinElement) {
                    gherkinElement.innerText = gherkinSteps.length
                        ? gherkinSteps.join('\n')
                        : 'No Gherkin steps collected.';
                }
                if (methodElement) {
                    methodElement.innerText = methods.length
                        ? `public static class ${pageClassName}(IWebDriver driver) {\n    public IWebDriver Driver => driver;\n\n    public IJavaScriptExecutor Js => (IJavaScriptExecutor)driver;\n\n${methods.map(m => '    ' + m).join('\n')}\n}`
                        : 'No methods collected.';
                }
                
                // Update Step File generator - important for Menu/Action name changes
                setTimeout(() => {
                    initializeStepFileGenerator(gherkinSteps, pageClassName);
                }, 100);
                
                // Update Excel Values section - important for Menu name changes
                setTimeout(() => {
                    loadAndDisplayExcelValues(result);
                }, 150);
                
                // Show specific toast messages for different changes
                if (changes.actionName || changes.menuName) {
                    const changeType = changes.actionName ? 'Action Name' : 'Menu Name';
                    showToast(`🔄 ${changeType} updated! All sections refreshed.`, 'info');
                } else {
                    showToast('🔄 Data updated in real-time!', 'info');
                }
            });
        }
    });
}

if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'local') return;
        // XHR logs and actions change check
        if (changes.urls || changes.actions) {
            loadXHRLogs(); // Call your function to reload and render logs/actions
            showToast('🛰️ XHR Logs updated in real-time!', 'info');
        }
    });
}

// Add periodic updates to ensure configuration info stays visible
setInterval(updateConfigurationInfo, 2000); // Update every 2 seconds

// Also update when the page becomes visible again
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        updateConfigurationInfo();
    }
});

// Add initial updates to ensure content is set properly
setTimeout(() => {
    updateConfigurationInfo();
    setTimeout(updateConfigurationInfo, 1000);
    setTimeout(updateConfigurationInfo, 2000);
}, 500);

// Also update when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    updateConfigurationInfo();
});

// ========== Visual Studio Integration Functions ==========

// Toggle collapsible sections
function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    const toggleId = sectionId.replace('Section', 'Toggle');
    const toggle = document.getElementById(toggleId);
    
    if (section && toggle) {
        const isCollapsed = section.style.display === 'none';
        section.style.display = isCollapsed ? 'block' : 'none';
        toggle.style.transform = isCollapsed ? 'rotate(0deg)' : 'rotate(-90deg)';
        toggle.textContent = isCollapsed ? '▼' : '▶';
    }
}

// Send individual files to Visual Studio
function sendElementToVisualStudio() {
    const projectSelect = document.getElementById('projectSelect');
    const folderSelect = document.getElementById('folderSelect');
    const statusDiv = document.getElementById('projectStatus');
    
    const selectedProject = projectSelect.value;
    const selectedFolder = folderSelect.value;
    
    if (!selectedProject) {
        showToast('Please select a project first', 'error');
        return;
    }
    
    // Validate mandatory fields
    validateMandatoryFields()
        .then(result => {
            statusDiv.innerHTML = '<span style="color: #7c3aed;">🚀 Sending Element file to Visual Studio...</span>';
            
            const actionName = result.actionName;
            const rootFileName = result.rootFileName;
            const cleanActionName = actionName.replace(/\s+/g, '');
            const locators = filterDuplicateLocators(result.collectedLocators || []);
            const elementClassName = `${cleanActionName}Element`;
            
            // Generate namespace
            const namespace = generateNamespace(rootFileName);
            
            // Match the exact format shown in Locator Code section with namespace
            const content = locators.length
                ? `namespace ${namespace}\n{\n    public static class ${elementClassName}\n    {\n${locators.map(l => '        ' + l).join('\n')}\n    }\n}`
                : `namespace ${namespace}\n{\n    public static class ${elementClassName}\n    {\n        // No locators collected\n    }\n}`;
            
            sendFileToVisualStudio(`${elementClassName}.cs`, content, selectedFolder, selectedProject)
                .then(() => {
                    statusDiv.innerHTML = '<span style="color: #10b981;">✅ Element file sent successfully!</span>';
                    showToast('🚀 Element file sent to Visual Studio!', 'success');
                })
                .catch(error => {
                    console.error('Error sending Element file:', error);
                    statusDiv.innerHTML = '<span style="color: #ef4444;">❌ Failed to send Element file</span>';
                    showToast('❌ Failed to send Element file', 'error');
                });
        })
        .catch(error => {
            statusDiv.innerHTML = `<span style="color: #ef4444;">❌ ${error.message}</span>`;
            showToast(error.message, 'error');
        });
}

function sendPageToVisualStudio() {
    const projectSelect = document.getElementById('projectSelect');
    const folderSelect = document.getElementById('folderSelect');
    const statusDiv = document.getElementById('projectStatus');
    
    const selectedProject = projectSelect.value;
    const selectedFolder = folderSelect.value;
    
    if (!selectedProject) {
        showToast('Please select a project first', 'error');
        return;
    }
    
    // Validate mandatory fields
    validateMandatoryFields()
        .then(result => {
            statusDiv.innerHTML = '<span style="color: #7c3aed;">🚀 Sending Page file to Visual Studio...</span>';
            
            const actionName = result.actionName;
            const rootFileName = result.rootFileName;
            const cleanActionName = actionName.replace(/\s+/g, '');
            const methods = filterDuplicateStrings(result.collectedMethods || []);
            const pageClassName = `${cleanActionName}Page`;
            
            // Generate namespace
            const namespace = generateNamespace(rootFileName);
            
            // Match the exact format shown in Method Code section with namespace (removed static)
            const content = methods.length
                ? `namespace ${namespace}\n{\n    public class ${pageClassName}(IWebDriver driver)\n    {\n        public IWebDriver Driver => driver;\n\n        public IJavaScriptExecutor Js => (IJavaScriptExecutor)driver;\n\n${methods.map(m => '        ' + m).join('\n')}\n    }\n}`
                : `namespace ${namespace}\n{\n    public class ${pageClassName}(IWebDriver driver)\n    {\n        public IWebDriver Driver => driver;\n\n        public IJavaScriptExecutor Js => (IJavaScriptExecutor)driver;\n\n        // No methods collected\n    }\n}`;
            
            sendFileToVisualStudio(`${pageClassName}.cs`, content, selectedFolder, selectedProject)
                .then(() => {
                    statusDiv.innerHTML = '<span style="color: #10b981;">✅ Page file sent successfully!</span>';
                    showToast('🚀 Page file sent to Visual Studio!', 'success');
                })
                .catch(error => {
                    console.error('Error sending Page file:', error);
                    statusDiv.innerHTML = '<span style="color: #ef4444;">❌ Failed to send Page file</span>';
                    showToast('❌ Failed to send Page file', 'error');
                });
        })
        .catch(error => {
            statusDiv.innerHTML = `<span style="color: #ef4444;">❌ ${error.message}</span>`;
            showToast(error.message, 'error');
        });
}

function sendStepToVisualStudio() {
    const projectSelect = document.getElementById('projectSelect');
    const folderSelect = document.getElementById('folderSelect');
    const statusDiv = document.getElementById('projectStatus');
    
    const selectedProject = projectSelect.value;
    const selectedFolder = folderSelect.value;
    
    if (!selectedProject) {
        showToast('Please select a project first', 'error');
        return;
    }
    
    const stepFileCode = document.getElementById('stepFileCode');
    if (!stepFileCode || !stepFileCode.textContent.trim() || stepFileCode.textContent.includes('Select input types')) {
        statusDiv.innerHTML = '<span style="color: #f59e0b;">⚠️ Please generate step file first</span>';
        showToast('⚠️ Please generate step file first!', 'warning');
        return;
    }
    
    // Validate mandatory fields
    validateMandatoryFields()
        .then(result => {
            statusDiv.innerHTML = '<span style="color: #7c3aed;">🚀 Sending Step file to Visual Studio...</span>';
            
            const actionName = result.actionName;
            const cleanActionName = actionName.replace(/\s+/g, '');
            
            sendFileToVisualStudio(`${cleanActionName}Step.cs`, stepFileCode.textContent, selectedFolder, selectedProject)
                .then(() => {
                    statusDiv.innerHTML = '<span style="color: #10b981;">✅ Step file sent successfully!</span>';
                    showToast('🚀 Step file sent to Visual Studio!', 'success');
                })
                .catch(error => {
                    console.error('Error sending Step file:', error);
                    statusDiv.innerHTML = '<span style="color: #ef4444;">❌ Failed to send Step file</span>';
                    showToast('❌ Failed to send Step file', 'error');
                });
        })
        .catch(error => {
            statusDiv.innerHTML = `<span style="color: #ef4444;">❌ ${error.message}</span>`;
            showToast(error.message, 'error');
        });
}

function sendFeatureToVisualStudio() {
    const projectSelect = document.getElementById('projectSelect');
    const folderSelect = document.getElementById('folderSelect');
    const statusDiv = document.getElementById('projectStatus');
    
    const selectedProject = projectSelect.value;
    const selectedFolder = folderSelect.value;
    
    if (!selectedProject) {
        showToast('Please select a project first', 'error');
        return;
    }
    
    // Validate mandatory fields
    validateMandatoryFields()
        .then(result => {
            statusDiv.innerHTML = '<span style="color: #7c3aed;">🚀 Sending Feature file to Visual Studio...</span>';
            
            const actionName = result.actionName;
            const menuName = result.menuName;
            const cleanActionName = actionName.replace(/\s+/g, '');
            const gherkinSteps = filterDuplicateStrings(result.collectedGherkinSteps || []);
            
            const content = gherkinSteps.length
                ? `Feature: ${menuName} Functionality\n\n  Scenario: Test ${menuName} operations\n${gherkinSteps.map(step => '    ' + step).join('\n')}`
                : `Feature: ${menuName} Functionality\n\n  Scenario: Test ${menuName} operations\n    # No Gherkin steps collected`;
            
            sendFileToVisualStudio(`${cleanActionName}.feature`, content, selectedFolder, selectedProject)
                .then(() => {
                    statusDiv.innerHTML = '<span style="color: #10b981;">✅ Feature file sent successfully!</span>';
                    showToast('🚀 Feature file sent to Visual Studio!', 'success');
                })
                .catch(error => {
                    console.error('Error sending Feature file:', error);
                    statusDiv.innerHTML = '<span style="color: #ef4444;">❌ Failed to send Feature file</span>';
                    showToast('❌ Failed to send Feature file', 'error');
                });
        })
        .catch(error => {
            statusDiv.innerHTML = `<span style="color: #ef4444;">❌ ${error.message}</span>`;
            showToast(error.message, 'error');
        });
}

// Project and folder selection functionality
function loadProjects() {
    const statusDiv = document.getElementById('projectStatus');
    const projectSelect = document.getElementById('projectSelect');
    
    statusDiv.innerHTML = '<span style="color: #6366f1;">🔄 Loading projects...</span>';
    
    fetch('http://localhost:8080/projects')
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        })
        .then(data => {
            projectSelect.innerHTML = '<option value="">Select a project...</option>';
            
            if (data.projects && data.projects.length > 0) {
                data.projects.forEach(project => {
                    const option = document.createElement('option');
                    option.value = project.directory;
                    option.textContent = project.name;
                    option.dataset.fullName = project.fullName;
                    projectSelect.appendChild(option);
                });
                
                statusDiv.innerHTML = `<span style="color: #10b981;">✅ Loaded ${data.projects.length} projects</span>`;
                showToast(`Loaded ${data.projects.length} projects`, 'success');
            } else {
                statusDiv.innerHTML = '<span style="color: #f59e0b;">⚠️ No projects found</span>';
            }
        })
        .catch(error => {
            console.error('Error loading projects:', error);
            
            // Provide more specific error messages based on error type
            let errorMessage = error.message;
            let toastMessage = 'Error loading projects.';
            
            if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
                errorMessage = 'Cannot connect to Visual Studio extension (Connection refused)';
                toastMessage = 'Cannot connect to Visual Studio. Make sure Visual Studio is running with the File Receiver Extension loaded and active.';
            } else if (error.message.includes('NetworkError')) {
                errorMessage = 'Network error connecting to Visual Studio extension';
                toastMessage = 'Network error. Check if Visual Studio extension is running on localhost:8080.';
            } else if (error.message.startsWith('HTTP')) {
                errorMessage = `Server error: ${error.message}`;
                toastMessage = `Visual Studio extension returned an error: ${error.message}`;
            }
            
            statusDiv.innerHTML = `<span style="color: #ef4444;">❌ Error: ${errorMessage}</span>`;
            
            // Safely call showToast if it exists
            if (typeof showToast === 'function') {
                showToast(toastMessage, 'error');
            } else if (typeof window.showToast === 'function') {
                window.showToast(toastMessage, 'error');
            }
        });
}

function onProjectSelectionChange() {
    const projectSelect = document.getElementById('projectSelect');
    const folderSelect = document.getElementById('folderSelect');
    const folderSearch = document.getElementById('folderSearch');
    
    if (projectSelect.value) {
        folderSelect.disabled = false;
        folderSearch.disabled = false;
        folderSelect.innerHTML = '<option value="">Project Root</option>';
        folderSearch.value = '';
        updateFolderSearchInfo('');
        
        // Auto-load folders when project is selected
        loadFolders();
    } else {
        folderSelect.disabled = true;
        folderSearch.disabled = true;
        folderSelect.innerHTML = '<option value="">Select project first...</option>';
        folderSearch.value = '';
        updateFolderSearchInfo('');
    }
}

// Global variable to store all folders for search functionality
let allFolders = [];

function loadFolders() {
    const statusDiv = document.getElementById('projectStatus');
    const folderSelect = document.getElementById('folderSelect');
    const projectSelect = document.getElementById('projectSelect');
    
    // Get the selected project directory
    const selectedProject = projectSelect.value;
    
    statusDiv.innerHTML = '<span style="color: #059669;">🔄 Loading folders...</span>';
    
    // Build the URL with project parameter if a project is selected
    let url = 'http://localhost:8080/folders';
    if (selectedProject && selectedProject.trim() !== '') {
        url += `?project=${encodeURIComponent(selectedProject.trim())}`;
    }
    
    fetch(url)
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        })
        .then(data => {
            folderSelect.innerHTML = '<option value="">📁 Project Root</option>';
            
            if (data.folders && data.folders.length > 0) {
                // Filter out root folder and sort by path for proper hierarchy
                const sortedFolders = data.folders
                    .filter(folder => folder.path !== "")
                    .sort((a, b) => a.path.localeCompare(b.path));
                
                // Create hierarchical folder display
                const folderHierarchy = createFolderHierarchy(sortedFolders);
                
                // Store all folders globally for search functionality
                allFolders = folderHierarchy;
                
                // Display all folders initially
                displayFolders(allFolders);
                
                statusDiv.innerHTML = `<span style="color: #10b981;">✅ Loaded folders for selected project (${sortedFolders.length} folders)</span>`;
                updateFolderSearchInfo(`Showing ${folderHierarchy.length} folders`);
            } else {
                allFolders = [];
                statusDiv.innerHTML = '<span style="color: #f59e0b;">⚠️ No folders found in project</span>';
                updateFolderSearchInfo('No folders found');
            }
        })
        .catch(error => {
            console.error('Error loading folders:', error);
            
            // Clear folders and search on error
            allFolders = [];
            
            // Provide more specific error messages based on error type
            let errorMessage = error.message;
            let toastMessage = 'Error loading folders.';
            
            if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
                errorMessage = 'Cannot connect to Visual Studio extension (Connection refused)';
                toastMessage = 'Cannot connect to Visual Studio. Make sure Visual Studio is running with the File Receiver Extension loaded and active.';
            } else if (error.message.includes('NetworkError')) {
                errorMessage = 'Network error connecting to Visual Studio extension';
                toastMessage = 'Network error. Check if Visual Studio extension is running on localhost:8080.';
            } else if (error.message.startsWith('HTTP')) {
                errorMessage = `Server error: ${error.message}`;
                toastMessage = `Visual Studio extension returned an error: ${error.message}`;
            }
            
            statusDiv.innerHTML = `<span style="color: #ef4444;">❌ Error: ${errorMessage}</span>`;
            updateFolderSearchInfo('Error loading folders');
            
            // Safely call showToast if it exists
            if (typeof showToast === 'function') {
                showToast(toastMessage, 'error');
            } else if (typeof window.showToast === 'function') {
                window.showToast(toastMessage, 'error');
            }
        });
}

// Helper function to display folders in the select dropdown
function displayFolders(folders) {
    const folderSelect = document.getElementById('folderSelect');
    
    // Keep the "Project Root" option
    folderSelect.innerHTML = '<option value="">📁 Project Root</option>';
    
    folders.forEach(folder => {
        const option = document.createElement('option');
        option.value = folder.path;
        option.textContent = folder.displayName;
        folderSelect.appendChild(option);
    });
}

// Function to filter folders based on search input
function filterFolders(searchTerm) {
    if (!allFolders || allFolders.length === 0) {
        return;
    }
    
    const searchLower = searchTerm.toLowerCase().trim();
    
    if (searchLower === '') {
        // Show all folders if search is empty
        displayFolders(allFolders);
        updateFolderSearchInfo(`Showing ${allFolders.length} folders`);
        return;
    }
    
    // Filter folders based on search term
    const filteredFolders = allFolders.filter(folder => {
        // Search in both the folder name and the full path
        const folderName = folder.name.toLowerCase();
        const folderPath = folder.path.toLowerCase();
        
        return folderName.includes(searchLower) || folderPath.includes(searchLower);
    });
    
    displayFolders(filteredFolders);
    updateFolderSearchInfo(`Found ${filteredFolders.length} of ${allFolders.length} folders`);
}

// Function to update the search info text
function updateFolderSearchInfo(message) {
    const infoElement = document.getElementById('folderSearchInfo');
    if (infoElement) {
        infoElement.textContent = message;
    }
}

// Helper function to create hierarchical folder display
function createFolderHierarchy(folders) {
    // Sort folders to ensure proper hierarchical display
    const sortedFolders = folders.sort((a, b) => a.path.localeCompare(b.path));
    
    return sortedFolders.map((folder, index) => {
        const depth = folder.depth || folder.path.split('/').length;
        const pathParts = folder.path.split('/');
        let displayName = '';
        
        if (depth === 1) {
            // Top-level folder
            displayName = `📁 ${folder.name}`;
        } else {
            // For nested folders, create a more visual hierarchy
            let prefix = '';
            
            // Check if this is the last item at this level
            const isLastAtLevel = !sortedFolders.some((f, i) => {
                if (i <= index) return false;
                const fParts = f.path.split('/');
                const fDepth = f.depth || fParts.length;
                
                // Check if it's a sibling (same parent path and same depth)
                if (fDepth === depth) {
                    const parentPath = pathParts.slice(0, -1).join('/');
                    const fParentPath = fParts.slice(0, -1).join('/');
                    return parentPath === fParentPath;
                }
                return false;
            });
            
            // Build prefix based on depth
            for (let i = 1; i < depth; i++) {
                if (i === depth - 1) {
                    // Last level - use tree characters
                    prefix += isLastAtLevel ? '└── ' : '├── ';
                } else {
                    // Intermediate levels - use spacing
                    prefix += '│   ';
                }
            }
            
            displayName = `${prefix}📁 ${folder.name}`;
        }
        
        return {
            path: folder.path,
            name: folder.name,
            displayName: displayName,
            depth: depth
        };
    });
}

function sendFileToVisualStudio(filename, content, folderPath = null, projectDirectory = null) {
    const fileData = {
        fileName: filename,
        content: content
    };
    
    if (folderPath && folderPath.trim() !== '') {
        fileData.folderPath = folderPath.trim();
    }
    
    if (projectDirectory && projectDirectory.trim() !== '') {
        fileData.projectDirectory = projectDirectory.trim();
    }
    
    return fetch('http://localhost:8080/', {
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
    });
}

// Validation function for mandatory fields
function validateMandatoryFields() {
    return new Promise((resolve, reject) => {
        getStoredData((result) => {
            const actionName = result.actionName || '';
            const menuName = result.menuName || '';
            const rootFileName = result.rootFileName || '';
            
            const missingFields = [];
            
            if (!menuName.trim()) {
                missingFields.push('Menu Name');
            }
            if (!actionName.trim()) {
                missingFields.push('Action Name');
            }
            if (!rootFileName.trim()) {
                missingFields.push('Root File Name');
            }
            
            if (missingFields.length > 0) {
                reject(new Error(`Missing mandatory fields: ${missingFields.join(', ')}`));
            } else {
                resolve(result);
            }
        });
    });
}

// File selection helper functions
function getSelectedFiles() {
    return {
        element: document.getElementById('selectElementFile')?.checked || false,
        page: document.getElementById('selectPageFile')?.checked || false,
        step: document.getElementById('selectStepFile')?.checked || false,
        feature: document.getElementById('selectFeatureFile')?.checked || false
    };
}

function sendAllToVisualStudio() {
    const projectSelect = document.getElementById('projectSelect');
    const folderSelect = document.getElementById('folderSelect');
    const statusDiv = document.getElementById('projectStatus');
    
    const selectedProject = projectSelect.value;
    const selectedFolder = folderSelect.value;
    
    if (!selectedProject) {
        showToast('Please select a project first', 'error');
        return;
    }
    
    // Validate mandatory fields first
    validateMandatoryFields()
        .then(result => {
            const selectedFiles = getSelectedFiles();
            const hasAnyFileSelected = Object.values(selectedFiles).some(selected => selected);
            
            if (!hasAnyFileSelected) {
                showToast('Please select at least one file to send', 'error');
                return;
            }
            
            statusDiv.innerHTML = '<span style="color: #7c3aed;">🚀 Sending selected files to Visual Studio...</span>';
            
            const actionName = result.actionName;
            const menuName = result.menuName;
            const rootFileName = result.rootFileName;
            const cleanActionName = actionName.replace(/\s+/g, '');
            
            // Generate namespace
            const namespace = generateNamespace(rootFileName);
            
            // Create the files content based on selection
            const files = {};
            
            // Element file
            if (selectedFiles.element) {
                const locators = filterDuplicateLocators(result.collectedLocators || []);
                const elementClassName = `${cleanActionName}Element`;
                files[`${elementClassName}.cs`] = locators.length
                    ? `namespace ${namespace}\n{\n    public static class ${elementClassName}\n    {\n${locators.map(l => '        ' + l).join('\n')}\n    }\n}`
                    : `namespace ${namespace}\n{\n    public static class ${elementClassName}\n    {\n        // No locators collected\n    }\n}`;
            }
            
            // Page file
            if (selectedFiles.page) {
                const methods = filterDuplicateStrings(result.collectedMethods || []);
                const pageClassName = `${cleanActionName}Page`;
                files[`${pageClassName}.cs`] = methods.length
                    ? `namespace ${namespace}\n{\n    public class ${pageClassName}(IWebDriver driver)\n    {\n        public IWebDriver Driver => driver;\n\n        public IJavaScriptExecutor Js => (IJavaScriptExecutor)driver;\n\n${methods.map(m => '        ' + m).join('\n')}\n    }\n}`
                    : `namespace ${namespace}\n{\n    public class ${pageClassName}(IWebDriver driver)\n    {\n        public IWebDriver Driver => driver;\n\n        public IJavaScriptExecutor Js => (IJavaScriptExecutor)driver;\n\n        // No methods collected\n    }\n}`;
            }
            
            // Step file
            if (selectedFiles.step) {
                const stepFileCode = document.getElementById('stepFileCode');
                if (stepFileCode && stepFileCode.textContent.trim() && !stepFileCode.textContent.includes('Select input types')) {
                    files[`${cleanActionName}Step.cs`] = stepFileCode.textContent;
                } else {
                    files[`${cleanActionName}Step.cs`] = `// Please generate step file first`;
                }
            }
            
            // Feature file
            if (selectedFiles.feature) {
                const gherkinSteps = filterDuplicateStrings(result.collectedGherkinSteps || []);
                files[`${cleanActionName}.feature`] = gherkinSteps.length
                    ? `Feature: ${menuName} Functionality\n\n  Scenario: Test ${menuName} operations\n${gherkinSteps.map(step => '    ' + step).join('\n')}`
                    : `Feature: ${menuName} Functionality\n\n  Scenario: Test ${menuName} operations\n    # No Gherkin steps collected`;
            }
            
            // Send files one by one
            const fileNames = Object.keys(files);
            let fileIndex = 0;
            let successCount = 0;
            let errorCount = 0;
            
            const sendNext = () => {
                if (fileIndex < fileNames.length) {
                    const fileName = fileNames[fileIndex];
                    const fileContent = files[fileName];
                    
                    sendFileToVisualStudio(fileName, fileContent, selectedFolder, selectedProject)
                        .then(() => {
                            successCount++;
                            fileIndex++;
                            sendNext();
                        })
                        .catch(error => {
                            console.error(`Error sending ${fileName}:`, error);
                            errorCount++;
                            fileIndex++;
                            sendNext();
                        });
                } else {
                    // All files processed
                    if (errorCount === 0) {
                        statusDiv.innerHTML = `<span style="color: #10b981;">✅ Successfully sent ${successCount} files to Visual Studio!</span>`;
                        showToast(`🚀 Successfully sent ${successCount} files to Visual Studio!`, 'success');
                    } else {
                        statusDiv.innerHTML = `<span style="color: #f59e0b;">⚠️ Sent ${successCount} files, ${errorCount} failed</span>`;
                        showToast(`Sent ${successCount} files, ${errorCount} failed`, 'warning');
                    }
                }
            };
            
            sendNext();
        })
        .catch(error => {
            statusDiv.innerHTML = `<span style="color: #ef4444;">❌ ${error.message}</span>`;
            showToast(error.message, 'error');
        });
}

// Make toggleSection function available globally for HTML onclick handlers
window.toggleSection = toggleSection;

// ========== Visual Studio Integration Functions ==========

// Load saved Visual Studio project and folder selections from popup
function loadSavedVSSelections() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.get(['selectedVSProject', 'selectedVSFolder'], (result) => {
            const projectSelect = document.getElementById('projectSelect');
            const folderSelect = document.getElementById('folderSelect');
            
            if (result.selectedVSProject && projectSelect) {
                // Add the saved project to the dropdown and select it
                const projectOption = document.createElement('option');
                projectOption.value = result.selectedVSProject;
                projectOption.textContent = result.selectedVSProject.split(/[/\\]/).pop() || result.selectedVSProject;
                projectOption.selected = true;
                projectSelect.appendChild(projectOption);
                
                // If there's also a saved folder, load it
                if (result.selectedVSFolder && folderSelect) {
                    folderSelect.disabled = false;
                    const folderOption = document.createElement('option');
                    folderOption.value = result.selectedVSFolder;
                    folderOption.textContent = result.selectedVSFolder ? `📁 ${result.selectedVSFolder}` : '📁 Project Root';
                    folderOption.selected = true;
                    folderSelect.innerHTML = '<option value="">📁 Project Root</option>';
                    folderSelect.appendChild(folderOption);
                }
                
                // Update status to show loaded project
                const statusDiv = document.getElementById('projectStatus');
                if (statusDiv) {
                    const projectName = result.selectedVSProject.split(/[/\\]/).pop() || result.selectedVSProject;
                    const folderText = result.selectedVSFolder ? ` → ${result.selectedVSFolder}` : ' → Project Root';
                    statusDiv.innerHTML = `<span style="color: #10b981;">📁 Using selected project: ${projectName}${folderText}</span>`;
                }
            }
        });
    }
}

// ========== Download Files Functionality ==========

// Add event listener for download button
document.addEventListener('DOMContentLoaded', () => {
    // Load saved Visual Studio project and folder selections
    loadSavedVSSelections();
    
    const downloadBtn = document.getElementById('downloadFilesBtn');
    const downloadModal = document.getElementById('downloadModal');
    const closeModal = document.getElementById('closeDownloadModal');
    
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            updateFileNamesPreview();
            downloadModal.style.display = 'block';
        });
    }
    
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            downloadModal.style.display = 'none';
        });
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === downloadModal) {
            downloadModal.style.display = 'none';
        }
    });
    
    // Individual download buttons
    document.getElementById('downloadElementBtn')?.addEventListener('click', () => downloadElementFile());
    document.getElementById('downloadPageBtn')?.addEventListener('click', () => downloadPageFile());
    document.getElementById('downloadStepBtn')?.addEventListener('click', () => downloadStepFile());
    document.getElementById('downloadFeatureBtn')?.addEventListener('click', () => downloadFeatureFile());
    document.getElementById('downloadAllIndividualBtn')?.addEventListener('click', () => downloadAllIndividual());
    document.getElementById('downloadAllZipBtn')?.addEventListener('click', () => downloadAllAsZip());
    
    // Visual Studio integration buttons
    document.getElementById('sendElementBtn')?.addEventListener('click', () => sendElementToVisualStudio());
    document.getElementById('sendPageBtn')?.addEventListener('click', () => sendPageToVisualStudio());
    document.getElementById('sendStepBtn')?.addEventListener('click', () => sendStepToVisualStudio());
    document.getElementById('sendFeatureBtn')?.addEventListener('click', () => sendFeatureToVisualStudio());
    document.getElementById('sendToVisualStudioBtn')?.addEventListener('click', () => sendAllToVisualStudio());
    
    // Project and folder selection buttons
    document.getElementById('loadProjectsBtn')?.addEventListener('click', () => loadProjects());
    document.getElementById('projectSelect')?.addEventListener('change', () => onProjectSelectionChange());
    
    // Folder search functionality
    document.getElementById('folderSearch')?.addEventListener('input', (e) => filterFolders(e.target.value));
    
    // File selection functionality
    document.getElementById('selectAllFiles')?.addEventListener('click', () => {
        document.getElementById('selectElementFile').checked = true;
        document.getElementById('selectPageFile').checked = true;
        document.getElementById('selectStepFile').checked = true;
        document.getElementById('selectFeatureFile').checked = true;
        showToast('All files selected', 'success');
    });
    
    document.getElementById('deselectAllFiles')?.addEventListener('click', () => {
        document.getElementById('selectElementFile').checked = false;
        document.getElementById('selectPageFile').checked = false;
        document.getElementById('selectStepFile').checked = false;
        document.getElementById('selectFeatureFile').checked = false;
        showToast('All files deselected', 'info');
    });
});

function updateFileNamesPreview() {
    getStoredData((result) => {
        const actionName = result.actionName || 'Default';
        const rootFileName = result.rootFileName || '';
        const cleanActionName = actionName.replace(/\s+/g, '');
        const preview = document.getElementById('fileNamesPreview');
        
        const namespace = generateNamespace(rootFileName);
        let namespaceText = ` (namespace: ${namespace})`;
        
        if (preview) {
            preview.innerHTML = `
                • ${cleanActionName}Element.cs${namespaceText}<br>
                • ${cleanActionName}Page.cs${namespaceText}<br>
                • ${cleanActionName}Step.cs (namespace: ${namespace}.Steps)<br>
                • ${cleanActionName}.feature
            `;
        }
    });
}

function downloadElementFile() {
    getStoredData((result) => {
        const actionName = result.actionName || 'Default';
        const rootFileName = result.rootFileName || '';
        const cleanActionName = actionName.replace(/\s+/g, '');
        const locators = filterDuplicateLocators(result.collectedLocators || []);
        const className = `${cleanActionName}Element`;
        
        // Generate namespace
        const namespace = generateNamespace(rootFileName);
        
        // Match the exact format shown in Locator Code section with namespace
        const content = locators.length
            ? `namespace ${namespace}\n{\n    public static class ${className}\n    {\n${locators.map(l => '        ' + l).join('\n')}\n    }\n}`
            : `namespace ${namespace}\n{\n    public static class ${className}\n    {\n        // No locators collected\n    }\n}`;
        
        downloadFile(`${className}.cs`, content);
    });
}

function downloadPageFile() {
    getStoredData((result) => {
        const actionName = result.actionName || 'Default';
        const rootFileName = result.rootFileName || '';
        const cleanActionName = actionName.replace(/\s+/g, '');
        const methods = filterDuplicateStrings(result.collectedMethods || []);
        const pageClassName = `${cleanActionName}Page`;
        
        // Generate namespace
        const namespace = generateNamespace(rootFileName);
        
        // Match the exact format shown in Method Code section with namespace (removed static)
        const content = methods.length
            ? `namespace ${namespace}\n{\n    public class ${pageClassName}(IWebDriver driver)\n    {\n        public IWebDriver Driver => driver;\n\n        public IJavaScriptExecutor Js => (IJavaScriptExecutor)driver;\n\n${methods.map(m => '        ' + m).join('\n')}\n    }\n}`
            : `namespace ${namespace}\n{\n    public class ${pageClassName}(IWebDriver driver)\n    {\n        public IWebDriver Driver => driver;\n\n        public IJavaScriptExecutor Js => (IJavaScriptExecutor)driver;\n\n        // No methods collected\n    }\n}`;
        
        downloadFile(`${pageClassName}.cs`, content);
    });
}

function downloadStepFile() {
    const stepFileCode = document.getElementById('stepFileCode');
    if (stepFileCode && stepFileCode.textContent.trim() && !stepFileCode.textContent.includes('Select input types')) {
        getStoredData((result) => {
            const actionName = result.actionName || 'Default';
            const cleanActionName = actionName.replace(/\s+/g, '');
            downloadFile(`${cleanActionName}Step.cs`, stepFileCode.textContent);
        });
    } else {
        showToast('⚠️ Please generate step file first!', 'warning');
    }
}

function downloadFeatureFile() {
    getStoredData((result) => {
        const actionName = result.actionName || 'Default';
        const menuName = result.menuName || actionName;
        const cleanActionName = actionName.replace(/\s+/g, '');
        const gherkinSteps = filterDuplicateStrings(result.collectedGherkinSteps || []);
        
        const content = gherkinSteps.length
            ? `Feature: ${menuName} Functionality\n\n  Scenario: Test ${menuName} operations\n${gherkinSteps.map(step => '    ' + step).join('\n')}`
            : `Feature: ${menuName} Functionality\n\n  Scenario: Test ${menuName} operations\n    # No Gherkin steps collected`;
        
        downloadFile(`${cleanActionName}.feature`, content);
    });
}

function downloadAllIndividual() {
    getStoredData((result) => {
        const actionName = result.actionName || 'Default';
        const menuName = result.menuName || actionName;
        const rootFileName = result.rootFileName || '';
        const cleanActionName = actionName.replace(/\s+/g, '');
        
        // Generate namespace
        const namespace = generateNamespace(rootFileName);
        
        // Create all file contents
        const files = {};
        
        // Element file with namespace
        const locators = filterDuplicateLocators(result.collectedLocators || []);
        const elementClassName = `${cleanActionName}Element`;
        files[`${elementClassName}.cs`] = locators.length
            ? `namespace ${namespace}\n{\n    public static class ${elementClassName}\n    {\n${locators.map(l => '        ' + l).join('\n')}\n    }\n}`
            : `namespace ${namespace}\n{\n    public static class ${elementClassName}\n    {\n        // No locators collected\n    }\n}`;
        
        // Page file with namespace
        const methods = filterDuplicateStrings(result.collectedMethods || []);
        const pageClassName = `${cleanActionName}Page`;
        files[`${pageClassName}.cs`] = methods.length
            ? `namespace ${namespace}\n{\n    public class ${pageClassName}(IWebDriver driver)\n    {\n        public IWebDriver Driver => driver;\n\n        public IJavaScriptExecutor Js => (IJavaScriptExecutor)driver;\n\n${methods.map(m => '        ' + m).join('\n')}\n    }\n}`
            : `namespace ${namespace}\n{\n    public class ${pageClassName}(IWebDriver driver)\n    {\n        public IWebDriver Driver => driver;\n\n        public IJavaScriptExecutor Js => (IJavaScriptExecutor)driver;\n\n        // No methods collected\n    }\n}`;
        
        // Step file
        const stepFileCode = document.getElementById('stepFileCode');
        if (stepFileCode && stepFileCode.textContent.trim() && !stepFileCode.textContent.includes('Select input types')) {
            files[`${cleanActionName}Step.cs`] = stepFileCode.textContent;
        } else {
            files[`${cleanActionName}Step.cs`] = `// Please generate step file first`;
        }
        
        // Feature file
        const gherkinSteps = filterDuplicateStrings(result.collectedGherkinSteps || []);
        files[`${cleanActionName}.feature`] = gherkinSteps.length
            ? `Feature: ${menuName} Functionality\n\n  Scenario: Test ${menuName} operations\n${gherkinSteps.map(step => '    ' + step).join('\n')}`
            : `Feature: ${menuName} Functionality\n\n  Scenario: Test ${menuName} operations\n    # No Gherkin steps collected`;
        
        // Download all files individually with delay
        let fileIndex = 0;
        const fileNames = Object.keys(files);
        
        showToast(`📄 Starting download of ${fileNames.length} files to Downloads folder...`, 'info');
        
        const downloadNext = () => {
            if (fileIndex < fileNames.length) {
                const fileName = fileNames[fileIndex];
                // Use fallback download for bulk operations to avoid multiple file dialogs
                fallbackDownload(fileName, files[fileName]);
                fileIndex++;
                setTimeout(downloadNext, 800); // 800ms delay between downloads
            } else {
                showToast(`🎉 All ${fileNames.length} files downloaded to Downloads folder!`, 'success');
            }
        };
        
        downloadNext();
    });
}

function downloadAllAsZip() {
    getStoredData((result) => {
        const actionName = result.actionName || 'Default';
        const menuName = result.menuName || actionName;
        const rootFileName = result.rootFileName || '';
        const cleanActionName = actionName.replace(/\s+/g, '');
        
        // Generate namespace
        const namespace = generateNamespace(rootFileName);
        
        // Create all file contents
        const files = {};
        
        // Element file with namespace
        const locators = filterDuplicateLocators(result.collectedLocators || []);
        const elementClassName = `${cleanActionName}Element`;
        files[`${elementClassName}.cs`] = locators.length
            ? `namespace ${namespace}\n{\n    public static class ${elementClassName}\n    {\n${locators.map(l => '        ' + l).join('\n')}\n    }\n}`
            : `namespace ${namespace}\n{\n    public static class ${elementClassName}\n    {\n        // No locators collected\n    }\n}`;
        
        // Page file with namespace
        const methods = filterDuplicateStrings(result.collectedMethods || []);
        const pageClassName = `${cleanActionName}Page`;
        files[`${pageClassName}.cs`] = methods.length
            ? `namespace ${namespace}\n{\n    public class ${pageClassName}(IWebDriver driver)\n    {\n        public IWebDriver Driver => driver;\n\n        public IJavaScriptExecutor Js => (IJavaScriptExecutor)driver;\n\n${methods.map(m => '        ' + m).join('\n')}\n    }\n}`
            : `namespace ${namespace}\n{\n    public class ${pageClassName}(IWebDriver driver)\n    {\n        public IWebDriver Driver => driver;\n\n        public IJavaScriptExecutor Js => (IJavaScriptExecutor)driver;\n\n        // No methods collected\n    }\n}`;
        
        // Step file
        const stepFileCode = document.getElementById('stepFileCode');
        if (stepFileCode && stepFileCode.textContent.trim() && !stepFileCode.textContent.includes('Select input types')) {
            files[`${cleanActionName}Step.cs`] = stepFileCode.textContent;
        } else {
            files[`${cleanActionName}Step.cs`] = `// Please generate step file first`;
        }
        
        // Feature file
        const gherkinSteps = filterDuplicateStrings(result.collectedGherkinSteps || []);
        files[`${cleanActionName}.feature`] = gherkinSteps.length
            ? `Feature: ${menuName} Functionality\n\n  Scenario: Test ${menuName} operations\n${gherkinSteps.map(step => '    ' + step).join('\n')}`
            : `Feature: ${menuName} Functionality\n\n  Scenario: Test ${menuName} operations\n    # No Gherkin steps collected`;
        
        // Create actual ZIP file
        createZipFile(files, `${cleanActionName}_TestFiles.zip`);
    });
}

function createZipFile(files, zipFileName) {
    showToast('📦 Creating ZIP file...', 'info');
    
    // Create a simple ZIP file using browser APIs
    try {
        // If browser supports CompressionStream (modern browsers)
        if (typeof CompressionStream !== 'undefined') {
            createModernZip(files, zipFileName);
        } else {
            // Fallback: create a simple archive-like file
            createArchiveFile(files, zipFileName);
        }
    } catch (error) {
        console.error('ZIP creation failed:', error);
        // Fallback to individual downloads
        showToast('⚠️ ZIP creation failed, downloading individual files...', 'warning');
        downloadIndividualFiles(files);
    }
}

async function createModernZip(files, zipFileName) {
    try {
        // Create ZIP content manually using basic ZIP structure
        const zipContent = await createBasicZip(files);
        
        const blob = new Blob([zipContent], { type: 'application/zip' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = zipFileName;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 100);
        
        showToast(`📦 ${zipFileName} downloaded successfully!`, 'success');
    } catch (error) {
        throw error;
    }
}

function createArchiveFile(files, zipFileName) {
    // Create a text-based archive file as fallback
    let archiveContent = `# Test Files Archive - ${new Date().toLocaleString()}\n`;
    archiveContent += `# Extract individual files from this archive\n\n`;
    
    Object.entries(files).forEach(([filename, content]) => {
        archiveContent += `\n${'='.repeat(60)}\n`;
        archiveContent += `FILE: ${filename}\n`;
        archiveContent += `${'='.repeat(60)}\n`;
        archiveContent += content;
        archiveContent += `\n${'='.repeat(60)}\n`;
    });
    
    const blob = new Blob([archiveContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = zipFileName.replace('.zip', '_Archive.txt');
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 100);
    
    showToast(`📦 Archive file downloaded (ZIP not supported)!`, 'success');
}

async function createBasicZip(files) {
    // Create a very basic ZIP file structure
    const encoder = new TextEncoder();
    const fileEntries = [];
    let centralDirectorySize = 0;
    let offsetOfCentralDirectory = 0;
    
    // Local file headers and data
    let zipData = new Uint8Array(0);
    
    for (const [filename, content] of Object.entries(files)) {
        const fileData = encoder.encode(content);
        const filenameData = encoder.encode(filename);
        
        // Local file header (simplified)
        const localHeader = new Uint8Array(30 + filenameData.length);
        const view = new DataView(localHeader.buffer);
        
        // Local file header signature
        view.setUint32(0, 0x04034b50, true);
        // Version needed to extract
        view.setUint16(4, 20, true);
        // General purpose bit flag
        view.setUint16(6, 0, true);
        // Compression method (0 = no compression)
        view.setUint16(8, 0, true);
        // Last mod file time & date
        view.setUint16(10, 0, true);
        view.setUint16(12, 0, true);
        // CRC-32 (simplified - using 0)
        view.setUint32(14, 0, true);
        // Compressed size
        view.setUint32(18, fileData.length, true);
        // Uncompressed size
        view.setUint32(22, fileData.length, true);
        // Filename length
        view.setUint16(26, filenameData.length, true);
        // Extra field length
        view.setUint16(28, 0, true);
        
        // Copy filename
        localHeader.set(filenameData, 30);
        
        // Combine header + data
        const fileEntry = new Uint8Array(localHeader.length + fileData.length);
        fileEntry.set(localHeader, 0);
        fileEntry.set(fileData, localHeader.length);
        
        // Append to zip data
        const newZipData = new Uint8Array(zipData.length + fileEntry.length);
        newZipData.set(zipData, 0);
        newZipData.set(fileEntry, zipData.length);
        zipData = newZipData;
        
        // Store for central directory
        fileEntries.push({
            filename: filenameData,
            localHeaderOffset: offsetOfCentralDirectory,
            compressedSize: fileData.length,
            uncompressedSize: fileData.length
        });
        
        offsetOfCentralDirectory += fileEntry.length;
    }
    
    // Central directory (simplified)
    let centralDirectory = new Uint8Array(0);
    
    for (const entry of fileEntries) {
        const centralHeader = new Uint8Array(46 + entry.filename.length);
        const view = new DataView(centralHeader.buffer);
        
        // Central directory signature
        view.setUint32(0, 0x02014b50, true);
        // Version made by
        view.setUint16(4, 20, true);
        // Version needed to extract
        view.setUint16(6, 20, true);
        // General purpose bit flag
        view.setUint16(8, 0, true);
        // Compression method
        view.setUint16(10, 0, true);
        // Last mod file time & date
        view.setUint16(12, 0, true);
        view.setUint16(14, 0, true);
        // CRC-32
        view.setUint32(16, 0, true);
        // Compressed size
        view.setUint32(20, entry.compressedSize, true);
        // Uncompressed size
        view.setUint32(24, entry.uncompressedSize, true);
        // Filename length
        view.setUint16(28, entry.filename.length, true);
        // Extra field length
        view.setUint16(30, 0, true);
        // File comment length
        view.setUint16(32, 0, true);
        // Disk number start
        view.setUint16(34, 0, true);
        // Internal file attributes
        view.setUint16(36, 0, true);
        // External file attributes
        view.setUint32(38, 0, true);
        // Relative offset of local header
        view.setUint32(42, entry.localHeaderOffset, true);
        
        // Copy filename
        centralHeader.set(entry.filename, 46);
        
        // Append to central directory
        const newCentralDirectory = new Uint8Array(centralDirectory.length + centralHeader.length);
        newCentralDirectory.set(centralDirectory, 0);
        newCentralDirectory.set(centralHeader, centralDirectory.length);
        centralDirectory = newCentralDirectory;
    }
    
    centralDirectorySize = centralDirectory.length;
    
    // End of central directory record
    const endRecord = new Uint8Array(22);
    const endView = new DataView(endRecord.buffer);
    
    // End of central dir signature
    endView.setUint32(0, 0x06054b50, true);
    // Number of this disk
    endView.setUint16(4, 0, true);
    // Number of disk with start of central directory
    endView.setUint16(6, 0, true);
    // Number of central directory records on this disk
    endView.setUint16(8, fileEntries.length, true);
    // Total number of central directory records
    endView.setUint16(10, fileEntries.length, true);
    // Size of central directory
    endView.setUint32(12, centralDirectorySize, true);
    // Offset of start of central directory
    endView.setUint32(16, offsetOfCentralDirectory, true);
    // ZIP file comment length
    endView.setUint16(20, 0, true);
    
    // Combine all parts
    const finalZip = new Uint8Array(zipData.length + centralDirectory.length + endRecord.length);
    finalZip.set(zipData, 0);
    finalZip.set(centralDirectory, zipData.length);
    finalZip.set(endRecord, zipData.length + centralDirectory.length);
    
    return finalZip;
}

function downloadIndividualFiles(files) {
    // Fallback: download files individually
    let fileIndex = 0;
    const fileNames = Object.keys(files);
    
    const downloadNext = () => {
        if (fileIndex < fileNames.length) {
            const fileName = fileNames[fileIndex];
            fallbackDownload(fileName, files[fileName]);
            fileIndex++;
            setTimeout(downloadNext, 500);
        } else {
            showToast(`📄 All ${fileNames.length} files downloaded individually!`, 'success');
        }
    };
    
    downloadNext();
}

function downloadFile(filename, content) {
    // Ensure proper line endings for Windows/cross-platform compatibility
    const normalizedContent = content.replace(/\r\n|\r|\n/g, '\r\n');
    
    // Try File System Access API first for direct save
    tryFileSystemAccess(filename, normalizedContent);
}

async function tryFileSystemAccess(filename, content) {
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
                    description: 'Generated files',
                    accept: acceptTypes
                }]
            });
            
            const writable = await fileHandle.createWritable();
            await writable.write(content);
            await writable.close();
            
            showToast(`📄 ${filename} saved successfully!`, 'success');
            return;
            
        } catch (error) {
            if (error.name === 'AbortError') {
                // User cancelled - that's fine
                showToast('📄 Save cancelled', 'info');
                return;
            } else {
                console.warn('File System Access API failed:', error);
                // Fall through to fallback
            }
        }
    }
    
    // Fallback to regular download
    showToast('📄 Using Downloads folder (File manager not available)', 'info');
    fallbackDownload(filename, content);
}

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
            <button id="downloadDefault" style="
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
            
            <button id="copyContent" style="
                background: #7c3aed;
                color: white;
                border: none;
                padding: 10px 16px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                flex: 1;
                min-width: 140px;
            ">� Copy & Create File</button>
            
            <button id="viewContent" style="
                background: #059669;
                color: white;
                border: none;
                padding: 10px 16px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                flex: 1;
                min-width: 120px;
            ">�️ View Content</button>
        </div>
        
        <div style="margin-top: 15px; padding: 12px; background: #f3f4f6; border-radius: 8px; font-size: 13px; color: #374151;">
            💡 <strong>To save to your custom path:</strong><br>
            1. Use "Copy & Create File" to copy content<br>
            2. Open File Explorer → Navigate to <code style="background: #e5e7eb; padding: 2px 4px; border-radius: 3px;">${downloadPath}</code><br>
            3. Create new file → Paste content → Save as <code style="background: #e5e7eb; padding: 2px 4px; border-radius: 3px;">${filename}</code>
        </div>
        
        <button id="closeModal" style="
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
    
    // Event handlers - use setTimeout to ensure DOM is ready
    setTimeout(() => {
        const downloadDefaultBtn = document.getElementById('downloadDefault');
        const copyContentBtn = document.getElementById('copyContent');
        const viewContentBtn = document.getElementById('viewContent');
        const closeModalBtn = document.getElementById('closeModal');
        
        if (downloadDefaultBtn) {
            downloadDefaultBtn.onclick = () => {
                fallbackDownload(filename, content);
                document.body.removeChild(modal);
                showToast(`📄 ${filename} downloaded to Downloads folder`, 'info');
            };
        }
        
        if (copyContentBtn) {
            copyContentBtn.onclick = () => {
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
        
        if (viewContentBtn) {
            viewContentBtn.onclick = () => {
                document.body.removeChild(modal);
                showContentViewModal(filename, content, downloadPath);
            };
        }
        
        if (closeModalBtn) {
            closeModalBtn.onclick = () => {
                document.body.removeChild(modal);
            };
        }
    }, 10);
    
    document.getElementById('downloadSaveAs').onclick = async () => {
        document.body.removeChild(modal);
        
        // Try using the File System Access API first (Chrome 86+)
        if ('showSaveFilePicker' in window) {
            try {
                const fileHandle = await window.showSaveFilePicker({
                    suggestedName: filename,
                    types: [{
                        description: 'Text files',
                        accept: { 'text/plain': ['.cs', '.feature', '.txt'] }
                    }]
                });
                
                const writable = await fileHandle.createWritable();
                await writable.write(content);
                await writable.close();
                
                showToast(`📄 ${filename} saved successfully!`, 'success');
                return;
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.warn('File System Access API failed:', error);
                }
                // Fall through to other methods if user cancelled or API failed
            }
        }
        
        // Fallback: Create a download link with download attribute to trigger save dialog
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        
        // Add to DOM and trigger click
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 100);
        
        showToast(`📄 ${filename} download started. Check your Downloads folder or save dialog.`, 'info');
    };
    
    document.getElementById('copyContent').onclick = () => {
        navigator.clipboard.writeText(content).then(() => {
            document.body.removeChild(modal);
            showToast(`📋 ${filename} content copied to clipboard! Create the file manually at: ${downloadPath}`, 'success');
        }).catch(() => {
            // Fallback for clipboard
            const textArea = document.createElement('textarea');
            textArea.value = content;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            document.body.removeChild(modal);
            showToast(`� ${filename} content copied to clipboard! Create the file manually at: ${downloadPath}`, 'success');
        });
    };
    
    document.getElementById('closeModal').onclick = () => {
        document.body.removeChild(modal);
    };
    
    // Close on background click
    modal.onclick = (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    };
}

function showContentViewModal(filename, content, downloadPath) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.9);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10001;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        padding: 20px;
        border-radius: 12px;
        max-width: 90%;
        max-height: 90%;
        width: 800px;
        height: 600px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        display: flex;
        flex-direction: column;
    `;
    
    modalContent.innerHTML = `
        <div style="margin-bottom: 15px; border-bottom: 1px solid #e5e7eb; padding-bottom: 15px;">
            <h3 style="margin: 0 0 10px 0; color: #1f2937;">📄 ${filename}</h3>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
                Target location: <strong style="color: #059669;">${downloadPath}</strong>
            </p>
        </div>
        
        <textarea readonly style="
            flex: 1;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            padding: 15px;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 13px;
            line-height: 1.4;
            background: #f9fafb;
            color: #374151;
            resize: none;
            outline: none;
        ">${content}</textarea>
        
        <div style="margin-top: 15px; display: flex; gap: 10px; justify-content: space-between;">
            <button id="selectAllContent" style="
                background: #6366f1;
                color: white;
                border: none;
                padding: 10px 16px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
            ">🔤 Select All</button>
            
            <div style="display: flex; gap: 10px;">
                <button id="copyFromView" style="
                    background: #059669;
                    color: white;
                    border: none;
                    padding: 10px 16px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 14px;
                ">📋 Copy to Clipboard</button>
                
                <button id="downloadFromView" style="
                    background: #dc2626;
                    color: white;
                    border: none;
                    padding: 10px 16px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 14px;
                ">📥 Download</button>
                
                <button id="closeViewModal" style="
                    background: #6b7280;
                    color: white;
                    border: none;
                    padding: 10px 16px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 14px;
                ">✕ Close</button>
            </div>
        </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    const textarea = modalContent.querySelector('textarea');
    
    // Event handlers
    document.getElementById('selectAllContent').onclick = () => {
        textarea.select();
        showToast('📄 Content selected! Use Ctrl+C to copy', 'info');
    };
    
    document.getElementById('copyFromView').onclick = () => {
        navigator.clipboard.writeText(content).then(() => {
            showToast(`📋 ${filename} copied! Navigate to ${downloadPath}`, 'success');
        }).catch(() => {
            textarea.select();
            document.execCommand('copy');
            showToast(`📋 ${filename} copied! Navigate to ${downloadPath}`, 'success');
        });
    };
    
    document.getElementById('downloadFromView').onclick = () => {
        fallbackDownload(filename, content);
        showToast(`📄 ${filename} downloaded to Downloads folder`, 'info');
    };
    
    document.getElementById('closeViewModal').onclick = () => {
        document.body.removeChild(modal);
    };
    
    // Close on background click
    modal.onclick = (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    };
}

function fallbackDownload(filename, content) {
    const blob = new Blob([content], { 
        type: 'text/plain;charset=utf-8' 
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    
    // Clean up immediately
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 100);
    
    showToast(`📄 ${filename} downloaded!`, 'success');
}
