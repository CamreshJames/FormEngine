export interface ValidationRule {
    required?: string;
    minLength?: { value: number; message: string };
    maxLength?: { value: number; message: string };
    min?: { value: number; message: string };
    max?: { value: number; message: string };
    pattern?: { value: RegExp; message: string };
    validate?: (value: any, formValues: Record<string, any>) => string | boolean;
}

export interface VisibilityCondition {
    field: string;
    op: 'equals' | 'in' | 'notEquals' | 'notIn';
    value: any;
}

export interface SelectOption {
    label: string;
    value: any;
}

export interface FieldProps {
    data?: SelectOption[] | string[];
    options?: SelectOption[];
    searchable?: boolean;
    maxValues?: number;
    minRows?: number;
    maxRows?: number;
    min?: number;
    max?: number;
    step?: number;
    precision?: number;
    suffix?: string;
    prefix?: string;
    thousandsSeparator?: string;
    accept?: string;
    maxSize?: number;
    minDate?: Date;
    maxDate?: Date;
    placeholder?: string;
}

export interface FormField {
    id: string;
    label: string;
    renderer:
    | 'text'
    | 'textarea'
    | 'select'
    | 'multiselect'
    | 'radio'
    | 'checkbox'
    | 'switch'
    | 'number'
    | 'date'
    | 'file';
    inputType?: 'text' | 'email' | 'password' | 'tel' | 'url';
    placeholder?: string;
    defaultValue?: any;
    rules?: ValidationRule;
    props?: FieldProps;
    visibleWhen?: VisibilityCondition | VisibilityCondition[];
}

export interface LayoutNode {
    kind: 'field' | 'stack' | 'grid' | 'section';
    fieldId?: string;
    children?: LayoutNode[];
    title?: string;
    withDivider?: boolean;
    collapsible?: boolean;
    spacing?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    cols?: number;
    colSpan?: number;
}

export interface FormMeta {
    title?: string;
    subtitle?: string;
    description?: string;
}

export interface FormSchema {
    id: string;
    meta: FormMeta;
    fields: Record<string, FormField>;
    layout: LayoutNode[];
}

export type FormValues = Record<string, any>;
export type FormErrors = Record<string, string>;