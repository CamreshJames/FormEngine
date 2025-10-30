// ================================================================
// PURE TYPESCRIPT FORM ENGINE
// ================================================================
// Framework-agnostic - can be used with React, Vue, Svelte, Angular, etc.
// The framework layer will subscribe to state changes and render accordingly

// ================================================================
// TYPE DEFINITIONS
// ================================================================

export type ValidationRule = {
  required?: string | boolean;
  minLength?: { value: number; message: string };
  maxLength?: { value: number; message: string };
  min?: { value: number; message: string };
  max?: { value: number; message: string };
  pattern?: { value: RegExp; message: string };
  validate?: (value: any, formValues: Record<string, any>) => boolean | string;
};

export type VisibilityCondition = {
  field: string;
  op: 'equals' | 'in' | 'notEquals' | 'greaterThan' | 'lessThan';
  value: any;
};

export type FieldDefinition = {
  id: string;
  label: string;
  renderer: 'text' | 'textarea' | 'select' | 'multiselect' | 'checkbox' | 'radio' | 'switch' | 'date' | 'number';
  placeholder?: string;
  inputType?: string;
  defaultValue?: any;
  props?: Record<string, any>;
  rules?: ValidationRule;
  visibleWhen?: VisibilityCondition | VisibilityCondition[];
  enabledWhen?: VisibilityCondition | VisibilityCondition[];
};

export type LayoutNode = {
  kind: 'field' | 'grid' | 'stack' | 'section';
  fieldId?: string;
  title?: string;
  withDivider?: boolean;
  cols?: number;
  colSpan?: number;
  spacing?: 'sm' | 'md' | 'lg';
  children?: LayoutNode[];
  collapsible?: boolean;
};

export type FormSchema = {
  id: string;
  meta: { 
    title: string; 
    subtitle?: string;
    description?: string;
  };
  fields: Record<string, FieldDefinition>;
  layout: LayoutNode[];
};

export type FormState = {
  values: Record<string, any>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValidating: boolean;
  submitCount: number;
};

export type FormMeta = {
  isDirty: boolean;
  isValid: boolean;
  touchedFields: string[];
  errorFields: string[];
  visibleFields: string[];
  enabledFields: string[];
};

// ================================================================
// VISIBILITY & ENABLEMENT EVALUATION ENGINE
// ================================================================
// Pure function - no side effects
// Can be called from any framework's reactive system

export function evaluateCondition(
  condition: VisibilityCondition | VisibilityCondition[] | undefined,
  formValues: Record<string, any>
): boolean {
  // No condition = always true (visible/enabled)
  if (!condition) return true;

  // Normalize to array for uniform processing
  const conditions = Array.isArray(condition) ? condition : [condition];

  // ALL conditions must pass (AND logic)
  return conditions.every(cond => {
    const fieldValue = formValues[cond.field];

    switch (cond.op) {
      case 'equals':
        return fieldValue === cond.value;
      
      case 'notEquals':
        return fieldValue !== cond.value;
      
      case 'in':
        return Array.isArray(cond.value) && cond.value.includes(fieldValue);
      
      case 'greaterThan':
        return typeof fieldValue === 'number' && fieldValue > cond.value;
      
      case 'lessThan':
        return typeof fieldValue === 'number' && fieldValue < cond.value;
      
      default:
        console.warn(`Unknown operator: ${cond.op}`);
        return true;
    }
  });
}

// ================================================================
// VALIDATION ENGINE
// ================================================================
// Pure function - validates a single field

