# Namespace Feature Guide

## Overview
The extension now supports automatic namespace generation based on a root file name input. This allows you to organize your generated step files with proper namespace hierarchy.

## How to Use

### 1. Setting Root File Name
1. Open the extension popup
2. In the main configuration card, you'll find a new field: **"Root File Name (for namespace)"**
3. Enter your desired root file name (e.g., "Student", "Administration", "Finance")
4. This will be used to generate the namespace for your step files

### 2. Generated Namespace Structure
- **Without Root File Name**: `UMS.UI.Test.ERP.Areas.YourMenugroup.Steps`
- **With Root File Name**: `UMS.UI.Test.ERP.Areas.{RootFileName}.Steps`

Example:
- Root File Name: "Student" → Namespace: `UMS.UI.Test.ERP.Areas.Student.Steps`
- Root File Name: "Administration" → Namespace: `UMS.UI.Test.ERP.Areas.Administration.Steps`

### 3. Viewing Current Configuration
1. Open the View page (click "View" button in popup)
2. At the top, you'll see a "Configuration Info" section showing:
   - Current namespace that will be used
   - Action name
   - Root file name

### 4. File Generation
When you generate step files, the namespace will automatically be applied:
- Element files: No namespace change
- Page files: No namespace change  
- **Step files**: Will include the proper namespace based on root file name
- Feature files: No namespace change

## Benefits

1. **Better Organization**: Files are organized under proper namespace hierarchy
2. **Team Consistency**: All team members can use the same namespace structure
3. **Project Structure**: Aligns with your project's folder/namespace organization
4. **Easy Maintenance**: Clear namespace makes code easier to maintain and locate

## Example Generated Step File

```csharp
using UMS.UI.Test.BusinessModel.Helper;
using UMS.UI.Test.ERP.Areas.Common;

namespace UMS.UI.Test.ERP.Areas.Student.Steps
{
    [Binding]
    public class StudentStep(StudentPage page)
    {
        private IWebElement? _webElement;
        private static SelectElement SelectElement(IWebElement webElement) => new(webElement);

        // Your generated methods here...
    }
}
```

## Notes

- Root file name is automatically cleaned (removes special characters and spaces)
- The setting is persisted, so you only need to set it once per project
- If no root file name is provided, it defaults to "YourMenugroup"
- The namespace preview is shown in the View page for confirmation
