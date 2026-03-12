import bcrypt from 'bcrypt';
import { supabase } from './supabaseClient';

const BCRYPT_ROUNDS = 12;

export interface RegisterResult {
  id: string;
  email: string;
}

export interface LoginResult {
  userId: string;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: 'DUPLICATE_EMAIL' | 'INVALID_CREDENTIALS'
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export async function register(
  email: string,
  password: string
): Promise<RegisterResult> {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const { data, error } = await supabase
    .from('users')
    .insert({ email, password_hash: passwordHash })
    .select('id, email')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new AuthError('Email already registered', 'DUPLICATE_EMAIL');
    }
    throw error;
  }

  if (!data) {
    throw new Error('Insert succeeded but no data returned');
  }

  return {
    id: data.id as string,
    email: data.email as string,
  };
}

export async function login(
  email: string,
  password: string
): Promise<LoginResult | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, password_hash')
    .eq('email', email)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const match = await bcrypt.compare(password, data.password_hash as string);
  if (!match) return null;

  return { userId: data.id as string };
}
