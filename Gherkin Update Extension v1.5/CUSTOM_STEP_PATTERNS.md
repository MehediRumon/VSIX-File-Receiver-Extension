# Custom Gherkin Step Patterns Feature

## Overview
The Gherkin Update Extension now automatically generates custom Gherkin step patterns based on the selected input type. When you change the input type dropdown, the Gherkin step text updates automatically to follow specific patterns for different element types.

## How It Works

### 1. Automatic Step Text Generation
When you select an input type from the dropdown, the extension automatically updates the Gherkin step text to follow these patterns:

| Input Type | Pattern | Example |
|------------|---------|---------|
| Date From | `When Enter {MenuName} FromDate` | `When Enter StartDate FromDate` |
| Date To | `When Enter {MenuName} ToDate` | `When Enter EndDate ToDate` |
| Normal Input | `When Enter {MenuName}` | `When Enter EmployeeName` |
| Textarea | `When Enter {MenuName}` | `When Enter Description` |
| Normal Select | `When Select {MenuName}` | `When Select Department` |
| Multi Select | `When Select {MenuName}` | `When Select Version` |
| Checkbox | `When Check {MenuName}` | `When Check IsActive` |
| Radio | `When Select {MenuName} Option` | `When Select PaymentMethod Option` |
| Button | `When Click {MenuName}` | `When Click Save` |
| Link | `When Click {MenuName} Link` | `When Click ViewDetails Link` |

### 2. Smart Menu Name Extraction
The extension automatically extracts clean menu names from the original step text by:
- Removing common prefixes: "Click on", "When I click on", "select", "enter", etc.
- Removing trailing words: "button", "field", "dropdown", "input", "element", "control"
- Removing punctuation: colons, periods, commas, semicolons
- Preserving the meaningful element name

## Features

### 1. Real-time Step Updates
- When you change the input type dropdown, the step text updates immediately
- No need to regenerate the step file to see the changes
- Preserves manual edits to step text when possible

### 2. Parameter Addition
The system automatically adds appropriate parameters to steps:
- Date fields get `"<fromDate>"` or `"<toDate>"` parameters
- Select fields get `"<elementname>"` parameters
- Input fields get `"<elementname>"` parameters
- Button clicks don't get parameters (they're action steps)

### 3. Code Generation
When generating the step file, the system creates appropriate C# methods:

#### Date Fields
```csharp
[When("When Enter StartDate FromDate {string}")]
public void WhenEnterStartDateFromDate(string fromDate)
{
    fromDate = !string.IsNullOrEmpty(fromDate)
       ? fromDate
       : DateTime.Now.ToString("yyyy-MM-dd");
    page.Js.ExecuteScript($"arguments[0].value = '{fromDate}';", page.GetStartDate());
}
```

#### Select Fields
```csharp
[When("When Select Department {string}")]
public void WhenSelectDepartment(string department)
{
    _webElement = page.GetDepartment();
    SelectElement(_webElement).SelectByText(department);
}
```

#### Multi-Select Fields
```csharp
[When("When Select Version {string}")]
public void WhenSelectVersion(string version)
{
    _webElement = page.GetVersion();
    var versions = TestHelper.GetStringsBySplit(version);
    foreach (var item in versions)
        SelectElement(_webElement).SelectByText(item);
}
```

## Testing the Feature

### 1. Use the Test File
Open `test_custom_steps.html` in your browser to test the feature:
- Click on different elements (date fields, selects, inputs, buttons)
- Open the extension popup and go to the View tab
- Change the input type dropdowns to see step text updates
- Generate the step file to see the C# code

### 2. Expected Behavior
1. **Date Fields**: Should auto-detect as Date From/Date To and generate appropriate patterns
2. **Multiselect Dropdowns**: Should be detected automatically and generate "When Select" patterns
3. **Regular Inputs**: Should generate "When Enter" patterns
4. **Buttons**: Should generate "When Click" patterns

### 3. Manual Testing Steps
1. Click on "Start Date" input → Should generate "When Enter StartDate FromDate"
2. Change input type to "Normal Input" → Should update to "When Enter StartDate"
3. Change back to "Date From" → Should revert to "When Enter StartDate FromDate"
4. Click on multiselect button → Should detect as multiselect and generate "When Select Version"

## Benefits

### 1. Consistency
- All team members will use the same step patterns
- Reduces variations in Gherkin step naming
- Easier to maintain and understand test scenarios

### 2. Efficiency
- No manual editing of step text required
- Automatic parameter detection and addition
- Faster test development workflow

### 3. Best Practices
- Follows SpecFlow naming conventions
- Uses appropriate C# code patterns for different input types
- Handles edge cases like empty date values

## Technical Implementation

### Key Functions
1. `generateGherkinStepByInputType()` - Creates custom step patterns based on input type
2. `generateMethodFromStep()` - Enhanced to handle custom patterns and add parameters
3. Event listener on input type dropdowns - Updates step text in real-time

### Integration Points
- Works with existing multiselect detection
- Preserves manual step editing functionality
- Compatible with all existing input types and code generation features

## Troubleshooting

### Common Issues
1. **Step text not updating**: Check that you've selected a different input type
2. **Wrong pattern generated**: Verify the original step text contains meaningful element names
3. **Parameters missing**: The system should auto-add parameters, but you can manually edit if needed

### Debug Tips
- Use browser console to see step generation logs
- Check the original step text in the label's `data-original-step` attribute
- Verify that the input type dropdown has the correct value selected
