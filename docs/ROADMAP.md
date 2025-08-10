# StackTrackr - Development Roadmap

## 🔄 Patch Release Roadmap

- **v3.03.05a - Column Visibility Refinement**: Fine-tune mobile column hiding rules for clarity.
- **v3.03.06a - Responsive Inventory Table**: Implement a fully responsive inventory table that adapts layout to screen size.

## 🎯 Milestone: Version 3.5.0
**Target: Complete UI reorganization, enhanced data management, and multi-currency support**

---

## 📋 Implementation Ranking (Easiest → Most Complex)

### **PHASE 1: Quick Wins & Documentation** ⚡
*Scope: 12 subtasks*

#### 1. **Documentation Standardization** (Complexity: ⭐) - 6 subtasks
- **Task**: Use generic version references in all documentation except changelogs
- **Impact**: Reduces maintenance burden, fewer files to update per release

**Subtasks (2 hours each):**
- **1A**: Audit all .md files and identify hardcoded version references
- **1B**: Create template system for version references and update build process
- **1C**: Update README.md with generic version references
- **1D**: Update LLM.md with generic version references  
- **1E**: Update STATUS.md with generic version references
- **1F**: Update STRUCTURE.md and other documentation files

#### 2. **API Usage Tracking System** (Complexity: ⭐⭐) - 6 subtasks
- **Task**: Track API calls per provider with user-configurable limits

**Subtasks (2 hours each):**
- **2A**: Design usage tracking data structure and storage schema
- **2B**: Implement usage counter functions in api.js
- **2C**: Add usage display components to API modal UI
- **2D**: Implement usage limit warnings and notifications
- **2E**: Add usage reset functionality and manual overrides
- **2F**: Update API configuration save/load functions for usage data

---

### **PHASE 2: User Experience Improvements** 🎨
*Scope: 22 subtasks*

#### 3. **Enhanced CSV Import Feedback** (Complexity: ⭐⭐) - 6 subtasks
- **Task**: Provide detailed feedback on invalid CSV rows during import

**Subtasks (2 hours each):**
- **3A**: Analyze current importCsv function and error handling patterns
- **3B**: Create detailed error message templates and examples
- **3C**: Implement per-row validation with specific error identification
- **3D**: Create error summary UI component and progress dialog
- **3E**: Add example correction suggestions for common errors
- **3F**: Implement downloadable error report and corrected template

#### 4. **Add Item Modal Popup** (Complexity: ⭐⭐⭐) - 7 subtasks
- **Task**: Move item entry form to dedicated modal popup

**Subtasks (2 hours each):**
- **4A**: Design Add Item modal HTML structure and layout
- **4B**: Create Add Item modal CSS styling matching existing modals
- **4C**: Move form fields from main page to modal structure
- **4D**: Implement modal show/hide functions and event handlers
- **4E**: Update form submission event handlers for modal context
- **4F**: Add form validation and persistence during errors
- **4G**: Update ADD button placement and styling next to search

#### 5. **DATA Button & UI Reorganization** (Complexity: ⭐⭐⭐) - 9 subtasks
- **Task**: Create DATA button and reorganize data management UI

**Subtasks (2 hours each):**
- **5A**: Design DATA modal HTML structure and section organization
- **5B**: Create DATA modal CSS styling and responsive design
- **5C**: Move import buttons (CSV, JSON, Excel) to DATA modal
- **5D**: Move export buttons (CSV, JSON, Excel, PDF, HTML) to DATA modal
- **5E**: Move backup/restore buttons to DATA modal
- **5F**: Move boating accident button to DATA modal bottom section
- **5G**: Implement DATA modal show/hide functions
- **5H**: Update all event handlers for moved buttons
- **5I**: Clean up main interface HTML after button removal

---

### **PHASE 3: Data Management Enhancements** 🔧
*Scope: 15 subtasks*

#### 6. **Table Spot Price Display Fix** (Complexity: ⭐⭐⭐) - 6 subtasks
- **Task**: Ensure table shows spot price at purchase, not current

**Subtasks (2 hours each):**
- **6A**: Audit current table rendering logic for spot price display
- **6B**: Identify discrepancies between spot price vs purchase price display
- **6C**: Update renderTable function for correct historical price display
- **6D**: Test spot price display with historical data and collectable items
- **6E**: Update export functions if spot price logic affects exports
- **6F**: Update documentation and user guides for clarification

#### 7. **Restore Data Functionality** (Complexity: ⭐⭐⭐⭐) - 9 subtasks
- **Task**: Implement data restoration from backup ZIP files

**Subtasks (2 hours each):**
- **7A**: Design restore data UI components and user flow
- **7B**: Implement ZIP file upload and parsing functionality
- **7C**: Create data validation and compatibility checking for restore files
- **7D**: Implement inventory data restoration with conflict resolution
- **7E**: Implement settings and preferences restoration
- **7F**: Implement spot price history restoration and merging
- **7G**: Add selective restore options (checkboxes for data types)
- **7H**: Implement progress feedback and status updates during restore
- **7I**: Add comprehensive error handling and rollback functionality

