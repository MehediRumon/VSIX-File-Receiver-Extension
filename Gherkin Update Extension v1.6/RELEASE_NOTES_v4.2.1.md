# Gherkin Update Extension v4.2.1 - Release Notes

## 🚀 New Features

### 1. Dynamic Namespace Generation
- **Feature**: Add custom namespace based on root file name input
- **Location**: New "Root File Name (for namespace)" field in popup configuration
- **Benefit**: Organize step files with proper namespace hierarchy
- **Example**: Root file "Student" → `UMS.UI.Test.ERP.Areas.Student.Steps`

### 2. Configuration Info Display
- **Feature**: Live display of current configuration settings
- **Location**: Top of View page
- **Shows**: Current namespace, action name, and root file name
- **Benefit**: Easy verification of settings before file generation

## 🐛 Bug Fixes

### 1. Download Format Issue Fixed
- **Issue**: Downloaded files breaking into single line format
- **Fix**: Improved blob creation with proper line ending normalization
- **Impact**: All downloaded files now maintain proper formatting
- **Details**: See DOWNLOAD_FORMAT_FIX.md for technical details

## 📋 Usage Instructions

### Setting Up Namespace
1. Open extension popup
2. Enter your project's root file name in the new field
3. The namespace will automatically update in generated step files
4. View the Configuration Info section to verify settings

### Downloading Files
1. Generate your step files as usual
2. Use any download option (individual or batch)
3. Files will maintain proper formatting and structure
4. Open downloaded files to verify correct formatting

## 🔧 Technical Improvements

- Enhanced cross-platform compatibility for downloads
- Better UTF-8 encoding support
- Improved error handling in file generation
- Persistent storage of root file name settings

## 📁 Files Modified

### Core Files
- `popup.html` - Added root file name input field
- `popup.js` - Added root file name handling and storage
- `view.html` - Added configuration info display section
- `view.js` - Enhanced namespace generation and download functions

### Documentation
- `NAMESPACE_FEATURE_GUIDE.md` - Complete guide for namespace feature
- `DOWNLOAD_FORMAT_FIX.md` - Technical details of download fix
- `RELEASE_NOTES_v4.2.1.md` - This file

## 🔄 Migration Notes

### From Previous Versions
- No breaking changes
- Existing collected data remains intact
- New features are additive
- Root file name defaults to empty (uses "YourMenugroup")

### Recommended Actions
1. Update to v4.2.1
2. Set root file name for your project
3. Verify configuration in View page
4. Test download functionality with existing data

## 🎯 Future Enhancements

### Planned Features
- Multiple namespace templates
- Project-specific configuration profiles
- Bulk namespace updates for existing files
- Integration with IDE project structures

## 🐛 Known Issues

- None reported for v4.2.1

## 📞 Support

If you encounter any issues:
1. Check the configuration info in View page
2. Verify root file name contains only valid characters
3. Test with simple step file generation first
4. Report issues with specific error messages and steps to reproduce

---

**Version**: 4.2.1  
**Release Date**: Current  
**Compatibility**: Chrome/Edge Extensions API v3  
**Prerequisites**: None additional
