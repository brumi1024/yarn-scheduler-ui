'use client';

import * as React from 'react';
import {
  Controller,
  FormProvider,
  useFormContext,
  useFormState,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';

import {
  Field,
  FieldControl,
  FieldDescription,
  FieldLabel,
  FieldMessage,
  Fieldset,
  FieldsetLegend,
  useFieldContext,
} from '~/components/ui/field';

const Form = FormProvider;

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue);

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const field = useFieldContext();
  const { getFieldState } = useFormContext();
  const formState = useFormState({ name: fieldContext.name });
  const fieldState = getFieldState(fieldContext.name, formState);

  if (!fieldContext) {
    throw new Error('useFormField should be used within <FormField>');
  }

  return {
    id: field.id,
    name: fieldContext.name,
    formItemId: field.formItemId,
    formDescriptionId: field.formDescriptionId,
    formMessageId: field.formMessageId,
    ...fieldState,
  };
};

export {
  Form,
  FormField,
  useFormField,
  Field,
  FieldControl,
  FieldDescription,
  FieldLabel,
  FieldMessage,
  Fieldset,
  FieldsetLegend,
};