export function validateField(
  field: FieldDefinition,
  value: any,
  formValues: Record<string, any>
): string | null {
  const rules = field.rules;
  if (!rules) return null;

  // Check if field is visible - hidden fields should not be validated
  if (field.visibleWhen && !evaluateCondition(field.visibleWhen, formValues)) {
    return null;
  }

  // RULE: Required
  if (rules.required) {
    const isEmpty = 
      value === null || 
      value === undefined || 
      value === '' || 
      (Array.isArray(value) && value.length === 0) ||
      (typeof value === 'string' && value.trim() === '');
    
    if (isEmpty) {
      return typeof rules.required === 'string' 
        ? rules.required 
        : `${field.label} is required`;
    }
  }

  // Skip remaining validations if value is empty
  if (value === null || value === undefined || value === '') {
    return null;
  }

  // RULE: String length - minimum
  if (rules.minLength && typeof value === 'string') {
    if (value.length < rules.minLength.value) {
      return rules.minLength.message;
    }
  }

  // RULE: String length - maximum
  if (rules.maxLength && typeof value === 'string') {
    if (value.length > rules.maxLength.value) {
      return rules.maxLength.message;
    }
  }

  // RULE: Numeric - minimum
  if (rules.min !== undefined && typeof value === 'number') {
    if (value < rules.min.value) {
      return rules.min.message;
    }
  }

  // RULE: Numeric - maximum
  if (rules.max !== undefined && typeof value === 'number') {
    if (value > rules.max.value) {
      return rules.max.message;
    }
  }

  // RULE: Pattern (regex)
  if (rules.pattern) {
    const stringValue = String(value);
    if (!rules.pattern.value.test(stringValue)) {
      return rules.pattern.message;
    }
  }

  // RULE: Custom validation function
  if (rules.validate) {
    const result = rules.validate(value, formValues);
    if (result !== true) {
      return typeof result === 'string' ? result : 'Validation failed';
    }
  }

  return null;
}

// ================================================================
// FORM ENGINE CLASS
// ================================================================
// This is the core state machine
// Frameworks will wrap this and subscribe to changes

export class FormEngine {
  private schema: FormSchema;
  private state: FormState;
  private subscribers: Set<(state: FormState, meta: FormMeta) => void>;
  private initialValues: Record<string, any>;

  constructor(schema: FormSchema, initialValues?: Record<string, any>) {
    this.schema = schema;
    this.subscribers = new Set();
    
    // Initialize default values from schema
    this.initialValues = this.getDefaultValues();
    
    // Override with provided initial values
    if (initialValues) {
      this.initialValues = { ...this.initialValues, ...initialValues };
    }

    // Initialize state
    this.state = {
      values: { ...this.initialValues },
      errors: {},
      touched: {},
      isSubmitting: false,
      isValidating: false,
      submitCount: 0,
    };
  }

  // ================================================================
  // INITIALIZATION
  // ================================================================

  private getDefaultValues(): Record<string, any> {
    const values: Record<string, any> = {};
    
    Object.keys(this.schema.fields).forEach(fieldId => {
      const field = this.schema.fields[fieldId];
      if (field.defaultValue !== undefined) {
        values[fieldId] = field.defaultValue;
      }
    });

    return values;
  }

  // ================================================================
  // SUBSCRIPTION SYSTEM
  // ================================================================
  // Allows frameworks to listen to state changes

