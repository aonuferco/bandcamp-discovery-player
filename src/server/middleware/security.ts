import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";

// Whitelist of allowed origins: localhost dev server and any Vercel deployments
const ALLOWED_ORIGIN_REGEX = /\.vercel\.app$/;

// Configure CORS middleware
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (
      !origin ||
      origin === "http://localhost:5173" ||
      ALLOWED_ORIGIN_REGEX.test(origin)
    ) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET"],
  optionsSuccessStatus: 200,
});

// Configure Helmet for security headers
export const securityHeadersMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://bandcamp.com"],
      mediaSrc: ["'self'", "https://*.bcbits.com"],
      imgSrc: ["'self'", "data:", "https://*.bcbits.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
  xFrameOptions: { action: "deny" },
  xContentTypeOptions: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
});

// Configure Rate Limiter for API endpoints
export const rateLimitMiddleware = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    error: "Too many requests, please try again later.",
  },
});
