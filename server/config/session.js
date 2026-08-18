const MongoStore = require('connect-mongo');

function sessionConfig(mongooseConnection) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret === 'change-this-to-a-strong-random-string') {
    console.warn('WARNING: Using default session secret. Set SESSION_SECRET in .env');
  }

  return {
    secret: secret || 'dev-fallback-secret-change-me',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      client: mongooseConnection.getClient(),
      collectionName: 'sessions',
      ttl: 24 * 60 * 60, // 24 hours
    }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days persistent cookie
    },
    name: 'posture.sid',
  };
}

module.exports = { sessionConfig };
