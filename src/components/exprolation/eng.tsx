import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

type ValidationRule = {
  required?: string | boolean;
  minLength?: { value: number; message: string };
  maxLength?: { value: number; message: string };
  min?: { value: number; message: string };
  max?: { value: number; message: string };
  pattern?: { value: RegExp; message: string };
  validate?: (value: any, formValues: Record<string, any>) => boolean | string;
};

type VisibilityCondition = {
  field: string;
  op: 'equals' | 'in' | 'notEquals';
  value: any;
};

type FieldDefinition = {
  id: string;
  label: string;
  renderer: 'text' | 'textarea' | 'select' | 'multiselect' | 'checkbox' | 'radio' | 'switch' | 'date' | 'number';
  placeholder?: string;
  inputType?: string;
  defaultValue?: any;
  props?: Record<string, any>;
  rules?: ValidationRule;
  visibleWhen?: VisibilityCondition | VisibilityCondition[];
};

type LayoutNode = {
  kind: 'field' | 'grid' | 'stack' | 'section';
  fieldId?: string;
  title?: string;
  withDivider?: boolean;
  cols?: number;
  colSpan?: number;
  spacing?: 'sm' | 'md' | 'lg';
  children?: LayoutNode[];
};

type FormSchema = {
  id: string;
  meta: { title: string; subtitle?: string };
  fields: Record<string, FieldDefinition>;
  layout: LayoutNode[];
};

type FormContextType = {
  values: Record<string, any>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  schema: FormSchema;
  setValue: (fieldId: string, value: any) => void;
  setTouched: (fieldId: string) => void;
  validateField: (fieldId: string) => void;
};

const FormContext = createContext<FormContextType | null>(null);

const useFormContext = () => {
  const context = useContext(FormContext);
  if (!context) throw new Error('useFormContext must be used within FormProvider');
  return context;
};
``
const evaluateVisibility = (
  condition: VisibilityCondition | VisibilityCondition[] | undefined,
  formValues: Record<string, any>
): boolean => {
  // No condition = always visible
  if (!condition) return true;

  // Convert single condition to array for uniform processing
  const conditions = Array.isArray(condition) ? condition : [condition];

  // ALL conditions must be true (AND logic)
  return conditions.every(cond => {
    const fieldValue = formValues[cond.field];

    switch (cond.op) {
      case 'equals':
        // Direct equality check
        return fieldValue === cond.value;
      
      case 'notEquals':
        // Inverse equality check
        return fieldValue !== cond.value;
      
      case 'in':
        // Check if value exists in array
        return Array.isArray(cond.value) && cond.value.includes(fieldValue);
      
      default:
        // Unknown operator = default to visible
        return true;
    }
  });
};

// ================================================================
// VALIDATION ENGINE
// ================================================================
// Validates a single field value against its rules
// Returns error message string or null if valid

const validateField = (
  field: FieldDefinition,
  value: any,
  formValues: Record<string, any>
): string | null => {
  const rules = field.rules;
  if (!rules) return null;

  // Required validation
  if (rules.required) {
    const isEmpty = value === null || value === undefined || value === '' || 
                    (Array.isArray(value) && value.length === 0);
    if (isEmpty) {
      return typeof rules.required === 'string' ? rules.required : `${field.label} is required`;
    }
  }

  // Skip other validations if value is empty (only required matters for empty values)
  if (!value && value !== 0) return null;

  // String length validations
  if (rules.minLength && typeof value === 'string') {
    if (value.length < rules.minLength.value) {
      return rules.minLength.message;
    }
  }

  if (rules.maxLength && typeof value === 'string') {
    if (value.length > rules.maxLength.value) {
      return rules.maxLength.message;
    }
  }

  // Numeric validations
  if (rules.min !== undefined && typeof value === 'number') {
    if (value < rules.min.value) {
      return rules.min.message;
    }
  }

  if (rules.max !== undefined && typeof value === 'number') {
    if (value > rules.max.value) {
      return rules.max.message;
    }
  }

  // Regex pattern validation
  if (rules.pattern && typeof value === 'string') {
    if (!rules.pattern.value.test(value)) {
      return rules.pattern.message;
    }
  }

  // Custom validation function
  // Allows complex cross-field validation logic
  if (rules.validate) {
    const result = rules.validate(value, formValues);
    if (result !== true) {
      return typeof result === 'string' ? result : 'Validation failed';
    }
  }

  return null;
};

// ================================================================
// FORM PROVIDER
// ================================================================
// Manages all form state and provides it to children
// Handles: values, errors, touched state, validation

