# Element Name Extraction Examples

## Before Fix (Problems):
- `"When Enter TestMenu Date From"` → `page.GetTestmenuDateFrom()` ❌
- `"When Select ClassAttendance Organization"` → `page.GetClassattendanceOrganization()` ❌
- `"When Enter ManageGroup Excel File"` → `page.GetManagegroupExcelFile()` ❌

## After Fix (Correct):
- `"When Enter TestMenu Date From"` → `page.GetDateFrom()` ✅
- `"When Select ClassAttendance Organization"` → `page.GetOrganization()` ✅
- `"When Enter ManageGroup Excel File"` → `page.GetExcelFile()` ✅
- `"When Enter StudentReport Username"` → `page.GetUsername()` ✅
- `"When Click On Search Button"` → `page.GetSearchButton()` ✅

## How It Works:

### 1. Menu Name Removal
The function identifies and removes common menu/page prefixes:
- `test`, `page`, `menu`, `report`, `admin`, `student`, `class`, `exam`
- `manage`, `clear`, `attendance`, `entry`, `filter`, `search`, `view`
- `add`, `edit`, `delete`, `update`, `create`, `new`, `list`

### 2. Smart Pattern Recognition
- **Date Fields**: `"Date From"` → `DateFrom`, `"Date To"` → `DateTo`
- **File Fields**: `"Excel File"` → `ExcelFile`
- **User Fields**: `"User Name"` → `Username`

### 3. Fallback Logic
- If no meaningful words remain, takes the last 2 meaningful words
- Converts to PascalCase for C# method naming convention
- Provides `DefaultElement` as ultimate fallback

### 4. Real Examples:
```gherkin
When Enter ClearClassAttendance Date From "<dateFrom>"
```
**Generated Method:**
```csharp
[When("Enter ClearClassAttendance Date From \"<dateFrom>\"")]
public void WhenEnterClearClassAttendanceDateFrom(string dateFrom)
{
    dateFrom = !string.IsNullOrEmpty(dateFrom)
       ? dateFrom
       : DateTime.Now.ToString("yyyy-MM-dd");
    page.Js.ExecuteScript($"arguments[0].value = '{dateFrom}';", page.GetDateFrom());
}
```

This now correctly calls `page.GetDateFrom()` instead of `page.GetClearclassattendanceDateFrom()`!
