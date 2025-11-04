import { useState } from 'react';
import { FormEngine } from '../engine/FormEngine';
import {
  insuranceQuoteSchema,
  contactFormSchema,
  surveyFormSchema,
  registrationFormSchema,
  agentUpdateSchema,
  productFormSchema,
  addressFormSchema,
  jobApplicationSchema,
} from '../../formSchemas';

const schemas = {
  insuranceQuote: insuranceQuoteSchema,
  contactForm: contactFormSchema,
  surveyForm: surveyFormSchema,
  registrationForm: registrationFormSchema,
  agentUpdate: agentUpdateSchema,
  productForm: productFormSchema,
  addressForm: addressFormSchema,
  jobApplication: jobApplicationSchema,
};

export const Demo = () => {
  const [selectedSchema, setSelectedSchema] = useState<keyof typeof schemas>('surveyForm');

  return (
    <div className="p-4 space-y-4">
      <select
        value={selectedSchema}
        onChange={e => setSelectedSchema(e.target.value as keyof typeof schemas)}
        className="border rounded p-2"
      >
        {Object.keys(schemas).map(key => (
          <option key={key} value={key}>
            {key}
          </option>
        ))}
      </select>

      <FormEngine
        key={selectedSchema} // Force re-render when schema changes to clear state
        schema={schemas[selectedSchema]}
        onSubmit={async (values) => {
          console.log('Submitted values:', values);
          
          // Simulate async submission with potential error
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Randomly fail to demonstrate error handling
          if (Math.random() > 0.7) {
            throw new Error('Simulated server error - please try again');
          }
          
          alert('Form submitted successfully! Check console for values.');
        }}
      />
    </div>
  );
};
