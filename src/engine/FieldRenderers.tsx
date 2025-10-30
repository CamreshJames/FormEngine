// FieldRenderers.tsx
import React, { useState, useRef, useEffect } from 'react';
import type { FormField } from './types';

// Base wrapper for fields with label and error display
interface BaseProps {
    field: FormField;
    error?: string;
    children: React.ReactNode;
}
const Base = ({ field, error, children }: BaseProps) => (
    <div className="field-container">
        <label className="field-label">
            {field.label}
            {field.rules?.required && <span className="required">*</span>}
        </label>
        {children}
        {error && <div className="field-error">{error}</div>}
    </div>
);

// Generic props for renderers
type RendererProps<T = any> = {
    field: FormField;
    value: T;
    error?: string;
    onChange: (v: T) => void;
    onBlur?: () => void;
};

// Text input renderer
export const Text = ({ field, value, error, onChange, onBlur }: RendererProps<string>) => (
    <Base field={field} error={error}>
        <input
            type={field.inputType || 'text'}
            value={value ?? ''}
            onChange={e => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={field.placeholder}
            className={error ? 'text-input error' : 'text-input'}
        />
    </Base>
);

// Textarea renderer
export const Textarea = ({ field, value, error, onChange, onBlur }: RendererProps<string>) => {
    const rows = field.props?.minRows ?? 3;
    return (
        <Base field={field} error={error}>
            <textarea
                value={value ?? ''}
                onChange={e => onChange(e.target.value)}
                onBlur={onBlur}
                rows={rows}
                placeholder={field.placeholder}
                className={error ? 'textarea-input error' : 'textarea-input'}
            />
        </Base>
    );
};

// Select renderer with dropdown
export const Select = ({ field, value, error, onChange, onBlur }: {
    field: FormField; value: any; error?: string;
    onChange: (v: any) => void; onBlur?: () => void;
}) => {
    const options = (field.props?.data ?? []).map(o =>
        typeof o === 'string' ? { label: o, value: o } : o
    );
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClose = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
        };
        if (open) document.addEventListener('mousedown', handleClose);
        return () => document.removeEventListener('mousedown', handleClose);
    }, [open]);

    const selectedLabel = options.find(o => o.value === value)?.label ?? field.placeholder ?? 'Select…';

    return (
        <Base field={field} error={error}>
            <div ref={ref} className="select-container">
                <div className="select-trigger" onClick={() => setOpen(!open)}>
                    <span className={value ? 'selected' : 'placeholder'}>{selectedLabel}</span>
                    <span className={open ? 'select-arrow open' : 'select-arrow'}>▼</span>
                </div>
                {open && (
                    <div className="select-dropdown">
                        {options.map((option, index) => (
                            <div
                                key={index}
                                className={`select-option ${option.value === value ? 'selected' : ''}`}
                                onClick={() => { onChange(option.value); setOpen(false); onBlur?.(); }}
                            >
                                {option.label}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Base>
    );
};

// Checkbox renderer
export const Checkbox = ({ field, value, error, onChange, onBlur }: RendererProps<boolean>) => (
    <div className="field-container">
        <label className="checkbox-container">
            <input
                type="checkbox"
                checked={!!value}
                onChange={e => onChange(e.target.checked)}
                onBlur={onBlur}
            />
            <span className="checkbox-label">
                {field.label}
                {field.rules?.required && <span className="required">*</span>}
            </span>
        </label>
        {error && <div className="field-error">{error}</div>}
    </div>
);

// Radio group renderer
export const Radio = ({ field, value, error, onChange, onBlur }: RendererProps<any>) => {
    const options = field.props?.options ?? [];
    return (
        <Base field={field} error={error}>
            <div className="radio-group">
                {options.map((option: any, index: number) => (
                    <label key={index} className="radio-option">
                        <input
                            type="radio"
                            name={field.id}
                            value={option.value}
                            checked={value === option.value}
                            onChange={() => onChange(option.value)}
                            onBlur={onBlur}
                        />
                        <span className="radio-label">{option.label}</span>
                    </label>
                ))}
            </div>
        </Base>
    );
};

// Switch renderer
export const Switch = ({ field, value, error, onChange, onBlur }: RendererProps<boolean>) => (
    <Base field={field} error={error}>
        <label className="switch-container">
            <input
                type="checkbox"
                className="switch-input"
                checked={!!value}
                onChange={e => onChange(e.target.checked)}
                onBlur={onBlur}
            />
            <span className="switch-slider" />
        </label>
    </Base>
);

// Number input renderer
export const Number = ({ field, value, error, onChange, onBlur }: RendererProps<number>) => {
    const { min, max, step } = field.props ?? {};
    return (
        <Base field={field} error={error}>
            <input
                type="number"
                value={value ?? ''}
                min={min}
                max={max}
                step={step}
                onChange={e => onChange(parseFloat(e.target.value) || 0)}
                onBlur={onBlur}
                placeholder={field.placeholder}
                className={error ? 'number-input error' : 'number-input'}
            />
        </Base>
    );
};

// Date input renderer
export const Date = ({ field, value, error, onChange, onBlur }: RendererProps<string>) => {
    const { minDate, maxDate } = field.props ?? {};
    const min = minDate?.toISOString().split('T')[0];
    const max = maxDate?.toISOString().split('T')[0];
    return (
        <Base field={field} error={error}>
            <input
                type="date"
                value={value ?? ''}
                min={min}
                max={max}
                onChange={e => onChange(e.target.value)}
                onBlur={onBlur}
                className={error ? 'date-input error' : 'date-input'}
            />
        </Base>
    );
};

// File input renderer with hidden input and custom UI
export const File = ({ field, value, error, onChange, onBlur }: RendererProps<File | null>) => {
    const ref = useRef<HTMLInputElement>(null);
    const { accept, maxSize } = field.props ?? {};

    const handleFileChange = (file: File | null) => {
        if (file && maxSize && file.size > maxSize) return; // Ignore if oversized
        onChange(file);
    };

    return (
        <Base field={field} error={error}>
            <input
                ref={ref}
                type="file"
                accept={accept}
                onChange={e => handleFileChange(e.target.files?.[0] ?? null)}
                onBlur={onBlur}
                className="file-input-hidden"
            />
            {!value ? (
                <label className={error ? 'file-input-label error' : 'file-input-label'} onClick={() => ref.current?.click()}>
                    <span className="file-input-text">Choose file…</span>
                    <span className="file-input-button">Browse</span>
                </label>
            ) : (
                <div className={error ? 'file-selected error' : 'file-selected'}>
                    <div className="file-info">
                        <span className="file-name">{value.name}</span>
                        <span className="file-size">{(value.size / 1024).toFixed(2)} KB</span>
                    </div>
                    <button
                        type="button"
                        className="file-remove"
                        onClick={() => { onChange(null); if (ref.current) ref.current.value = ''; }}
                        aria-label="Remove file"
                    >
                        Remove
                    </button>
                </div>
            )}
        </Base>
    );
};

// Multiselect renderer
export const Multiselect = ({ field, value = [], error, onChange }: RendererProps<any[]>) => {
    const options = (field.props?.data ?? []).map(o =>
        typeof o === 'string' ? { label: o, value: o } : o
    );
    const toggleValue = (val: any) => {
        onChange(value.includes(val) ? value.filter(x => x !== val) : [...value, val]);
    };
    return (
        <Base field={field} error={error}>
            <div className="multiselect-container">
                <div className="multiselect-options">
                    {options.map((option, index) => (
                        <label key={index} className="multiselect-option">
                            <input
                                type="checkbox"
                                checked={value.includes(option.value)}
                                onChange={() => toggleValue(option.value)}
                            />
                            {option.label}
                        </label>
                    ))}
                </div>
            </div>
        </Base>
    );
};