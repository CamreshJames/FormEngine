// FormEngine.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { FormSchema, FormValues, FormErrors, LayoutNode, FormField } from './types';
import * as Renderers from './FieldRenderers';
import { ErrorBoundary } from './ErrorBoundary';
import './FormEngine.css';

// Typed renderer registry to prevent runtime errors
const RendererRegistry = {
    text: Renderers.Text,
    textarea: Renderers.Textarea,
    select: Renderers.Select,
    multiselect: Renderers.Multiselect,
    radio: Renderers.Radio,
    checkbox: Renderers.Checkbox,
    switch: Renderers.Switch,
    number: Renderers.Number,
    date: Renderers.Date,
    file: Renderers.File,
} as const;

// Utility to check if value is empty
const isEmpty = (value: any) =>
    value === null || value === undefined || (typeof value === 'string' && value.trim() === '') || (Array.isArray(value) && value.length === 0);

// Validate a single field
const validateField = (field: FormField, value: any, formValues: FormValues): string | null => {
    const rules = field.rules;
    if (!rules) return null;
    if (rules.required && isEmpty(value)) return rules.required;
    if (isEmpty(value)) return null;

    if (typeof value === 'string') {
        if (rules.minLength && value.length < rules.minLength.value) return rules.minLength.message;
        if (rules.maxLength && value.length > rules.maxLength.value) return rules.maxLength.message;
        if (rules.pattern && !rules.pattern.value.test(value)) return rules.pattern.message;
    }
    if (typeof value === 'number') {
        if (rules.min && value < rules.min.value) return rules.min.message;
        if (rules.max && value > rules.max.value) return rules.max.message;
    }
    if (Array.isArray(value)) {
        if (rules.minLength && value.length < rules.minLength.value) return rules.minLength.message;
    }
    if (rules.validate) {
        const result = rules.validate(value, formValues);
        if (typeof result === 'string') return result;
        if (result === false) return 'Invalid';
    }
    return null;
};

// Check field visibility based on conditions (memoized per field)
const isVisible = (field: FormField, values: FormValues): boolean => {
    if (!field.visibleWhen) return true;
    const conditions = Array.isArray(field.visibleWhen) ? field.visibleWhen : [field.visibleWhen];
    return conditions.every(condition => {
        const fieldValue = values[condition.field];
        switch (condition.op) {
            case 'equals': return fieldValue === condition.value;
            case 'notEquals': return fieldValue !== condition.value;
            case 'in': return Array.isArray(condition.value) ? condition.value.includes(fieldValue) : false;
            case 'notIn': return Array.isArray(condition.value) ? !condition.value.includes(fieldValue) : true;
            default: return true;
        }
    });
};

// Validate entire form
const validateForm = (schema: FormSchema, values: FormValues): FormErrors => {
    const errors: FormErrors = {};
    Object.entries(schema.fields).forEach(([fieldId, field]) => {
        if (!isVisible(field, values)) return;
        const error = validateField(field, values[fieldId], values);
        if (error) errors[fieldId] = error;
    });
    return errors;
};

