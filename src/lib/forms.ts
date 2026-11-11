import { z } from "zod";

export const signInFormSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8)
});

export const signUpFormSchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().min(2).max(60),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/, "Include at least one uppercase letter.")
    .regex(/[a-z]/, "Include at least one lowercase letter.")
    .regex(/[0-9]/, "Include at least one number.")
});
