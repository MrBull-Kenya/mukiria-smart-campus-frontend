import React from 'react';
import RegisterStaff from '../../components/auth/RegisterStaff';

export default function RegisterAdmin() {
  return <RegisterStaff role="admin" title="Administrator registration" intro="The first Administrator is approved automatically. Later Administrators need approval from an existing one." />;
}
