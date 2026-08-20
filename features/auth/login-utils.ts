import { routes } from '@/lib/config/routes';

export function safeReturnTo(value: string | null) {
  return value?.startsWith('/dashboard') && !value.startsWith('//') ? value : routes.dashboard;
}

export function validateLogin(email: string, password: string) {
  const errors: { email?: string; password?: string } = {};
  if (!email.trim()) errors.email = 'Email is required.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address.';
  if (!password) errors.password = 'Password is required.';
  return errors;
}
