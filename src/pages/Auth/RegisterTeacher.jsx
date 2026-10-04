import React from 'react';
import RegisterStaff from '../../components/auth/RegisterStaff';

export default function RegisterTeacher() {
  return <RegisterStaff role="teacher" title="Teacher registration" intro="Your name is what class reps pick when they start a lesson. An Administrator must approve you before you can sign in." />;
}