// Recursive renderer for layout nodes
const LayoutNodeRenderer: React.FC<{
    node: LayoutNode;
    schema: FormSchema;
    values: FormValues;
    errors: FormErrors;
    touched: Set<string>;
    onChange: (id: string, v: any) => void;
    onBlur: (id: string) => void;
}> = ({ node, schema, values, errors, touched, onChange, onBlur }) => {
    const spacing = node.spacing ?? 'md';
    const spacingClass = `spacing-${spacing}`;
    switch (node.kind) {
        case 'field': {
            if (!node.fieldId) return null;
            const field = schema.fields[node.fieldId];
            if (!field || !isVisible(field, values)) return null;

            const Renderer = RendererRegistry[field.renderer] as React.ComponentType<any>;
            if (!Renderer) {
                console.error(`Unknown renderer: ${field.renderer}`);
                return <div className="field-error">Unknown renderer: {field.renderer}</div>;
            }

            return (
                <div className="grid-item" style={{ gridColumn: node.colSpan ? `span ${node.colSpan}` : undefined }}>
                    <ErrorBoundary>
                        <Renderer
                            field={field}
                            value={values[node.fieldId]}
                            error={touched.has(node.fieldId) ? errors[node.fieldId] : undefined}
                            onChange={(newValue: any) => onChange(node.fieldId!, newValue)}
                            onBlur={() => onBlur(node.fieldId!)}
                        />
                    </ErrorBoundary>
                </div>
            );
        }

        case 'stack':
            return (
                <div className={`layout-stack ${spacingClass}`}>
                    {node.children?.map((child, index) => (
                        <LayoutNodeRenderer 
                            key={child.fieldId || `${child.kind}-${index}`} 
                            node={child} 
                            schema={schema} 
                            values={values} 
                            errors={errors}
                            touched={touched} 
                            onChange={onChange} 
                            onBlur={onBlur} 
                        />
                    ))}
                </div>
            );

        case 'grid':
            return (
                <div className={`layout-grid ${spacingClass}`} style={{ gridTemplateColumns: `repeat(${node.cols ?? 2}, 1fr)` }}>
                    {node.children?.map((child, index) => (
                        <LayoutNodeRenderer 
                            key={child.fieldId || `${child.kind}-${index}`} 
                            node={child} 
                            schema={schema} 
                            values={values} 
                            errors={errors}
                            touched={touched} 
                            onChange={onChange} 
                            onBlur={onBlur} 
                        />
                    ))}
                </div>
            );

        case 'section': {
            const [collapsed, setCollapsed] = useState(false);
            return (
                <section className="layout-section">
                    {node.title && (
                        <div className="section-header">
                            <h3 className="section-title">
                                {node.title}
                                {node.collapsible && (
                                    <button type="button" onClick={() => setCollapsed(!collapsed)} className="section-toggle">
                                        {collapsed ? '▶' : '▼'}
                                    </button>
                                )}
                            </h3>
                            {node.withDivider && <hr className="section-divider" />}
                        </div>
                    )}
                    {!collapsed && (
                        <div>
                            {node.children?.map((child, index) => (
                                <LayoutNodeRenderer 
                                    key={child.fieldId || `${child.kind}-${index}`} 
                                    node={child} 
                                    schema={schema} 
                                    values={values} 
                                    errors={errors}
                                    touched={touched} 
                                    onChange={onChange} 
                                    onBlur={onBlur} 
                                />
                            ))}
                        </div>
                    )}
                </section>
            );
        }

        default:
            return null;
    }
};

// FormEngine component props
interface Props {
    schema: FormSchema;
    initialValues?: FormValues;
    onSubmit?: (v: FormValues) => void;
    onChange?: (v: FormValues, e: FormErrors) => void;
    className?: string;
    primaryColor?: string;
    secondaryColor?: string;
}

