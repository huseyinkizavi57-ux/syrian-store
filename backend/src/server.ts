import { createApp } from "./app";
import { env } from "./config/env";
import { startOrderExpiryJob } from "./jobs/expireOrders";

const app = createApp();

app.listen(env.port, () => {
  console.log(`🚀 Server running on http://localhost:${env.port} [${env.nodeEnv}]`);
  startOrderExpiryJob();
});