  subscribe(callback: (state: FormState, meta: FormMeta) => void): () => void {
    this.subscribers.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notify(): void {
    const meta = this.getMeta();
    this.subscribers.forEach(callback => {
      callback({ ...this.state }, meta);
    });
  }

  // ================================================================
  // STATE GETTERS
  // ================================================================

  getState(): FormState {
    return { ...this.state };
  }

  getValues(): Record<string, any> {
    return { ...this.state.values };
  }

  getValue(fieldId: string): any {
    return this.state.values[fieldId];
  }

  getError(fieldId: string): string | undefined {
    return this.state.errors[fieldId];
  }

  getErrors(): Record<string, string> {
    return { ...this.state.errors };
  }

  isTouched(fieldId: string): boolean {
    return this.state.touched[fieldId] || false;
  }

  getSchema(): FormSchema {
    return this.schema;
  }

  getField(fieldId: string): FieldDefinition | undefined {
    return this.schema.fields[fieldId];
  }

  // ================================================================
  // COMPUTED METADATA
  // ================================================================

  getMeta(): FormMeta {
    const visibleFields = this.getVisibleFields();
    const enabledFields = this.getEnabledFields();
    const errorFields = Object.keys(this.state.errors);
    const touchedFields = Object.keys(this.state.touched).filter(k => this.state.touched[k]);

    return {
      isDirty: this.isDirty(),
      isValid: errorFields.length === 0,
      touchedFields,
      errorFields,
      visibleFields,
      enabledFields,
    };
  }

  isDirty(): boolean {
    return JSON.stringify(this.state.values) !== JSON.stringify(this.initialValues);
  }

  isFieldVisible(fieldId: string): boolean {
    const field = this.schema.fields[fieldId];
    if (!field) return false;
    return evaluateCondition(field.visibleWhen, this.state.values);
  }

  isFieldEnabled(fieldId: string): boolean {
    const field = this.schema.fields[fieldId];
    if (!field) return false;
    return evaluateCondition(field.enabledWhen, this.state.values);
  }

  getVisibleFields(): string[] {
    return Object.keys(this.schema.fields).filter(fieldId => 
      this.isFieldVisible(fieldId)
    );
  }

  getEnabledFields(): string[] {
    return Object.keys(this.schema.fields).filter(fieldId => 
      this.isFieldEnabled(fieldId)
    );
  }

  // ================================================================
  // STATE MUTATIONS
  // ================================================================

  setValue(fieldId: string, value: any): void {
    // Update value
    this.state.values[fieldId] = value;

    // Clear error for this field (instant feedback)
    delete this.state.errors[fieldId];

    // Re-validate dependent fields
    this.revalidateDependentFields(fieldId);

    this.notify();
  }

  setValues(values: Record<string, any>): void {
    Object.keys(values).forEach(fieldId => {
      this.state.values[fieldId] = values[fieldId];
    });

    // Clear all errors
    this.state.errors = {};

    this.notify();
  }

  setTouched(fieldId: string, touched = true): void {
    this.state.touched[fieldId] = touched;
    this.notify();
  }

  setTouchedMultiple(fieldIds: string[]): void {
    fieldIds.forEach(fieldId => {
      this.state.touched[fieldId] = true;
    });
    this.notify();
  }

  setError(fieldId: string, error: string | null): void {
    if (error) {
      this.state.errors[fieldId] = error;
    } else {
      delete this.state.errors[fieldId];
    }
    this.notify();
  }

  // ================================================================
  // VALIDATION
  // ================================================================

  validateSingleField(fieldId: string): boolean {
    const field = this.schema.fields[fieldId];
    if (!field) return true;

    const value = this.state.values[fieldId];
    const error = validateField(field, value, this.state.values);

    if (error) {
      this.state.errors[fieldId] = error;
      this.notify();
      return false;
    } else {
      delete this.state.errors[fieldId];
      this.notify();
      return true;
    }
  }

  validateAllFields(): boolean {
    this.state.isValidating = true;
    this.notify();

    const newErrors: Record<string, string> = {};
    const visibleFields = this.getVisibleFields();

    visibleFields.forEach(fieldId => {
      const field = this.schema.fields[fieldId];
      const value = this.state.values[fieldId];
      const error = validateField(field, value, this.state.values);

      if (error) {
        newErrors[fieldId] = error;
      }
    });

    this.state.errors = newErrors;
    this.state.isValidating = false;
    this.notify();

    return Object.keys(newErrors).length === 0;
  }

  private revalidateDependentFields(changedFieldId: string): void {
    // Find fields that have visibility/enablement conditions depending on this field
    Object.keys(this.schema.fields).forEach(fieldId => {
      const field = this.schema.fields[fieldId];
      
      const hasDependency = this.fieldDependsOn(field, changedFieldId);
      
      if (hasDependency && this.state.touched[fieldId]) {
        // Re-validate this field since its dependency changed
        this.validateSingleField(fieldId);
      }
    });
  }

  private fieldDependsOn(field: FieldDefinition, targetFieldId: string): boolean {
    const checkCondition = (condition?: VisibilityCondition | VisibilityCondition[]) => {
      if (!condition) return false;
      const conditions = Array.isArray(condition) ? condition : [condition];
      return conditions.some(c => c.field === targetFieldId);
    };

    return checkCondition(field.visibleWhen) || 
           checkCondition(field.enabledWhen);
  }

  // ================================================================
  // FORM SUBMISSION
  // ================================================================

  async handleSubmit(
    onSubmit: (values: Record<string, any>) => void | Promise<void>
  ): Promise<boolean> {
    this.state.isSubmitting = true;
    this.state.submitCount++;
    this.notify();

    // Mark all visible fields as touched
    const visibleFields = this.getVisibleFields();
    visibleFields.forEach(fieldId => {
      this.state.touched[fieldId] = true;
    });

    // Validate all fields
    const isValid = this.validateAllFields();

    if (!isValid) {
      this.state.isSubmitting = false;
      this.notify();
      return false;
    }

    try {
      // Get only visible field values
      const submittableValues: Record<string, any> = {};
      visibleFields.forEach(fieldId => {
        submittableValues[fieldId] = this.state.values[fieldId];
      });

      await onSubmit(submittableValues);
      
      this.state.isSubmitting = false;
      this.notify();
      return true;
    } catch (error) {
      this.state.isSubmitting = false;
      this.notify();
      throw error;
    }
  }

  // ================================================================
  // UTILITY METHODS
  // ================================================================

  reset(): void {
    this.state = {
      values: { ...this.initialValues },
      errors: {},
      touched: {},
      isSubmitting: false,
      isValidating: false,
      submitCount: 0,
    };
    this.notify();
  }

  resetField(fieldId: string): void {
    this.state.values[fieldId] = this.initialValues[fieldId];
    delete this.state.errors[fieldId];
    delete this.state.touched[fieldId];
    this.notify();
  }

  setSchema(schema: FormSchema): void {
    this.schema = schema;
    this.initialValues = this.getDefaultValues();
    this.reset();
  }
}

// ================================================================
// LAYOUT UTILITIES
// ================================================================
// Pure functions for traversing and analyzing layout

export function* traverseLayout(layout: LayoutNode[]): Generator<LayoutNode> {
  for (const node of layout) {
    yield node;
    if (node.children) {
      yield* traverseLayout(node.children);
    }
  }
}

export function findLayoutNode(
  layout: LayoutNode[],
  predicate: (node: LayoutNode) => boolean
): LayoutNode | null {
  for (const node of traverseLayout(layout)) {
    if (predicate(node)) {
      return node;
    }
  }
  return null;
}

export function getFieldIds(layout: LayoutNode[]): string[] {
  const fieldIds: string[] = [];
  for (const node of traverseLayout(layout)) {
    if (node.kind === 'field' && node.fieldId) {
      fieldIds.push(node.fieldId);
    }
  }
  return fieldIds;
}

// ================================================================
// FACTORY FUNCTION
// ================================================================

export function createFormEngine(
  schema: FormSchema,
  initialValues?: Record<string, any>
): FormEngine {
  return new FormEngine(schema, initialValues);
}

// ================================================================
// EXAMPLE USAGE (FRAMEWORK AGNOSTIC)
// ================================================================

/*
// 1. Create an instance
const formEngine = createFormEngine(mySchema);

// 2. Subscribe to changes (React example)
useEffect(() => {
  const unsubscribe = formEngine.subscribe((state, meta) => {
    setFormState(state);
    setFormMeta(meta);
  });
  return unsubscribe;
}, []);

// 3. Use in your UI
<input 
  value={formEngine.getValue('email')}
  onChange={(e) => formEngine.setValue('email', e.target.value)}
  onBlur={() => {
    formEngine.setTouched('email');
    formEngine.validateSingleField('email');
  }}
/>

// 4. Submit
formEngine.handleSubmit((values) => {
  console.log('Submit:', values);
});

// Vue example:
const formState = ref(formEngine.getState());
formEngine.subscribe((state) => {
  formState.value = state;
});

// Svelte example:
const formState = writable(formEngine.getState());
formEngine.subscribe((state) => {
  formState.set(state);
});
*/