const FormProvider: React.FC<{ schema: FormSchema; children: React.ReactNode }> = ({ 
  schema, 
  children 
}) => {
  // STATE: Form field values (key-value pairs)
  const [values, setValues] = useState<Record<string, any>>(() => {
    // Initialize with default values from schema
    const initial: Record<string, any> = {};
    Object.keys(schema.fields).forEach(fieldId => {
      const field = schema.fields[fieldId];
      if (field.defaultValue !== undefined) {
        initial[fieldId] = field.defaultValue;
      }
    });
    return initial;
  });

  // STATE: Validation errors (fieldId -> error message)
  const [errors, setErrors] = useState<Record<string, string>>({});

  // STATE: Touched fields (fieldId -> boolean)
  // Used to show errors only after user interaction
  const [touched, setTouchedState] = useState<Record<string, boolean>>({});

  // ACTION: Update field value
  // useCallback prevents recreation on every render (performance optimization)
  const setValue = useCallback((fieldId: string, value: any) => {
    setValues(prev => ({ ...prev, [fieldId]: value }));
    
    // Clear error when value changes (instant feedback)
    setErrors(prev => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  }, []);

  const setTouched = useCallback((fieldId: string) => {
    setTouchedState(prev => ({ ...prev, [fieldId]: true }));
  }, []);


  const validateFieldCallback = useCallback((fieldId: string) => {
    const field = schema.fields[fieldId];
    if (!field) return;

    const error = validateField(field, values[fieldId], values);
    
    setErrors(prev => {
      const next = { ...prev };
      if (error) {
        next[fieldId] = error;
      } else {
        delete next[fieldId];
      }
      return next;
    });
  }, [schema.fields, values]);

  const contextValue = useMemo(() => ({
    values,
    errors,
    touched,
    schema,
    setValue,
    setTouched,
    validateField: validateFieldCallback
  }), [values, errors, touched, schema, setValue, setTouched, validateFieldCallback]);

  return (
    <FormContext.Provider value={contextValue}>
      {children}
    </FormContext.Provider>
  );
};


// TEXT INPUT RENDERER
const TextFieldRenderer: React.FC<{ field: FieldDefinition }> = ({ field }) => {
  const { values, errors, touched, setValue, setTouched, validateField } = useFormContext();
  
  const value = values[field.id] || '';
  const error = touched[field.id] ? errors[field.id] : undefined;

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
        {field.label}
        {field.rules?.required && <span style={{ color: 'red' }}> *</span>}
      </label>
      
      <input
        type={field.inputType || 'text'}
        value={value}
        placeholder={field.placeholder}
        onChange={(e) => setValue(field.id, e.target.value)}
        onBlur={() => {
          setTouched(field.id);
          validateField(field.id);
        }}
        style={{
          width: '100%',
          padding: '0.5rem',
          border: `1px solid ${error ? 'red' : '#ccc'}`,
          borderRadius: '4px',
          fontSize: '0.875rem'
        }}
      />
      
      {error && (
        <div style={{ color: 'red', fontSize: '0.75rem', marginTop: '0.25rem' }}>
          {error}
        </div>
      )}
    </div>
  );
};

// TEXTAREA RENDERER
const TextareaRenderer: React.FC<{ field: FieldDefinition }> = ({ field }) => {
  const { values, errors, touched, setValue, setTouched, validateField } = useFormContext();
  
  const value = values[field.id] || '';
  const error = touched[field.id] ? errors[field.id] : undefined;

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
        {field.label}
        {field.rules?.required && <span style={{ color: 'red' }}> *</span>}
      </label>
      
      <textarea
        value={value}
        placeholder={field.placeholder}
        rows={field.props?.minRows || 3}
        onChange={(e) => setValue(field.id, e.target.value)}
        onBlur={() => {
          setTouched(field.id);
          validateField(field.id);
        }}
        style={{
          width: '100%',
          padding: '0.5rem',
          border: `1px solid ${error ? 'red' : '#ccc'}`,
          borderRadius: '4px',
          fontSize: '0.875rem',
          fontFamily: 'inherit',
          resize: 'vertical'
        }}
      />
      
      {error && (
        <div style={{ color: 'red', fontSize: '0.75rem', marginTop: '0.25rem' }}>
          {error}
        </div>
      )}
    </div>
  );
};

