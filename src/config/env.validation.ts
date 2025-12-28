import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
    // Server
    NODE_ENV: Joi.string()
        .valid('development', 'production', 'test')
        .default('development'),
    PORT: Joi.number().default(3001),

    // CORS
    CORS_ORIGIN: Joi.string().default('http://localhost:3000'),

    // Supabase (Required)
    SUPABASE_URL: Joi.string().uri().required().messages({
        'string.empty': 'SUPABASE_URL is required',
        'any.required': 'SUPABASE_URL is required',
    }),
    SUPABASE_ANON_KEY: Joi.string().required().messages({
        'string.empty': 'SUPABASE_ANON_KEY is required',
        'any.required': 'SUPABASE_ANON_KEY is required',
    }),
    SUPABASE_SERVICE_ROLE_KEY: Joi.string().required().messages({
        'string.empty': 'SUPABASE_SERVICE_ROLE_KEY is required',
        'any.required': 'SUPABASE_SERVICE_ROLE_KEY is required',
    }),

    // JWT
    JWT_SECRET: Joi.string().min(32).required().messages({
        'string.min': 'JWT_SECRET must be at least 32 characters',
        'any.required': 'JWT_SECRET is required',
    }),
    JWT_EXPIRATION: Joi.string().default('15m'),
    JWT_REFRESH_EXPIRATION: Joi.string().default('7d'),

    // OAuth Redirect URLs (Optional - configured in Supabase dashboard)
    GOOGLE_REDIRECT_URL: Joi.string().uri().optional(),
    FACEBOOK_REDIRECT_URL: Joi.string().uri().optional(),
});
