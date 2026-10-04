import React from 'react';
import RegisterForm from '../../components/auth/RegisterForm';

export default function RegisterClassRep() {
  return <RegisterForm title="Class representative registration" endpoint="/auth/register-rep" isRep />;
}
