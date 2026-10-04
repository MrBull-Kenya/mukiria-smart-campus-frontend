import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export function useClassCode() {
  const { user } = useContext(AuthContext);

  // Default fallback to 'ITECH5/M/25' if user object or class_code is not explicitly set
  const classCode = user?.class_code || 'ITECH5/M/25';

  const filterByClass = (items = []) => {
    return items.filter(item => !item.class_code || item.class_code === classCode);
  };

  return {
    classCode,
    filterByClass,
    institution: 'Mukiria Technical Training Institute (MTTI)'
  };
}