// FormEngine.tsx
import React, { useState, useEffect, useCallback } from 'react';
import type { FormSchema, FormValues, FormErrors, LayoutNode, FormField } from './types';
import * as Renderers from './FieldRenderers';
import './FormEngine.css';

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

// Check field visibility based on conditions
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

            const Renderer = (Renderers as any)[field.renderer.charAt(0).toUpperCase() + field.renderer.slice(1)];
            if (!Renderer) return <div>Unknown renderer: {field.renderer}</div>;

            return (
                <div className="grid-item" style={{ gridColumn: node.colSpan ? `span ${node.colSpan}` : undefined }}>
                    <Renderer
                        field={field}
                        value={values[node.fieldId]}
                        error={touched.has(node.fieldId) ? errors[node.fieldId] : undefined}
                        onChange={(newValue: any) => onChange(node.fieldId!, newValue)}
                        onBlur={() => onBlur(node.fieldId!)}
                    />
                </div>
            );
        }

        case 'stack':
            return (
                <div className={`layout-stack ${spacingClass}`}>
                    {node.children?.map((child, index) => (
                        <LayoutNodeRenderer key={index} node={child} schema={schema} values={values} errors={errors}
                            touched={touched} onChange={onChange} onBlur={onBlur} />
                    ))}
                </div>
            );

        case 'grid':
            return (
                <div className={`layout-grid ${spacingClass}`} style={{ gridTemplateColumns: `repeat(${node.cols ?? 2}, 1fr)` }}>
                    {node.children?.map((child, index) => (
                        <LayoutNodeRenderer key={index} node={child} schema={schema} values={values} errors={errors}
                            touched={touched} onChange={onChange} onBlur={onBlur} />
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
                                <LayoutNodeRenderer key={index} node={child} schema={schema} values={values} errors={errors}
                                    touched={touched} onChange={onChange} onBlur={onBlur} />
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
}

// Main FormEngine component
export const FormEngine: React.FC<Props> = ({
    schema,
    initialValues = {},
    onSubmit,
    onChange,
    className = '',
}) => {
    // Compute default values from schema
    const defaults = Object.entries(schema.fields).reduce((accumulator, [fieldId, field]) => {
        if (field.defaultValue !== undefined) accumulator[fieldId] = field.defaultValue;
        return accumulator;
    }, {} as FormValues);

    const [values, setValues] = useState<FormValues>({ ...defaults, ...initialValues });
    const [errors, setErrors] = useState<FormErrors>({});
    const [touched, setTouched] = useState<Set<string>>(new Set());

    // Validate form on value or schema changes
    useEffect(() => {
        const formErrors = validateForm(schema, values);
        setErrors(formErrors);
        onChange?.(values, formErrors);
    }, [values, schema, onChange]);

    // Handle field change
    const handleChange = useCallback((fieldId: string, newValue: any) => {
        setValues(prevValues => ({ ...prevValues, [fieldId]: newValue }));
    }, []);

    // Handle field blur (mark touched)
    const handleBlur = useCallback((fieldId: string) => {
        setTouched(prevTouched => new Set(prevTouched).add(fieldId));
    }, []);

    // Handle form submit
    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        const allIds = Object.keys(schema.fields);
        setTouched(new Set(allIds));
        const formErrors = validateForm(schema, values);
        setErrors(formErrors);
        if (Object.keys(formErrors).length === 0) onSubmit?.(values);
    };

    const isValid = Object.keys(errors).length === 0;

    return (
        <form onSubmit={handleSubmit} className={`form-engine ${className}`}>
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

            {onSubmit && (
                <footer className="form-footer">
                    <button type="submit" className="form-submit" disabled={!isValid}>Submit</button>
                    <p className="form-required-note">
                        <span className="required">*</span> Required fields
                    </p>
                </footer>
            )}
        </form>
    );
};