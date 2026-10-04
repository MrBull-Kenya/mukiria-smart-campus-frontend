import React from 'react';
import RegisterForm from '../../components/auth/RegisterForm';

export default function RegisterStudent() {
  return <RegisterForm title="Student registration" endpoint="/auth/register-student" />;
}
