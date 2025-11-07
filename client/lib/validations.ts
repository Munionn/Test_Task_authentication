import { z } from 'zod';

export const registerSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Email must be a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(100, 'Password must not exceed 100 characters'),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters long')
    .max(100, 'Name must not exceed 100 characters'),
});

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Email must be a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long'),
});

export const updateProfileSchema = z.object({
  email: z
    .string()
    .min(3, 'Email must be at least 3 characters long')
    .email('Email must be a valid email address'),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters long')
    .max(100, 'Name must not exceed 100 characters'),
});

export type RegisterFormData = z.infer<typeof registerSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;

