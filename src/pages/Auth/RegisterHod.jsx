import React from 'react';
import RegisterStaff from '../../components/auth/RegisterStaff';

export default function RegisterHod() {
  return <RegisterStaff role="hod" title="HOD registration" intro="An Administrator must approve your account before you can sign in." />;
}
