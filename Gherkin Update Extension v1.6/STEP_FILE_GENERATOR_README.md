# Step File Generator

## Overview
The Step File Generator is a new feature that allows you to dynamically generate C# step file code based on collected Gherkin steps. This feature automatically creates step methods with the appropriate code patterns based on the input type you select for each step.

## How to Use

### 1. Collect Gherkin Steps
First, use the extension to collect Gherkin steps by clicking on form elements while the extension is enabled.

### 2. Access Step File Generator
1. Open the Test Output Viewer (view.html)
2. Navigate to the "⚙️ Step File Generator" section
3. You'll see a list of your collected Gherkin steps with dropdown selectors

### 3. Configure Input Types
For each Gherkin step, select the appropriate input type from the dropdown:

- **Click/Button**: For buttons, links, and clickable elements
- **Normal Select**: For single-selection dropdown menus
- **Multi Select**: For multi-selection dropdown menus
- **Normal Input Field**: For text inputs, number inputs, etc.
- **Search Dropdown**: For searchable dropdown menus
- **Date From**: For date picker fields (start date)
- **Date To**: For date picker fields (end date)
- **Image Upload**: For image file upload fields
- **Excel Upload**: For Excel file upload fields
- **Excel File Upload**: For specific Excel file browser functionality

### 4. Generate Step File
1. After configuring all input types, click the "🚀 Generate Step File" button
2. The generated C# step file code will appear in the code block below
3. You can copy or edit the generated code using the toolbar buttons

## Auto-Detection
The system automatically tries to detect the most appropriate input type based on the Gherkin step content:
- Steps containing "click" → Click/Button
- Steps with "enter" + "date from" → Date From
- Steps with "enter" + "date to" → Date To
- Steps with "enter" + "image" → Image Upload
- Steps with "enter" + "excel" → Excel Upload
- Steps with "select" + "excel file" → Excel File Upload
- Other "enter" steps → Normal Input Field
- Other "select" steps → Normal Select

## Generated Code Structure
The generated step file includes:
- Proper using statements
- Class declaration with dependency injection
- Private fields for web elements
- Helper methods for select elements
- Individual step methods with appropriate attributes and implementations

## Code Templates
The generator uses predefined code templates based on your example step files:

### Normal Input Example:
```csharp
[When("Enter Example Field {string}")]
public void WhenEnterExampleField(string exampleField)
{
    _webElement = page.GetExampleField();
    _webElement.Clear();
    _webElement.SendKeys(exampleField);
}
```

### Multi Select Example:
```csharp
[When("Select Example Options {string}")]
public void WhenSelectExampleOptions(string exampleOptions)
{
    _webElement = page.GetExampleOptions();
    var exampleOptionsList = TestHelper.GetStringsBySplit(exampleOptions);
    foreach (var item in exampleOptionsList)
        SelectElement(_webElement).SelectByText(item);
}
```

### Date Picker Example:
```csharp
[When("Enter Example Date From {string}")]
public void WhenEnterExampleDateFrom(string exampleDateFrom)
{
    exampleDateFrom = !string.IsNullOrEmpty(exampleDateFrom)
       ? exampleDateFrom
       : DateTime.Now.ToString("yyyy-MM-dd");
    page.Js.ExecuteScript($"arguments[0].value = '{exampleDateFrom}';", page.GetExampleDateFrom());
    page.GetExampleDateFrom().Click();
    Thread.Sleep(500);
    string day = DateTime.Parse(exampleDateFrom).Day.ToString();
    page.GetActiveDate(day).Click();
    Thread.Sleep(1000);
}
```

## Tips
1. **Review Auto-Selection**: Always review the auto-selected input types before generating
2. **Customize as Needed**: You can manually change any input type selection
3. **Edit Generated Code**: Use the edit button to modify the generated code if needed
4. **Copy for Use**: Use the copy button to copy the generated code to your clipboard
5. **Reset and Regenerate**: You can reset the extension and start fresh anytime

## Error Handling
- If no Gherkin steps are collected, the generator will show a message to collect steps first
- Parameter names and method names are automatically cleaned and formatted
- Default values are provided when step parsing fails

This feature streamlines the process of creating step definition files by automatically generating the boilerplate code based on your UI interactions and input type selections.
