import { app } from "./app.js";
import { env } from "./config/env.js";

const server = app.listen(env.API_PORT, env.API_HOST, () => {
  console.info(
    `TeamFlow API listening on http://${env.API_HOST}:${env.API_PORT}`,
  );
});

server.on("error", (error: NodeJS.ErrnoException) => {
  console.error("TeamFlow API failed to start:", error);
  process.exitCode = 1;
});
