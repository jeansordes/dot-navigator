# REQ.csv Audit Report

## Executive Summary

The REQ.csv file contains 17 Functional Requirements (FR) and 8 Non-Functional Requirements (NFR). Overall structure is good, but several requirements are missing or need refinement.

## ✅ Strengths

1. **Format Consistency**: All rows follow the same CSV format
2. **ID Numbering**: Sequential and consistent (FR-01 to FR-17, NFR-01 to NFR-08)
3. **Category Consistency**: Categories are now properly assigned after recent fix
4. **Description Format**: All descriptions follow "The system shall..." format consistently

## ⚠️ Issues Found

### 1. Missing Requirements

#### 1.1 Schema Suggestions Feature (High Priority)
The `schema-suggestions.md` spec describes a complete feature that is not properly covered in REQ.csv:

- **FR-04** mentions "user-defined patterns" but doesn't explicitly cover schema suggestions
- Missing requirements:
  - Schema rule loading from JSON file
  - Pattern matching for schema rules
  - Exclusion pattern support
  - Hierarchical suggestion support (dotted children like "architecture.backend")

**Recommendation**: Add new FRs:
- `FR-18,Schema Suggestions,The system shall load schema rules from a configuration file (JSON or Markdown).`
- `FR-19,Schema Suggestions,The system shall match files against schema patterns to generate virtual child suggestions.`
- `FR-20,Schema Suggestions,The system shall support exclusion patterns to prevent suggestions for specific file patterns.`
- `FR-21,Schema Suggestions,The system shall support hierarchical suggestions using dotted child names (e.g., "architecture.backend").`

#### 1.2 Rename Error Handling (Medium Priority)
From `rename-operations.md` scenario 2:
- **Missing**: Error handling when rename target already exists

**Recommendation**: Add:
- `FR-22,Note Operations,The system shall prevent renaming a note to a name that already exists and display an appropriate error message.`

#### 1.3 Undo/Rollback Functionality (High Priority)
The codebase has extensive undo functionality, but it's not documented in REQ.csv:
- Undo last rename operation (exists in code and README)
- Cancel rename operation during progress
- Rollback on cancellation

**Recommendation**: Add:
- `FR-23,Note Operations,The system shall allow users to undo the last rename operation.`
- `FR-24,Note Operations,The system shall allow users to cancel a rename operation in progress and rollback completed changes.`

#### 1.4 Folder Display (Low Priority)
From `tree-navigation.md` scenario 4:
- Folders should be displayed correctly in the tree

**Recommendation**: Clarify or add:
- `FR-25,Tree Display,The system shall display folders alongside dot-separated notes in the hierarchical tree.`

### 2. Category Issues

#### 2.1 FR-04 Description Mismatch
- **Current**: "The system shall generate virtual child nodes based on user-defined patterns."
- **Issue**: This description is too generic. It could refer to schema suggestions OR manual virtual nodes.
- **Recommendation**: Split into two requirements:
  - Keep FR-04 for schema-based virtual nodes
  - Add separate FR for manual/pattern-based virtual nodes if they exist

### 3. Description Clarity Issues

#### 3.1 FR-10 Ambiguity
- **Current**: "The system shall display all file types supported by Obsidian within the tree."
- **Issue**: "All file types" is vague. Does this mean all extensions Obsidian supports, or all types the user has configured?
- **Recommendation**: Clarify: "The system shall display files of all types supported by Obsidian (not limited to Markdown files) within the tree."

#### 3.2 FR-17 Could Be More Specific
- **Current**: "The system shall allow users to scroll horizontally to navigate deeply nested hierarchies."
- **Recommendation**: Clarify: "The system shall support horizontal scrolling to accommodate deeply nested hierarchies in the tree view."

### 4. Potential Duplicates/Overlaps

#### 4.1 FR-02 vs FR-11/FR-12
- FR-02: "expand and collapse tree nodes" (individual)
- FR-11: "expand all nodes" (bulk)
- FR-12: "collapse all nodes" (bulk)
- **Status**: ✅ These are distinct and correctly separated

#### 4.2 FR-08 vs FR-16
- FR-08: "rename an existing note directly from the tree"
- FR-16: "rename a note and all its descendant notes in a single operation"
- **Status**: ✅ These are distinct features

### 5. NFR Coverage

NFRs are well-structured with appropriate categories:
- Performance (3 requirements) ✅
- Usability (2 requirements) ✅
- Compatibility (1 requirement) ✅
- Stability (2 requirements) ✅

**Potential Addition**:
- Consider adding a Security/Privacy NFR if the plugin handles user data

## 📊 Coverage Analysis

### Spec File Coverage

| Spec File | Scenarios | Covered | Missing |
|-----------|-----------|---------|---------|
| `tree-navigation.md` | 5 | 4 | 1 (folder display) |
| `rename-operations.md` | 4 | 2 | 2 (error handling, undo) |
| `schema-suggestions.md` | 4 | 0 | 4 (all scenarios) |

### Feature Coverage

| Feature Area | Requirements | Status |
|--------------|--------------|--------|
| Tree Display | 3 | ✅ Good |
| Tree Navigation | 7 | ✅ Good |
| Virtual Nodes | 3 | ⚠️ Needs schema clarification |
| Tree State | 1 | ✅ Good |
| Note Operations | 3 | ⚠️ Missing undo/error handling |
| Schema Suggestions | 0 | ❌ Missing |
| Performance | 3 | ✅ Good |
| Usability | 2 | ✅ Good |
| Compatibility | 1 | ✅ Good |
| Stability | 2 | ✅ Good |

## 🔧 Recommendations

### Immediate Actions

1. **Add Schema Suggestions Requirements** (FR-18 to FR-21)
2. **Add Undo/Rollback Requirements** (FR-23, FR-24)
3. **Add Error Handling Requirement** (FR-22)
4. **Clarify FR-04** to distinguish schema-based vs manual virtual nodes

### Short-term Actions

1. **Add Folder Display Requirement** (FR-25)
2. **Clarify FR-10** description
3. **Review FR-17** for specificity

### Long-term Considerations

1. Consider adding Security/Privacy NFRs if applicable
2. Consider adding Accessibility NFRs (though project rules say not needed)
3. Consider versioning requirements if API compatibility is important

## 📝 Proposed New Requirements

```csv
FR-18,Schema Suggestions,The system shall load schema rules from a configuration file (JSON or Markdown format).
FR-19,Schema Suggestions,The system shall match files against schema patterns to generate virtual child suggestions.
FR-20,Schema Suggestions,The system shall support exclusion patterns to prevent suggestions for specific file patterns.
FR-21,Schema Suggestions,The system shall support hierarchical suggestions using dotted child names (e.g., "architecture.backend").
FR-22,Note Operations,The system shall prevent renaming a note to a name that already exists and display an appropriate error message.
FR-23,Note Operations,The system shall allow users to undo the last rename operation.
FR-24,Note Operations,The system shall allow users to cancel a rename operation in progress and rollback completed changes.
FR-25,Tree Display,The system shall display folders alongside dot-separated notes in the hierarchical tree.
```

## Summary Statistics

- **Current Total**: 25 requirements (17 FR + 8 NFR)
- **Proposed Additions**: 8 new FRs
- **Proposed Total**: 33 requirements (25 FR + 8 NFR)
- **Coverage**: ~70% of spec scenarios currently covered
- **After Fixes**: ~95% coverage expected