// SELECT DROPDOWN RENDERER
const SelectRenderer: React.FC<{ field: FieldDefinition }> = ({ field }) => {
  const { values, errors, touched, setValue, setTouched, validateField } = useFormContext();
  
  const value = values[field.id] || '';
  const error = touched[field.id] ? errors[field.id] : undefined;
  const options = field.props?.data || [];

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
        {field.label}
        {field.rules?.required && <span style={{ color: 'red' }}> *</span>}
      </label>
      
      <select
        value={value}
        onChange={(e) => setValue(field.id, e.target.value)}
        onBlur={() => {
          setTouched(field.id);
          validateField(field.id);
        }}
        style={{
          width: '100%',
          padding: '0.5rem',
          border: `1px solid ${error ? 'red' : '#ccc'}`,
          borderRadius: '4px',
          fontSize: '0.875rem',
          backgroundColor: 'white'
        }}
      >
        <option value="">{field.placeholder || 'Select...'}</option>
        {options.map((option: any) => (
          <option 
            key={typeof option === 'string' ? option : option.value} 
            value={typeof option === 'string' ? option : option.value}
          >
            {typeof option === 'string' ? option : option.label}
          </option>
        ))}
      </select>
      
      {error && (
        <div style={{ color: 'red', fontSize: '0.75rem', marginTop: '0.25rem' }}>
          {error}
        </div>
      )}
    </div>
  );
};

// CHECKBOX RENDERER
const CheckboxRenderer: React.FC<{ field: FieldDefinition }> = ({ field }) => {
  const { values, errors, touched, setValue, setTouched, validateField } = useFormContext();
  
  const checked = values[field.id] || false;
  const error = touched[field.id] ? errors[field.id] : undefined;

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setValue(field.id, e.target.checked)}
          onBlur={() => {
            setTouched(field.id);
            validateField(field.id);
          }}
          style={{ marginRight: '0.5rem' }}
        />
        <span>
          {field.label}
          {field.rules?.required && <span style={{ color: 'red' }}> *</span>}
        </span>
      </label>
      
      {error && (
        <div style={{ color: 'red', fontSize: '0.75rem', marginTop: '0.25rem' }}>
          {error}
        </div>
      )}
    </div>
  );
};

// RADIO GROUP RENDERER
const RadioRenderer: React.FC<{ field: FieldDefinition }> = ({ field }) => {
  const { values, errors, touched, setValue, setTouched, validateField } = useFormContext();
  
  const value = values[field.id];
  const error = touched[field.id] ? errors[field.id] : undefined;
  const options = field.props?.options || [];

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
        {field.label}
        {field.rules?.required && <span style={{ color: 'red' }}> *</span>}
      </label>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {options.map((option: any) => (
          <label 
            key={option.value} 
            style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          >
            <input
              type="radio"
              name={field.id}
              value={option.value}
              checked={value === option.value}
              onChange={(e) => setValue(field.id, e.target.value)}
              onBlur={() => {
                setTouched(field.id);
                validateField(field.id);
              }}
              style={{ marginRight: '0.5rem' }}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      
      {error && (
        <div style={{ color: 'red', fontSize: '0.75rem', marginTop: '0.25rem' }}>
          {error}
        </div>
      )}
    </div>
  );
};

// NUMBER INPUT RENDERER
const NumberRenderer: React.FC<{ field: FieldDefinition }> = ({ field }) => {
  const { values, errors, touched, setValue, setTouched, validateField } = useFormContext();
  
  const value = values[field.id] ?? '';
  const error = touched[field.id] ? errors[field.id] : undefined;

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
        {field.label}
        {field.rules?.required && <span style={{ color: 'red' }}> *</span>}
      </label>
      
      <input
        type="number"
        value={value}
        min={field.props?.min}
        max={field.props?.max}
        step={field.props?.step}
        placeholder={field.placeholder}
        onChange={(e) => setValue(field.id, e.target.value ? Number(e.target.value) : '')}
        onBlur={() => {
          setTouched(field.id);
          validateField(field.id);
        }}
        style={{
          width: '100%',
          padding: '0.5rem',
          border: `1px solid ${error ? 'red' : '#ccc'}`,
          borderRadius: '4px',
          fontSize: '0.875rem'
        }}
      />
      
      {error && (
        <div style={{ color: 'red', fontSize: '0.75rem', marginTop: '0.25rem' }}>
          {error}
        </div>
      )}
    </div>
  );
};

const Field: React.FC<{ fieldId: string }> = ({ fieldId }) => {
  const { schema, values } = useFormContext();
  const field = schema.fields[fieldId];

  if (!field) {
    console.warn(`Field "${fieldId}" not found in schema`);
    return null;
  }

  const isVisible = evaluateVisibility(field.visibleWhen, values);
  if (!isVisible) return null;

  switch (field.renderer) {
    case 'text':
      return <TextFieldRenderer field={field} />;
    case 'textarea':
      return <TextareaRenderer field={field} />;
    case 'select':
      return <SelectRenderer field={field} />;
    case 'checkbox':
      return <CheckboxRenderer field={field} />;
    case 'radio':
      return <RadioRenderer field={field} />;
    case 'number':
      return <NumberRenderer field={field} />;
    default:
      return <div>Unsupported field type: {field.renderer}</div>;
  }
};


// GRID LAYOUT
const GridLayout: React.FC<{ node: LayoutNode }> = ({ node }) => {
  const cols = node.cols || 1;
  const spacing = node.spacing === 'sm' ? '0.5rem' : node.spacing === 'lg' ? '1.5rem' : '1rem';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: spacing
      }}
    >
      {node.children?.map((child, idx) => (
        <div
          key={idx}
          style={{
            gridColumn: child.colSpan ? `span ${child.colSpan}` : undefined
          }}
        >
          <LayoutNode node={child} />
        </div>
      ))}
    </div>
  );
};

