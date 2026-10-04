import { useAuth } from '../context/AuthContext';
import { INSTITUTION } from '../config/campus';

export function useClassCode() {
  const { user } = useAuth();
  const classCode = user?.class_code || '';

  const filterByClass = (items = []) => items.filter((item) => !item.class_code || item.class_code === classCode);

  return { classCode, filterByClass, institution: INSTITUTION };
}
