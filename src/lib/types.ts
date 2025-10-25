export type ValidationStatus = 'pending' | 'valid' | 'invalid';

export type Profile = {
  id: string;
  email: string;
  status: ValidationStatus;
  error?: string;
  createdAt: string;
};
