import { Router } from 'express';

import { registerSchema, loginSchema } from './auth.schema.js'
import * as argon2 from 'argon2'

import { prisma } from '../../db/prisma.js';
import { Prisma } from '../../generated/prisma/client.js';
import { createHash, randomBytes } from 'node:crypto';
import { env } from 'node:process';


export const authRouter = Router();

authRouter.post("/register", async (request, response) =>{
    const result = registerSchema.safeParse(request.body);

    if (!result.success){
        return response.status(400).json({
            error: "Validation failed.",
            detail: result.error.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message,
            }))
        })
    }

    const { name, email, password } = result.data;

    try {
        const hashPassword = await argon2.hash(password);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                hashedPassword: hashPassword,
            },
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,

            }
        })

        return response.status(201).json({ user });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"){
            return response.status(409).json({
                error: "An account with this email already exists",
            });
        }
        console.error("registration field: ", error);

        return response.status(500).json({
            error: "Internal server error"
        })
    }

 });

 const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

authRouter.post("/login", async (request, response) =>{

    // validate the user input, act as DTO in other frameworks
    const result = loginSchema.safeParse(request.body);

    if(!result.success){
        return response.status(400).json({
            error: "validation failed",
            detail: result.error.issues.map((issue)=> ({
                field: issue.path.join('.'),
                message: issue.message
            }))
        })
    }

    const {email, password} = result.data;

    try{
        const user = await prisma.user.findUnique({
            where: {email},
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
                hashedPassword: true
            }
        })

        if(!user){
            return response.status(401).json({
                error: "Invalid email or passowrd"
            })
        }

        const passwordMatch = await argon2.verify(
            user.hashedPassword,
            password
        )

        if(!passwordMatch){
            return response.status(401).json({
                error: "Invalid email or password"
            })
        }

        const sessionToken = randomBytes(32).toString("base64url")
        const tokenHash = createHash("sha256")
                           .update(sessionToken)
                           .digest("hex");
        const expireAt = new Date(Date.now() + SESSION_TTL_MS);

        await prisma.session.create({
            data: {
                tokenHash,
                userId: user.id,
                expireAt

            }
        })

        response.cookie(
            "teamflow_session",
            sessionToken,
            {
                httpOnly: true,
                secure: env.NODE_ENV === "production",
                sameSite: "lax",
                path: "/",
                maxAge: SESSION_TTL_MS
            }
        )

        return response.status(200).json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt
            }
        })
    } catch(error){
        console.error("login failed", error);

        return response.status(500).json({
            error: "Internal server error"
        })

    }

})
    


