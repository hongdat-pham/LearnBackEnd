const PORT = process.env.PORT;
const NODE_ENV = process.env.NODE_ENV;
const APP_NAME = process.env.APP_NAME;

if (!PORT) {
  throw new Error("Config Error: PORT is required");
}
const portNumber = Number(PORT);
if (isNaN(portNumber)) {
  throw new Error(`Config Error: PORT must be a valid number, got "${PORT}"`);
} else if (portNumber <= 0) {
  throw new Error(
    `Config Error: PORT must be a positive number, got "${PORT}"`,
  );
}

export const config = {
  post: portNumber,
  nodeEnv: NODE_ENV || "development",
  appName: APP_NAME || "App",
  isDevelopement: NODE_ENV === "development",
  isProduct: NODE_ENV === "production",
};