---

### **PHASE 4: Advanced Features** 🚀
*Scope: 21 subtasks*

#### 8. **Multi-Currency Support** (Complexity: ⭐⭐⭐⭐⭐) - 11 subtasks
- **Task**: Add support for multiple currencies with API compatibility matrix

**Subtasks (2 hours each):**
- **8A**: Research and document API provider currency support capabilities
- **8B**: Create comprehensive currency compatibility matrix for all providers
- **8C**: Design currency selection UI and settings integration
- **8D**: Implement core currency conversion functions and utilities
- **8E**: Update API endpoints and request handling for currency parameters
- **8F**: Modify all calculation functions to support multi-currency
- **8G**: Update display formatting and UI elements for currency symbols
- **8H**: Implement currency exchange rate caching and storage
- **8I**: Update all export functions to handle currency data
- **8J**: Comprehensive testing of multi-currency calculations
- **8K**: Update documentation and user guides for currency features

#### 9. **Encrypted API Key Backup/Restore** (Complexity: ⭐⭐⭐⭐⭐) - 10 subtasks
- **Task**: Secure API key storage in backups with password encryption

**Subtasks (2 hours each):**
- **9A**: Research Web Crypto API implementation and browser compatibility
- **9B**: Design password-based encryption system architecture
- **9C**: Implement secure key derivation functions (PBKDF2)
- **9D**: Update backup functions to encrypt API keys before storage
- **9E**: Create password prompt UI components and validation
- **9F**: Implement encrypted restore functionality with decryption
- **9G**: Add password strength validation and security warnings
- **9H**: Implement fallback handling for failed decryption attempts
- **9I**: Test complete encryption/decryption workflow end-to-end
- **9J**: Add comprehensive security documentation and user warnings

---

## 🏗️ Development Strategy

### **Prerequisites**
- Complete current bug fixes and stability improvements
- Ensure comprehensive test coverage for existing features
- Create development branch for v3.5.0 work

### **Development Phases**
1. **Phase 1 & 2**: Can be developed in parallel
2. **Phase 3**: Depends on Phase 2 completion (DATA modal)
3. **Phase 4**: Can begin once core UI is stable

### **Testing Strategy**
- Automated testing for critical functions
- Cross-browser compatibility testing
- File protocol (file://) testing
- Mobile responsiveness verification
- Data migration and backup/restore testing

### **Documentation Updates**
- Update all technical documentation
- Create user guides for new features
- API provider compatibility matrix
- Security best practices documentation

---

## 🎁 Version 3.5.0 Feature Summary

### **New Features**
- ✅ API usage tracking and limits
- ✅ Enhanced CSV import with detailed error feedback
- ✅ Reorganized UI with DATA modal
- ✅ Add Item modal popup
- ✅ Complete backup/restore system with ZIP support
- ✅ Multi-currency support with conversion
- ✅ Encrypted API key storage in backups

### **Improvements**
- ✅ Cleaner, more organized interface
- ✅ Better user feedback and error handling
- ✅ Enhanced data security
- ✅ Streamlined documentation maintenance
- ✅ More flexible currency options

### **Technical Debt Reduction**
- ✅ Standardized documentation system
- ✅ Enhanced error handling and validation
- ✅ Improved modal system consistency
- ✅ Better separation of concerns in UI

---

## 🤝 Multi-Agent Development Notes
- **Task Size**: Each subtask designed for ~2 hour completion time
- **Parallel Work**: Multiple subtasks can be worked on simultaneously
- **Dependencies**: Subtasks within phases may have dependencies (noted in planning docs)
- **Coordination**: Use subtask IDs (e.g., 1A, 2B) for tracking and assignment
- **Testing**: Each subtask should include basic validation/testing of changes

---

## 🔄 Release Strategy

### **Pre-Release**
- Comprehensive testing across all browsers
- Documentation review and updates
- Version number updates throughout codebase
- GitHub preparation and branch management

### **Release**
 - Update to v3.5.0 in `constants.js`
- Complete changelog entry
- Documentation synchronization
- GitHub main branch merge
- Release notes and feature announcements

---

## 📝 Notes & Considerations

### **Security**
- All encryption must be client-side only
- No API keys or passwords stored in plaintext
- Clear user warnings about password management
- Consider password strength requirements

### **Backwards Compatibility**
- All data migrations must be automatic
- Existing exports must remain importable
- API configurations should migrate seamlessly
- Theme and user preferences preserved

### **Performance**
- ZIP file processing for large inventories
- Currency conversion caching
- API rate limiting respect
- Mobile device considerations

### **User Experience**
- Minimal learning curve for existing users
- Progressive disclosure of advanced features
- Clear success/error messaging
- Consistent modal behavior

---

*This roadmap represents a comprehensive enhancement to the StackTrackr, transforming it from a solid inventory management system into a professional-grade application with advanced data management, security, and international support capabilities.*
