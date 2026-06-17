import { Request, Response, NextFunction } from "express";

export interface SchemaField {
  required?: boolean;
  validate: (value: unknown) => boolean;
  sanitize?: (value: unknown) => string;
  errorMessage: string;
}

export interface ValidationSchema {
  [key: string]: SchemaField;
}

export const validateQuery = (schema: ValidationSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const [key, field] of Object.entries(schema)) {
      const value = req.query[key];

      if (value === undefined) {
        if (field.required) {
          return res.status(400).json({ error: `Missing required query parameter: ${key}` });
        }
        continue;
      }

      if (!field.validate(value)) {
        return res.status(400).json({ error: field.errorMessage });
      }

      if (field.sanitize) {
        req.query[key] = field.sanitize(value) as any;
      }
    }
    next();
  };
};

export const albumsQuerySchema: ValidationSchema = {
  page: {
    validate: (val) => {
      const str = String(val);
      if (!/^\d+$/.test(str)) return false;
      const num = parseInt(str, 10);
      return num >= 1 && num <= 100;
    },
    sanitize: (val) => String(parseInt(String(val), 10)),
    errorMessage: "Invalid page parameter. Must be a positive integer (max 100).",
  },
  slice: {
    validate: (val) => val === "new" || val === "hot",
    errorMessage: "Invalid slice parameter. Must be 'new' or 'hot'.",
  },
  tag: {
    validate: (val) => {
      const str = String(val).trim();
      return str.length > 0 && str.length <= 50 && /^[a-zA-Z0-9-]+$/.test(str);
    },
    sanitize: (val) => String(val).trim().toLowerCase(),
    errorMessage: "Invalid tag parameter. Must be alphanumeric with hyphens only, maximum 50 characters.",
  },
};
