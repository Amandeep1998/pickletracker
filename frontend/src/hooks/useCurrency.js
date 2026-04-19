import { useAuth } from '../context/AuthContext';

/** Returns the current user's preferred currency code (e.g. 'INR', 'USD'). Defaults to 'INR'. */
export default function useCurrency() {
  const { user } = useAuth();
  return user?.currency || 'INR';
}
