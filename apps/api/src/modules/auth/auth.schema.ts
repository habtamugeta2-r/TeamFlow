import { z } from "zod";


export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must contain at least 2 characters")
    .max(80, "Name must not exceed 80 characters"),
    
  email: z
          .string()
          .trim()
          .email("Please provide a valid email address")
          .toLowerCase(),

    password: z.string().min(8, "Password must contain at least 8 characters"),
})

export type RegisterInput = z.infer<typeof registerSchema>;


export const loginSchema = z.object({
  email: z
         .string()
         .trim()
         .email("please provide a valid email address")
         .toLowerCase(),
  password: z
             .string()
             .min(1, "password is requerd; it cant be less than 8 charactors.")
             
})

export type LoginSchema = z.infer<typeof loginSchema>;

