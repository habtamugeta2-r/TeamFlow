import express from "express"
import { authRouter } from "./modules/auth/auth.route.js"
import { prisma } from "./db/prisma.js";

export const app = express();


app.use(express.json());
app.use("/api/auth", authRouter)

app.get("/api/health", (_request, response) => {
  response.status(200).json({ status: "ok" })
});

app.get("/api/health/ready", async (_request, response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    response.status(200).json({
      status: "ok",
      database: "connected",
    })

  }catch (error){
    console.error("Database readiness check failed", error);
    response.status(503).json({
      status: "error",
      database: "unavailable",
    })
  }
})
