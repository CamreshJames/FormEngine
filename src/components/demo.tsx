import { FormEngine } from '../engine/FormEngine';
import { surveyFormSchema as schema} from '../../formSchemas';
export const Demo = () => {
    return (
        <FormEngine
            schema={schema}
            onSubmit={values => {
                console.log('Submitted values:', values);
                alert('Check console - form submitted!');
            }}
        />
    );
};