// STACK LAYOUT
const StackLayout: React.FC<{ node: LayoutNode }> = ({ node }) => {
  const spacing = node.spacing === 'sm' ? '0.5rem' : node.spacing === 'lg' ? '1.5rem' : '1rem';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing }}>
      {node.children?.map((child, idx) => (
        <LayoutNode key={idx} node={child} />
      ))}
    </div>
  );
};

// SECTION LAYOUT
const SectionLayout: React.FC<{ node: LayoutNode }> = ({ node }) => {
  return (
    <div style={{ marginBottom: '2rem' }}>
      {node.title && (
        <h3 style={{ 
          fontSize: '1.125rem', 
          fontWeight: 600, 
          marginBottom: '1rem',
          color: '#1a1a1a'
        }}>
          {node.title}
        </h3>
      )}
      {node.withDivider && (
        <hr style={{ 
          border: 'none', 
          borderTop: '1px solid #e5e5e5', 
          marginBottom: '1rem' 
        }} />
      )}
      {node.children?.map((child, idx) => (
        <LayoutNode key={idx} node={child} />
      ))}
    </div>
  );
};

const LayoutNode: React.FC<{ node: LayoutNode }> = ({ node }) => {
  switch (node.kind) {
    case 'field':
      return node.fieldId ? <Field fieldId={node.fieldId} /> : null;
    case 'grid':
      return <GridLayout node={node} />;
    case 'stack':
      return <StackLayout node={node} />;
    case 'section':
      return <SectionLayout node={node} />;
    default:
      return null;
  }
};

const DynamicForm: React.FC<{ schema: FormSchema }> = ({ schema }) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted!');
  };

  return (
    <FormProvider schema={schema}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
        {/* Form Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            {schema.meta.title}
          </h1>
          {schema.meta.subtitle && (
            <p style={{ color: '#666', fontSize: '0.875rem' }}>
              {schema.meta.subtitle}
            </p>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          {schema.layout.map((node, idx) => (
            <LayoutNode key={idx} node={node} />
          ))}

          {/* Submit Button */}
          <div style={{ marginTop: '2rem' }}>
            <button
              type="submit"
              style={{
                backgroundColor: '#2563eb',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </FormProvider>
  );
};


const DEMO_SCHEMA: FormSchema = {
  id: "demo-form",
  meta: {
    title: "Dynamic Form Demo",
    subtitle: "Testing conditional fields and validation"
  },
  fields: {
    accountType: {
      id: "accountType",
      label: "Account Type",
      renderer: "radio",
      defaultValue: "personal",
      props: {
        options: [
          { label: "Personal", value: "personal" },
          { label: "Business", value: "business" }
        ]
      },
      rules: { required: "Required" }
    },
    companyName: {
      id: "companyName",
      label: "Company Name",
      renderer: "text",
      visibleWhen: {
        field: "accountType",
        op: "equals",
        value: "business"
      },
      rules: { required: "Company name required for business accounts" }
    },
    email: {
      id: "email",
      label: "Email",
      renderer: "text",
      inputType: "email",
      rules: {
        required: "Email required",
        pattern: {
          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
          message: "Invalid email"
        }
      }
    },
    age: {
      id: "age",
      label: "Age",
      renderer: "number",
      props: { min: 18, max: 100 },
      rules: {
        required: "Age required",
        min: { value: 18, message: "Must be 18+" }
      }
    },
    terms: {
      id: "terms",
      label: "I agree to terms",
      renderer: "checkbox",
      rules: { required: "You must agree" }
    }
  },
  layout: [
    {
      kind: "section",
      title: "Account Details",
      withDivider: true,
      children: [
        {
          kind: "stack",
          spacing: "md",
          children: [
            { kind: "field", fieldId: "accountType" },
            { kind: "field", fieldId: "companyName" }
          ]
        }
      ]
    },
    {
      kind: "section",
      title: "Personal Info",
      withDivider: true,
      children: [
        {
          kind: "grid",
          cols: 2,
          spacing: "md",
          children: [
            { kind: "field", fieldId: "email" },
            { kind: "field", fieldId: "age" }
          ]
        }
      ]
    },
    {
      kind: "stack",
      spacing: "md",
      children: [
        { kind: "field", fieldId: "terms" }
      ]
    }
  ]
};

export default function App() {
  return <DynamicForm schema={DEMO_SCHEMA} />;
}