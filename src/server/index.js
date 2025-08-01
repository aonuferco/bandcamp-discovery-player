import { app, PORT } from "./app.js";

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
});
