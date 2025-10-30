# FormEngine

A powerful, flexible, and type-safe form builder for React applications. Define complex forms using JSON schemas with validation, conditional visibility, and flexible layouts.

## Features

- **Schema-driven**: Define forms using declarative JSON schemas
- **Rich field types**: Text, textarea, select, multiselect, radio, checkbox, switch, number, date, and file inputs
- **Built-in validation**: Required fields, min/max length, patterns, custom validators
- **Conditional visibility**: Show/hide fields based on other field values
- **Flexible layouts**: Stack, grid, and section-based layouts with customizable spacing
- **Type-safe**: Full TypeScript support
- **Accessible**: Semantic HTML with proper labels and error handling
- **Responsive**: Mobile-friendly with adaptive layouts

## Installation

Copy the following files into your project:
- `FormEngine.tsx`
- `FieldRenderers.tsx`
- `FormEngine.css`
- `types.ts`

```tsx
import { FormEngine } from './FormEngine';
import type { FormSchema } from './types';
```

## Basic Usage

```tsx
import { FormEngine } from './FormEngine';

const schema = {
  id: 'contact-form',
  meta: {
    title: 'Contact Us',
    description: 'Fill out this form to get in touch'
  },
  fields: {
    name: {
      id: 'name',
      label: 'Full Name',
      renderer: 'text',
      placeholder: 'John Doe',
      rules: {
        required: 'Name is required'
      }
    },
    email: {
      id: 'email',
      label: 'Email',
      renderer: 'text',
      inputType: 'email',
      rules: {
        required: 'Email is required',
        pattern: {
          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
          message: 'Invalid email format'
        }
      }
    },
    message: {
      id: 'message',
      label: 'Message',
      renderer: 'textarea',
      props: { minRows: 4 }
    }
  },
  layout: [
    { kind: 'field', fieldId: 'name' },
    { kind: 'field', fieldId: 'email' },
    { kind: 'field', fieldId: 'message' }
  ]
};

function App() {
  const handleSubmit = (values) => {
    console.log('Form submitted:', values);
  };

  return <FormEngine schema={schema} onSubmit={handleSubmit} />;
}
```

## Field Types

### Text Input
```tsx
{
  id: 'username',
  label: 'Username',
  renderer: 'text',
  inputType: 'text', // 'email' | 'password' | 'tel' | 'url'
  placeholder: 'Enter username',
  rules: {
    required: 'Username is required',
    minLength: { value: 3, message: 'Min 3 characters' },
    maxLength: { value: 20, message: 'Max 20 characters' }
  }
}
```

### Textarea
```tsx
{
  id: 'bio',
  label: 'Biography',
  renderer: 'textarea',
  props: {
    minRows: 5
  }
}
```

### Select (Dropdown)
```tsx
{
  id: 'country',
  label: 'Country',
  renderer: 'select',
  props: {
    data: [
      { label: 'United States', value: 'us' },
      { label: 'Canada', value: 'ca' },
      { label: 'United Kingdom', value: 'uk' }
    ]
  }
}
```

### Multiselect
```tsx
{
  id: 'skills',
  label: 'Skills',
  renderer: 'multiselect',
  props: {
    data: ['JavaScript', 'TypeScript', 'React', 'Node.js']
  }
}
```

### Radio Group
```tsx
{
  id: 'gender',
  label: 'Gender',
  renderer: 'radio',
  props: {
    options: [
      { label: 'Male', value: 'male' },
      { label: 'Female', value: 'female' },
      { label: 'Other', value: 'other' }
    ]
  }
}
```

### Checkbox
```tsx
{
  id: 'terms',
  label: 'I agree to the terms and conditions',
  renderer: 'checkbox',
  rules: {
    required: 'You must accept the terms'
  }
}
```

### Switch (Toggle)
```tsx
{
  id: 'notifications',
  label: 'Enable Notifications',
  renderer: 'switch',
  defaultValue: true
}
```

### Number Input
```tsx
{
  id: 'age',
  label: 'Age',
  renderer: 'number',
  props: {
    min: 18,
    max: 100,
    step: 1
  },
  rules: {
    min: { value: 18, message: 'Must be 18 or older' }
  }
}
```

### Date Input
```tsx
{
  id: 'birthday',
  label: 'Date of Birth',
  renderer: 'date',
  props: {
    maxDate: new Date()
  }
}
```

### File Upload
```tsx
{
  id: 'resume',
  label: 'Resume',
  renderer: 'file',
  props: {
    accept: '.pdf,.doc,.docx',
    maxSize: 5242880 // 5MB in bytes
  }
}
```

## Validation Rules

```tsx
rules: {
  required: 'This field is required',
  minLength: { value: 5, message: 'Minimum 5 characters' },
  maxLength: { value: 100, message: 'Maximum 100 characters' },
  min: { value: 0, message: 'Must be positive' },
  max: { value: 100, message: 'Must be 100 or less' },
  pattern: {
    value: /^[A-Z0-9]+$/,
    message: 'Only uppercase letters and numbers'
  },
  validate: (value, formValues) => {
    if (value !== formValues.password) {
      return 'Passwords do not match';
    }
    return true;
  }
}
```

## Conditional Visibility

Show/hide fields based on other field values:

```tsx
{
  id: 'other',
  label: 'Please specify',
  renderer: 'text',
  visibleWhen: {
    field: 'category',
    op: 'equals',
    value: 'other'
  }
}

// Multiple conditions (all must be true)
{
  id: 'advanced',
  label: 'Advanced Options',
  renderer: 'text',
  visibleWhen: [
    { field: 'userType', op: 'equals', value: 'admin' },
    { field: 'mode', op: 'in', value: ['advanced', 'expert'] }
  ]
}
```

