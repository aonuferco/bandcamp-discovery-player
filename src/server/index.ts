import { app, PORT } from "./app.js";

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running at http://localhost:${PORT}`);
  // eslint-disable-next-line no-console
  console.log(`Health check available at http://localhost:${PORT}/health`);
});
