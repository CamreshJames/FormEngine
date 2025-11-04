// FieldRenderers.tsx
import React, { useState, useRef, useEffect } from 'react';
import type { FormField } from './types';

// Base wrapper for fields with label and error display
interface BaseProps {
    field: FormField;
    error?: string;
    children: React.ReactNode;
}
const Base = ({ field, error, children }: BaseProps) => {
    const errorId = error ? `${field.id}-error` : undefined;

    return (
        <div className="field-container">
            <label className="field-label" htmlFor={field.id}>
                {field.label}
                {field.rules?.required && <span className="required">*</span>}
            </label>
            {React.isValidElement(children)
                ? React.cloneElement(children, {
                    id: field.id,
                    'aria-describedby': errorId,
                    'aria-invalid': !!error,
                } as any)
                : children
            }
            {error && (
                <div id={errorId} className="field-error" role="alert">
                    {error}
                </div>
            )}
        </div>
    );
};

// Generic props for renderers
type RendererProps<T = any> = {
    field: FormField;
    value: T;
    error?: string;
    onChange: (v: T) => void;
    onBlur?: () => void;
};

// Text input renderer
export const Text = React.memo(({ field, value, error, onChange, onBlur }: RendererProps<string>) => (
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
));

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
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const ref = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const handleCloseRef = useRef<(event: MouseEvent) => void>(() => { });
    handleCloseRef.current = (event: MouseEvent) => {
        if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };

    useEffect(() => {
        const handler = (event: MouseEvent) => handleCloseRef.current?.(event);
        if (open) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    // Focus first option when dropdown opens
    useEffect(() => {
        if (open && options.length > 0) {
            setFocusedIndex(0);
        }
    }, [open, options.length]);

    const selectedLabel = options.find(o => o.value === value)?.label ?? field.placeholder ?? 'Select…';

    return (
        <Base field={field} error={error}>
            <div ref={ref} className="select-container">
                <div
                    className="select-trigger"
                    onClick={() => setOpen(!open)}
                    role="combobox"
                    aria-expanded={open}
                    aria-haspopup="listbox"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setOpen(!open);
                        } else if (e.key === 'Escape') {
                            setOpen(false);
                        } else if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            if (!open) {
                                setOpen(true);
                            } else {
                                setFocusedIndex(prev => Math.min(prev + 1, options.length - 1));
                            }
                        } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            if (open) {
                                setFocusedIndex(prev => Math.max(prev - 1, 0));
                            }
                        }
                    }}
                >
                    <span className={value ? 'selected' : 'placeholder'}>{selectedLabel}</span>
                    <span className={open ? 'select-arrow open' : 'select-arrow'}>▼</span>
                </div>
                {open && (
                    <div ref={dropdownRef} className="select-dropdown" role="listbox">
                        {options.map((option, index) => (
                            <div
                                key={index}
                                className={`select-option ${option.value === value ? 'selected' : ''} ${index === focusedIndex ? 'focused' : ''}`}
                                onClick={() => { onChange(option.value); setOpen(false); onBlur?.(); }}
                                role="option"
                                aria-selected={option.value === value}
                                tabIndex={-1}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        onChange(option.value);
                                        setOpen(false);
                                        onBlur?.();
                                    }
                                }}
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
                role="switch"
                aria-checked={!!value}
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
                onChange={e => {
                    const val = e.target.value;
                    if (val === '') {
                        onChange(undefined as any); // Keep empty until blur
                    } else {
                        const parsed = parseFloat(val);
                        onChange(isNaN(parsed) ? 0 : parsed);
                    }
                }}
                onBlur={() => {
                    if (value === undefined || value === null) {
                        onChange(0); // Coerce to 0 on blur if empty
                    }
                    onBlur?.();
                }}
                placeholder={field.placeholder}
                className={error ? 'number-input error' : 'number-input'}
            />
        </Base>
    );
};

// Date input renderer
export const Date = ({ field, value, error, onChange, onBlur }: RendererProps<string>) => {
    const { minDate, maxDate } = field.props ?? {};

    // Fix timezone issue by using local date components
    const formatDateForInput = (date: globalThis.Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const min = minDate ? formatDateForInput(minDate) : undefined;
    const max = maxDate ? formatDateForInput(maxDate) : undefined;
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