Operators: `equals`, `notEquals`, `in`, `notIn`

## Layouts

### Stack Layout
Vertical stacking of fields:

```tsx
layout: [
  {
    kind: 'stack',
    spacing: 'md', // 'xs' | 'sm' | 'md' | 'lg' | 'xl'
    children: [
      { kind: 'field', fieldId: 'firstName' },
      { kind: 'field', fieldId: 'lastName' }
    ]
  }
]
```

### Grid Layout
Responsive multi-column layout:

```tsx
layout: [
  {
    kind: 'grid',
    cols: 2, // Number of columns
    spacing: 'md',
    children: [
      { kind: 'field', fieldId: 'firstName' },
      { kind: 'field', fieldId: 'lastName' },
      { kind: 'field', fieldId: 'email', colSpan: 2 } // Full width
    ]
  }
]
```

### Sections
Group related fields with headers:

```tsx
layout: [
  {
    kind: 'section',
    title: 'Personal Information',
    withDivider: true,
    collapsible: true, // Allow expand/collapse
    children: [
      { kind: 'field', fieldId: 'name' },
      { kind: 'field', fieldId: 'email' }
    ]
  }
]
```

### Nested Layouts
Combine layouts for complex forms:

```tsx
layout: [
  {
    kind: 'section',
    title: 'User Details',
    children: [
      {
        kind: 'grid',
        cols: 2,
        children: [
          { kind: 'field', fieldId: 'firstName' },
          { kind: 'field', fieldId: 'lastName' }
        ]
      },
      { kind: 'field', fieldId: 'bio' }
    ]
  }
]
```

## Complete Example

```tsx
const registrationSchema = {
  id: 'registration',
  meta: {
    title: 'User Registration',
    subtitle: 'Create your account',
    description: 'Please fill out all required fields'
  },
  fields: {
    firstName: {
      id: 'firstName',
      label: 'First Name',
      renderer: 'text',
      rules: { required: 'First name is required' }
    },
    lastName: {
      id: 'lastName',
      label: 'Last Name',
      renderer: 'text',
      rules: { required: 'Last name is required' }
    },
    email: {
      id: 'email',
      label: 'Email',
      renderer: 'text',
      inputType: 'email',
      rules: {
        required: 'Email is required',
        pattern: {
          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
          message: 'Invalid email'
        }
      }
    },
    password: {
      id: 'password',
      label: 'Password',
      renderer: 'text',
      inputType: 'password',
      rules: {
        required: 'Password is required',
        minLength: { value: 8, message: 'Min 8 characters' }
      }
    },
    confirmPassword: {
      id: 'confirmPassword',
      label: 'Confirm Password',
      renderer: 'text',
      inputType: 'password',
      rules: {
        required: 'Please confirm password',
        validate: (value, values) =>
          value === values.password || 'Passwords must match'
      }
    },
    accountType: {
      id: 'accountType',
      label: 'Account Type',
      renderer: 'radio',
      defaultValue: 'personal',
      props: {
        options: [
          { label: 'Personal', value: 'personal' },
          { label: 'Business', value: 'business' }
        ]
      }
    },
    companyName: {
      id: 'companyName',
      label: 'Company Name',
      renderer: 'text',
      visibleWhen: { field: 'accountType', op: 'equals', value: 'business' },
      rules: { required: 'Company name is required' }
    },
    newsletter: {
      id: 'newsletter',
      label: 'Subscribe to newsletter',
      renderer: 'checkbox',
      defaultValue: false
    }
  },
  layout: [
    {
      kind: 'section',
      title: 'Account Information',
      withDivider: true,
      children: [
        {
          kind: 'grid',
          cols: 2,
          children: [
            { kind: 'field', fieldId: 'firstName' },
            { kind: 'field', fieldId: 'lastName' }
          ]
        },
        { kind: 'field', fieldId: 'email' }
      ]
    },
    {
      kind: 'section',
      title: 'Security',
      withDivider: true,
      children: [
        {
          kind: 'grid',
          cols: 2,
          children: [
            { kind: 'field', fieldId: 'password' },
            { kind: 'field', fieldId: 'confirmPassword' }
          ]
        }
      ]
    },
    {
      kind: 'section',
      title: 'Account Type',
      children: [
        { kind: 'field', fieldId: 'accountType' },
        { kind: 'field', fieldId: 'companyName' }
      ]
    },
    { kind: 'field', fieldId: 'newsletter' }
  ]
};

function RegistrationForm() {
  const handleSubmit = (values) => {
    console.log('Registration data:', values);
    // Submit to API
  };

  const handleChange = (values, errors) => {
    console.log('Form state:', { values, errors });
  };

  return (
    <FormEngine
      schema={registrationSchema}
      onSubmit={handleSubmit}
      onChange={handleChange}
      initialValues={{ accountType: 'personal' }}
    />
  );
}
```

## Props

### FormEngine Component

| Prop | Type | Description |
|------|------|-------------|
| `schema` | `FormSchema` | Form schema definition (required) |
| `initialValues` | `FormValues` | Initial form values |
| `onSubmit` | `(values: FormValues) => void` | Called on form submission when valid |
| `onChange` | `(values: FormValues, errors: FormErrors) => void` | Called on every value change |
| `className` | `string` | Additional CSS class name |

## Styling

The form uses CSS custom properties for easy theming. Override these in your CSS:

```css
:root {
  --form-primary: #2563eb;
  --form-primary-hover: #1d4ed8;
  --form-danger: #dc2626;
  --form-border: #e5e7eb;
  --form-radius: 0.5rem;
  /* ... more variables in FormEngine.css */
}
```