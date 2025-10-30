import React, { useState, useRef, useEffect } from 'react';
import type { FormField } from './types';

interface BaseProps {
    field: FormField;
    error?: string;
    children: React.ReactNode;
}
const Base = ({ field, error, children }: BaseProps) => (
    <div className="field">
        <label className="label">
            {field.label}
            {field.rules?.required && <span className="req">*</span>}
        </label>
        {children}
        {error && <div className="error">{error}</div>}
    </div>
);

type RendererProps<T = any> = {
    field: FormField;
    value: T;
    error?: string;
    onChange: (v: T) => void;
    onBlur?: () => void;
};

/* ---------- TEXT ---------- */
export const Text = ({ field, value, error, onChange, onBlur }: RendererProps<string>) => (
    <Base field={field} error={error}>
        <input
            type={field.inputType || 'text'}
            value={value ?? ''}
            onChange={e => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={field.placeholder}
            className={error ? 'inp err' : 'inp'}
        />
    </Base>
);

/* ---------- TEXTAREA ---------- */
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
                className={error ? 'inp err' : 'inp'}
            />
        </Base>
    );
};

/* ---------- SELECT ---------- */
export const Select = ({ field, value, error, onChange, onBlur }: {
    field: FormField; value: any; error?: string;
    onChange: (v: any) => void; onBlur?: () => void;
}) => {
    const opts = (field.props?.data ?? []).map(o =>
        typeof o === 'string' ? { label: o, value: o } : o
    );
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const close = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        if (open) document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [open]);

    const selected = opts.find(o => o.value === value)?.label ?? field.placeholder ?? 'Select…';

    return (
        <Base field={field} error={error}>
            <div ref={ref} className="select">
                <div className="trigger" onClick={() => setOpen(!open)}>
                    <span>{selected}</span>
                    <span className={open ? 'arrow open' : 'arrow'}>▼</span>
                </div>
                {open && (
                    <div className="dropdown">
                        {opts.map((o, i) => (
                            <div
                                key={i}
                                className={`opt ${o.value === value ? 'sel' : ''}`}
                                onClick={() => { onChange(o.value); setOpen(false); onBlur?.(); }}
                            >
                                {o.label}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Base>
    );
};

/* ---------- CHECKBOX ---------- */
export const Checkbox = ({ field, value, error, onChange, onBlur }: RendererProps<boolean>) => (
    <div className="field">
        <label className="chk">
            <input
                type="checkbox"
                checked={!!value}
                onChange={e => onChange(e.target.checked)}
                onBlur={onBlur}
            />
            <span>
                {field.label}
                {field.rules?.required && <span className="req">*</span>}
            </span>
        </label>
        {error && <div className="error">{error}</div>}
    </div>
);

/* ---------- RADIO ---------- */
export const Radio = ({ field, value, error, onChange, onBlur }: RendererProps<any>) => {
    const opts = field.props?.options ?? [];
    return (
        <Base field={field} error={error}>
            <div className="radio-group">
                {opts.map((o: any, i: number) => (
                    <label key={i} className="radio-opt">
                        <input
                            type="radio"
                            name={field.id}
                            value={o.value}
                            checked={value === o.value}
                            onChange={() => onChange(o.value)}
                            onBlur={onBlur}
                        />
                        {o.label}
                    </label>
                ))}
            </div>
        </Base>
    );
};

/* ---------- SWITCH ---------- */
export const Switch = ({ field, value, error, onChange, onBlur }: RendererProps<boolean>) => (
    <Base field={field} error={error}>
        <label className="switch">
            <input
                type="checkbox"
                checked={!!value}
                onChange={e => onChange(e.target.checked)}
                onBlur={onBlur}
            />
            <span className="slider" />
        </label>
    </Base>
);

/* ---------- NUMBER ---------- */
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
                className={error ? 'inp err' : 'inp'}
            />
        </Base>
    );
};

/* ---------- DATE ---------- */
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
                className={error ? 'inp err' : 'inp'}
            />
        </Base>
    );
};

/* ---------- FILE ---------- */
export const File = ({ field, value, error, onChange, onBlur }: RendererProps<File | null>) => {
    const ref = useRef<HTMLInputElement>(null);
    const { accept, maxSize } = field.props ?? {};

    const handle = (f: File | null) => {
        if (f && maxSize && f.size > maxSize) return; // ignore oversized
        onChange(f);
    };

    return (
        <Base field={field} error={error}>
            <input
                ref={ref}
                type="file"
                accept={accept}
                onChange={e => handle(e.target.files?.[0] ?? null)}
                onBlur={onBlur}
                style={{ display: 'none' }}
            />
            {!value ? (
                <button type="button" className="file-btn" onClick={() => ref.current?.click()}>
                    Choose file…
                </button>
            ) : (
                <div className="file-sel">
                    <span>{value.name}</span>
                    <button type="button" onClick={() => { onChange(null); if (ref.current) ref.current.value = ''; }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"
                            aria-hidden="true">
                            <path fill="currentColor" d="M11.53 4.47a.75.75 0 0 0-1.06 0L8 6.94 5.53 4.47a.75.75 0 0 0-1.06 1.06L6.94 8 4.47 10.47a.75.75 0 1 0 1.06 1.06L8 9.06l2.47 2.47a.75.75 0 0 0 1.06-1.06L9.06 8l2.47-2.47a.75.75 0 0 0 0-1.06z" />
                        </svg>

                    </button>
                </div>
            )}
        </Base>
    );
};

/* ---------- MULTISELECT ---------- */
export const Multiselect = ({ field, value = [], error, onChange }: RendererProps<any[]>) => {
    const opts = (field.props?.data ?? []).map(o =>
        typeof o === 'string' ? { label: o, value: o } : o
    );
    const toggle = (v: any) => {
        onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v]);
    };
    return (
        <Base field={field} error={error}>
            <div className="multi">
                {opts.map((o, i) => (
                    <label key={i} className="multi-opt">
                        <input
                            type="checkbox"
                            checked={value.includes(o.value)}
                            onChange={() => toggle(o.value)}
                        />
                        {o.label}
                    </label>
                ))}
            </div>
        </Base>
    );
};