// Main FormEngine component
export const FormEngine: React.FC<Props> = ({
    schema,
    initialValues = {},
    onSubmit,
    onChange,
    className = '',
    primaryColor,
    secondaryColor,
}) => {
    // Compute default values from schema
    const defaults = Object.entries(schema.fields).reduce((accumulator, [fieldId, field]) => {
        if (field.defaultValue !== undefined) accumulator[fieldId] = field.defaultValue;
        return accumulator;
    }, {} as FormValues);

    const [values, setValues] = useState<FormValues>({ ...defaults, ...initialValues });
    const [errors, setErrors] = useState<FormErrors>({});
    const [touched, setTouched] = useState<Set<string>>(new Set());
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    // Memoize visibility map to avoid O(n) calculations on every render
    const visibilityMap = useMemo(() => {
        const map = new Map<string, boolean>();
        Object.entries(schema.fields).forEach(([fieldId, field]) => {
            map.set(fieldId, isVisible(field, values));
        });
        return map;
    }, [schema.fields, values]);

    // Clear values for fields that are no longer visible (debounced)
    const clearHiddenFieldsTimeoutRef = useRef<number>(0);
    useEffect(() => {
        window.clearTimeout(clearHiddenFieldsTimeoutRef.current);
        clearHiddenFieldsTimeoutRef.current = window.setTimeout(() => {
            const newValues = { ...values };
            let hasChanges = false;

            Object.entries(schema.fields).forEach(([fieldId]) => {
                if (!visibilityMap.get(fieldId) && values[fieldId] !== undefined) {
                    delete newValues[fieldId];
                    hasChanges = true;
                }
            });

            if (hasChanges) {
                setValues(newValues);
            }
        }, 100); // Debounce to prevent rapid clearing

        return () => window.clearTimeout(clearHiddenFieldsTimeoutRef.current);
    }, [visibilityMap, values, schema.fields]);

    // Add formRef for theming
    const formRef = useRef<HTMLFormElement>(null);

    // Validate form on value or schema changes
    useEffect(() => {
        const formErrors = validateForm(schema, values);
        setErrors(formErrors);
        onChange?.(values, formErrors);
    }, [values, schema, onChange]);

    // Helper function to convert hex to RGB
    const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    };

    // Helper function to darken a color
    const darkenColor = (hex: string, amount: number = 20) => {
        const rgb = hexToRgb(hex);
        if (!rgb) return hex;

        const darken = (value: number) => Math.max(0, value - amount);
        const toHex = (value: number) => value.toString(16).padStart(2, '0');

        return `#${toHex(darken(rgb.r))}${toHex(darken(rgb.g))}${toHex(darken(rgb.b))}`;
    };

    // Apply class-based theming (no global pollution)
    useEffect(() => {
        if (!formRef.current) return;

        const formElement = formRef.current;
        const schemaPrimary = schema.meta.theme?.primaryColor;
        const schemaSecondary = schema.meta.theme?.secondaryColor;
        const finalPrimary = primaryColor || schemaPrimary;
        const finalSecondary = secondaryColor || schemaSecondary;

        // Remove any existing theme class
        formElement.classList.remove('form-themed');

        if (finalPrimary || finalSecondary) {
            formElement.classList.add('form-themed');
            
            if (finalPrimary) {
                const rgb = hexToRgb(finalPrimary);
                formElement.style.setProperty('--form-primary', finalPrimary);
                formElement.style.setProperty('--form-primary-hover', darkenColor(finalPrimary));
                formElement.style.setProperty('--form-border-focus', finalPrimary);

                if (rgb) {
                    formElement.style.setProperty('--form-primary-light', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`);
                }
            }
            if (finalSecondary) {
                const rgb = hexToRgb(finalSecondary);
                formElement.style.setProperty('--form-text-secondary', finalSecondary);

                if (rgb) {
                    formElement.style.setProperty('--form-bg-secondary', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.05)`);
                }
            }
        }

        // Cleanup function
        return () => {
            if (formElement) {
                formElement.classList.remove('form-themed');
                formElement.style.removeProperty('--form-primary');
                formElement.style.removeProperty('--form-primary-hover');
                formElement.style.removeProperty('--form-border-focus');
                formElement.style.removeProperty('--form-primary-light');
                formElement.style.removeProperty('--form-text-secondary');
                formElement.style.removeProperty('--form-bg-secondary');
            }
        };
    }, [primaryColor, secondaryColor, schema.meta.theme]);

    // Handle field change
    const handleChange = useCallback((fieldId: string, newValue: any) => {
        setValues(prevValues => ({ ...prevValues, [fieldId]: newValue }));
    }, []);

    // Handle field blur (mark touched)
    const handleBlur = useCallback((fieldId: string) => {
        setTouched(prevTouched => new Set(prevTouched).add(fieldId));
    }, []);

    // Handle form submit with loading state
    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (submitting) return; // Prevent double submission

        setSubmitting(true);
        const allIds = Object.keys(schema.fields);
        setTouched(new Set(allIds));
        const formErrors = validateForm(schema, values);
        setErrors(formErrors);

        if (Object.keys(formErrors).length === 0) {
            try {
                setSubmitError(null); // Clear previous errors
                await onSubmit?.(values);
            } catch (error) {
                console.error('Form submission error:', error);
                setSubmitError(error instanceof Error ? error.message : 'An error occurred during submission');
            }
        }
        setSubmitting(false);
    };

    const isValid = Object.keys(errors).length === 0;

    return (
        <form ref={formRef} onSubmit={handleSubmit} className={`form-engine ${className}`}>
            {schema.meta.title && (
                <header className="form-header">
                    <h2 className="form-title">{schema.meta.title}</h2>
                    {schema.meta.subtitle && <p className="form-subtitle">{schema.meta.subtitle}</p>}
                    {schema.meta.description && <p className="form-description">{schema.meta.description}</p>}
                </header>
            )}

            <div>
                {schema.layout.map((layoutNode, index) => (
                    <LayoutNodeRenderer
                        key={index}
                        node={layoutNode}
                        schema={schema}
                        values={values}
                        errors={errors}
                        touched={touched}
                        onChange={handleChange}
                        onBlur={handleBlur}
                    />
                ))}
            </div>

            {submitError && (
                <div className="form-submit-error" role="alert">
                    {submitError}
                </div>
            )}

            {onSubmit && (
                <footer className="form-footer">
                    <button
                        type="submit"
                        className="form-submit"
                        disabled={!isValid || submitting}
                        aria-live="polite"
                    >
                        {submitting ? 'Submitting...' : 'Submit'}
                    </button>
                    <p className="form-required-note">
                        <span className="required">*</span> Required fields
                    </p>
                </footer>
            )}
        </form>
    );
};