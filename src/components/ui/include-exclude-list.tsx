/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Plus, Minus, Info, AlertCircle, CheckCircle } from 'lucide-react';

// Types
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export interface ValidationRule {
  type: 'required' | 'minItems' | 'maxItems' | 'custom';
  value?: number;
  message?: string;
  validator?: (selectedItems: string[], allItems: Record<string, ListItem>) => boolean;
}

export interface ListItem {
  key: string;
  label: string;
  tooltip?: string;
  removable?: boolean;
  value?: any; // Can store any associated value
  category?: string;
  priority?: number;
  metadata?: Record<string, any>;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface IncludeExcludeListProps {
  items: Record<string, string | ListItem>;
  selectedItems?: string[];
  onSelectionChange: (selectedItems: string[], values: any[]) => void;
  availableTitle?: string;
  selectedTitle?: string;
  searchable?: boolean;
  itemRenderer?: (item: ListItem) => React.ReactNode;
  height?: string;
  defaultItems?: string[];
  allItemKey?: string;
  allItemLabel?: string;
  validation?: ValidationRule[];
  showValidation?: boolean;
  valueType?: 'string' | 'number' | 'object' | 'mixed';
  onValidationChange?: (validation: ValidationResult) => void;
  disabled?: boolean;
  categoryFilter?: boolean;
  sortBy?: 'label' | 'priority' | 'category';
  sortOrder?: 'asc' | 'desc';
}

// Validation utility functions
const validateSelection = (
  selectedItems: string[],
  allItems: Record<string, ListItem>,
  rules: ValidationRule[]
): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  rules.forEach(rule => {
    switch (rule.type) {
      case 'required':
        if (selectedItems.length === 0) {
          errors.push(rule.message || 'At least one item must be selected');
        }
        break;
      
      case 'minItems':
        if (selectedItems.length < (rule.value || 0)) {
          errors.push(rule.message || `At least ${rule.value} items must be selected`);
        }
        break;
      
      case 'maxItems':
        if (selectedItems.length > (rule.value || Infinity)) {
          errors.push(rule.message || `No more than ${rule.value} items can be selected`);
        }
        break;
      
      case 'custom':
        if (rule.validator && !rule.validator(selectedItems, allItems)) {
          errors.push(rule.message || 'Custom validation failed');
        }
        break;
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

// Value extraction utility
const extractValues = (selectedItems: string[], allItems: Record<string, ListItem>, valueType: string): any[] => {
  return selectedItems.map(key => {
    const item = allItems[key];
    if (!item) return null;
    
    if (item.value !== undefined) {
      switch (valueType) {
        case 'string':
          return String(item.value);
        case 'number':
          return Number(item.value);
        case 'object':
          return typeof item.value === 'object' ? item.value : { value: item.value };
        default:
          return item.value;
      }
    }
    
    // Fallback to key if no value is defined
    return valueType === 'number' ? parseInt(key, 10) || 0 : key;
  }).filter(value => value !== null);
};

// Tooltip Component
const Tooltip: React.FC<{ content: string; children: React.ReactNode }> = ({ content, children }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      {isVisible && (
        <div className="absolute z-10 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg -top-2 left-full ml-2 whitespace-nowrap max-w-64">
          {content}
          <div className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 rotate-45"></div>
        </div>
      )}
    </div>
  );
};

// Validation Display Component
const ValidationDisplay: React.FC<{ validation: ValidationResult }> = ({ validation }) => {
  if (validation.isValid && validation.warnings.length === 0) {
    return (
      <div className="flex items-center gap-2 text-green-600 text-sm">
        <CheckCircle className="w-4 h-4" />
        <span>Selection is valid</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {validation.errors.map((error, index) => (
        <div key={`error-${index}`} className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      ))}
      {validation.warnings.map((warning, index) => (
        <div key={`warning-${index}`} className="flex items-center gap-2 text-yellow-600 text-sm">
          <Info className="w-4 h-4" />
          <span>{warning}</span>
        </div>
      ))}
    </div>
  );
};

// Mock Button component
const Button: React.FC<ButtonProps> = ({ 
  children, 
  onClick, 
  variant = 'default', 
  size = 'sm', 
  disabled = false, 
  className = '', 
  ...props 
}) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  const variants = {
    default: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500',
    ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-blue-500'
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const IncludeExcludeList: React.FC<IncludeExcludeListProps> = ({
  items,
  selectedItems = [],
  onSelectionChange,
  availableTitle = 'Available',
  selectedTitle = 'Selected',
  searchable = true,
  itemRenderer = null,
  height = 'h-64',
  defaultItems = [],
  allItemKey = null,
  allItemLabel = 'All Items',
  validation = [],
  showValidation = true,
  valueType = 'string',
  onValidationChange,
  disabled = false,
  categoryFilter = false,
  sortBy = 'label',
  sortOrder = 'asc'
}) => {
  const [availableSearch, setAvailableSearch] = useState<string>('');
  const [selectedSearch, setSelectedSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    isValid: true,
    errors: [],
    warnings: []
  });

  // Normalize items to consistent format
  const normalizedItems: Record<string, ListItem> = {};
  
  Object.entries(items).forEach(([key, value]) => {
    if (typeof value === 'string') {
      normalizedItems[key] = {
        key,
        label: value,
        removable: !defaultItems.includes(key),
        value: key,
        priority: 0
      };
    } else {
      normalizedItems[key] = {
        key,
        label: value.label,
        tooltip: value.tooltip,
        removable: value.removable !== false && !defaultItems.includes(key),
        value: value.value !== undefined ? value.value : key,
        category: value.category,
        priority: value.priority || 0,
        metadata: value.metadata || {}
      };
    }
  });

  // Get unique categories
  const categories = [...new Set(Object.values(normalizedItems).map(item => item.category).filter(Boolean))];

  // Validation effect
  useEffect(() => {
    if (validation.length > 0) {
      const result = validateSelection(selectedItems, normalizedItems, validation);
      setValidationResult(result);
      if (onValidationChange) {
        onValidationChange(result);
      }
    }
  }, [selectedItems, validation, onValidationChange]);

  // Sort items
  const sortItems = (items: ListItem[]): ListItem[] => {
    return [...items].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'label':
          comparison = a.label.localeCompare(b.label);
          break;
        case 'priority':
          comparison = (b.priority || 0) - (a.priority || 0);
          break;
        case 'category':
          comparison = (a.category || '').localeCompare(b.category || '');
          break;
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });
  };

  // Check if "all" item is selected
  const isAllSelected = allItemKey && selectedItems.includes(allItemKey);
  
  // Get available items (not selected, excluding "all" item if it exists)
  const availableItems: ListItem[] = Object.values(normalizedItems).filter(item => 
    !selectedItems.includes(item.key) && item.key !== allItemKey
  );
  
  // Get selected items data
  const selectedItemsData: ListItem[] = Object.values(normalizedItems).filter(item => 
    selectedItems.includes(item.key)
  );

  // Filter based on search and category
  const filteredAvailable: ListItem[] = sortItems(availableItems.filter(item => {
    const matchesSearch = item.label.toLowerCase().includes(availableSearch.toLowerCase());
    const matchesCategory = !selectedCategory || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }));
  
  const filteredSelected: ListItem[] = sortItems(selectedItemsData.filter(item =>
    item.label.toLowerCase().includes(selectedSearch.toLowerCase())
  ));

  const handleInclude = (itemKey: string): void => {
    if (disabled) return;
    
    const newSelection = [...selectedItems, itemKey];
    const values = extractValues(newSelection, normalizedItems, valueType);
    onSelectionChange(newSelection, values);
  };

  const handleExclude = (itemKey: string): void => {
    if (disabled) return;
    
    const item = normalizedItems[itemKey];
    if (!item || !item.removable) return;
    
    const newSelection = selectedItems.filter(key => key !== itemKey);
    const values = extractValues(newSelection, normalizedItems, valueType);
    onSelectionChange(newSelection, values);
  };

  const handleIncludeAll = (): void => {
    if (disabled) return;
    
    let newSelection: string[];
    
    if (allItemKey) {
      // If "all" item exists, select only that and default items
      newSelection = [allItemKey, ...defaultItems.filter(key => key !== allItemKey)];
    } else {
      // Otherwise, select all items
      newSelection = Object.keys(normalizedItems);
    }
    
    const values = extractValues(newSelection, normalizedItems, valueType);
    onSelectionChange(newSelection, values);
  };

  const handleExcludeAll = (): void => {
    if (disabled) return;
    
    // Keep only default items that cannot be removed
    const newSelection = defaultItems.slice();
    const values = extractValues(newSelection, normalizedItems, valueType);
    onSelectionChange(newSelection, values);
  };

  const renderItem = (item: ListItem): React.ReactNode => {
    if (itemRenderer) {
      return itemRenderer(item);
    }
    
    const content = (
      <div className={`px-3 py-2 text-sm flex items-center gap-2 ${!item.removable ? 'bg-blue-50' : ''}`}>
        <div className="flex-1">
          <span className={!item.removable ? 'font-medium text-blue-900' : ''}>{item.label}</span>
          {item.category && (
            <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {item.category}
            </span>
          )}
          {valueType !== 'string' && item.value !== item.key && (
            <div className="text-xs text-gray-500 mt-1">
              Value: {JSON.stringify(item.value)}
            </div>
          )}
        </div>
        {!item.removable && (
          <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">Required</span>
        )}
        {item.tooltip && (
          <Info className="w-3 h-3 text-gray-400 flex-shrink-0" />
        )}
      </div>
    );

    if (item.tooltip) {
      return (
        <Tooltip content={item.tooltip}>
          {content}
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <div className={`space-y-4 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Validation Display */}
      {showValidation && validation.length > 0 && (
        <div className="p-3 bg-gray-50 rounded-lg border">
          <ValidationDisplay validation={validationResult} />
        </div>
      )}

      {/* Category Filter */}
      {categoryFilter && categories.length > 0 && (
        <div className="flex gap-2 items-center">
          <label className="text-sm font-medium text-gray-700">Filter by category:</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex gap-4 w-full max-w-4xl">
        {/* Available Items */}
        <div className="flex-1 border rounded-lg bg-white">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-medium text-gray-900 mb-2">{availableTitle}</h3>
            {searchable && (
              <input
                type="text"
                placeholder="Search available..."
                value={availableSearch}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAvailableSearch(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>
          <div className={`overflow-y-auto ${height}`}>
            {/* Show "All" option if not selected and items are available */}
            {allItemKey && !isAllSelected && availableItems.length > 0 && (
              <div className="flex items-center justify-between hover:bg-gray-50 border-b bg-green-50">
                <div className="px-3 py-2 text-sm font-medium text-green-700 flex items-center gap-2">
                  <span>{allItemLabel}</span>
                  <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">Select All</span>
                </div>
                <div className="px-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleIncludeAll}
                    className="text-green-600 hover:text-green-700 hover:bg-green-100"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
            
            {filteredAvailable.length === 0 && (!allItemKey || isAllSelected) ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                {availableSearch || selectedCategory ? 'No items match your filters' : 'No available items'}
              </div>
            ) : (
              filteredAvailable.map((item) => (
                <div key={item.key} className="flex items-center justify-between hover:bg-gray-50 border-b last:border-b-0">
                  {renderItem(item)}
                  <div className="px-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleInclude(item.key)}
                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex flex-col justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleIncludeAll}
            disabled={availableItems.length === 0 && (!allItemKey || isAllSelected as boolean)}
            className="px-2"
            title={allItemKey ? `Select ${allItemLabel}` : 'Select All'}
          >
            <ChevronRight className="w-4 h-4" />
            <ChevronRight className="w-4 h-4 -ml-1" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExcludeAll}
            disabled={selectedItems.length === 0 || selectedItems.every(key => defaultItems.includes(key))}
            className="px-2"
            title="Remove All (except required)"
          >
            <ChevronLeft className="w-4 h-4" />
            <ChevronLeft className="w-4 h-4 -ml-1" />
          </Button>
        </div>

        {/* Selected Items */}
        <div className="flex-1 border rounded-lg bg-white">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-medium text-gray-900 mb-2">{selectedTitle}</h3>
            {searchable && (
              <input
                type="text"
                placeholder="Search selected..."
                value={selectedSearch}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedSearch(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>
          <div className={`overflow-y-auto ${height}`}>
            {filteredSelected.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                {selectedSearch ? 'No items match your search' : 'No selected items'}
              </div>
            ) : (
              filteredSelected.map((item) => (
                <div key={item.key} className="flex items-center justify-between hover:bg-gray-50 border-b last:border-b-0">
                  {renderItem(item)}
                  <div className="px-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleExclude(item.key)}
                      disabled={!item.removable}
                      className={`${item.removable ? 'text-red-600 hover:text-red-700 hover:bg-red-50' : 'text-gray-400 cursor-not-allowed'}`}
                      title={item.removable ? 'Remove item' : 'This item cannot be removed'}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default IncludeExcludeList;