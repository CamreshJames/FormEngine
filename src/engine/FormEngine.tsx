import React, { useState, useEffect, useCallback } from 'react';
import type { FormSchema, FormValues, FormErrors, FormField } from './types';
import * as Renderers from './FieldRenderers';
import './FormEngine.css';


const isEmpty = (v: any) =>
    v === null || v === undefined || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0);

const validateField = (field: FormField, value: any, all: FormValues): string | null => {
    const r = field.rules;
    if (!r) return null;
    if (r.required && isEmpty(value)) return r.required;
    if (isEmpty(value)) return null;

    if (typeof value === 'string') {
        if (r.minLength && value.length < r.minLength.value) return r.minLength.message;
        if (r.maxLength && value.length > r.maxLength.value) return r.maxLength.message;
        if (r.pattern && !r.pattern.value.test(value)) return r.pattern.message;
    }
    if (typeof value === 'number') {
        if (r.min && value < r.min.value) return r.min.message;
        if (r.max && value > r.max.value) return r.max.message;
    }
    if (Array.isArray(value)) {
        if (r.minLength && value.length < r.minLength.value) return r.minLength.message;
    }
    if (r.validate) {
        const res = r.validate(value, all);
        if (typeof res === 'string') return res;
        if (res === false) return 'Invalid';
    }
    return null;
};

const isVisible = (field: FormField, values: FormValues): boolean => {
    if (!field.visibleWhen) return true;
    const conds = Array.isArray(field.visibleWhen) ? field.visibleWhen : [field.visibleWhen];
    return conds.every(c => {
        const fv = values[c.field];
        switch (c.op) {
            case 'equals': return fv === c.value;
            case 'notEquals': return fv !== c.value;
            case 'in': return Array.isArray(c.value) ? c.value.includes(fv) : false;
            case 'notIn': return Array.isArray(c.value) ? !c.value.includes(fv) : true;
            default: return true;
        }
    });
};


const validateForm = (schema: FormSchema, values: FormValues): FormErrors => {
    const err: FormErrors = {};
    Object.entries(schema.fields).forEach(([id, f]) => {
        if (!isVisible(f, values)) return;
        const e = validateField(f, values[id], values);
        if (e) err[id] = e;
    });
    return err;
};

interface Props {
    schema: FormSchema;
    initialValues?: FormValues;
    onSubmit?: (v: FormValues) => void;
    onChange?: (v: FormValues, e: FormErrors) => void;
    className?: string;
}

export const FormEngine: React.FC<Props> = ({
    schema,
    initialValues = {},
    onSubmit,
    onChange,
    className = '',
}) => {
    // Initialize default values from schema
    const defaults = Object.entries(schema.fields).reduce((acc, [id, f]) => {
        if (f.defaultValue !== undefined) acc[id] = f.defaultValue;
        return acc;
    }, {} as FormValues);

    const [values, setValues] = useState<FormValues>({ ...defaults, ...initialValues });
    const [errors, setErrors] = useState<FormErrors>({});
    const [touched, setTouched] = useState<Set<string>>(new Set());

    // Validate on value changes
    useEffect(() => {
        const err = validateForm(schema, values);
        setErrors(err);
        onChange?.(values, err);
    }, [values, schema, onChange]);

    // Handle field value change
    const handleChange = useCallback((id: string, v: any) => {
        setValues(p => ({ ...p, [id]: v }));
    }, []);

    // Handle field blur (mark as touched)
    const handleBlur = useCallback((id: string) => {
        setTouched(s => new Set(s).add(id));
    }, []);

    // Handle form submission
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const allIds = Object.keys(schema.fields);
        setTouched(new Set(allIds));
        const err = validateForm(schema, values);
        setErrors(err);
        if (Object.keys(err).length === 0) onSubmit?.(values);
    };

    const valid = Object.keys(errors).length === 0;

    return (
        <form onSubmit={handleSubmit} className={`fe ${className}`}>
            {schema.meta.title && (
                <header className="head">
                    <h2>{schema.meta.title}</h2>
                    {schema.meta.subtitle && <p>{schema.meta.subtitle}</p>}
                </header>
            )}

            <div className="body stack sp-md">
                {Object.entries(schema.fields).map(([id, f]) => {
                    if (!isVisible(f, values)) return null;

                    const Renderer = (Renderers as any)[f.renderer.charAt(0).toUpperCase() + f.renderer.slice(1)];
                    if (!Renderer) return <div key={id}>Unknown renderer: {f.renderer}</div>;

                    return (
                        <Renderer
                            key={id}
                            field={f}
                            value={values[id]}
                            error={touched.has(id) ? errors[id] : undefined}
                            onChange={(v: any) => handleChange(id, v)}
                            onBlur={() => handleBlur(id)}
                        />
                    );
                })}
            </div>

            {onSubmit && (
                <footer className="foot">
                    <button type="submit" disabled={!valid}>Submit</button>
                </footer>
            )}
        </form>
    );
};