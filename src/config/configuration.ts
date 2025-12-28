export default () => ({
    // Server configuration
    server: {
        port: parseInt(process.env.PORT || '3001', 10),
        nodeEnv: process.env.NODE_ENV || 'development',
    },

    // CORS configuration
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    },

    // Supabase configuration
    supabase: {
        url: process.env.SUPABASE_URL,
        anonKey: process.env.SUPABASE_ANON_KEY,
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    },

    // JWT configuration
    jwt: {
        secret: process.env.JWT_SECRET,
        expiration: process.env.JWT_EXPIRATION || '15m',
        refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
    },

    // OAuth configuration
    oauth: {
        google: {
            redirectUrl: process.env.GOOGLE_REDIRECT_URL,
        },
        facebook: {
            redirectUrl: process.env.FACEBOOK_REDIRECT_URL,
        },
    },
});
