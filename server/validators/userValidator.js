const { z } = require('zod');

const updateProfileSchema = z.object({
  body: z.object({
    displayName: z.string().max(30, 'Display name cannot exceed 30 characters').optional(),
    bio: z.string().max(200, 'Bio cannot exceed 200 characters').optional(),
    country: z.string().max(50).optional(),
    timezone: z.string().max(50).optional(),
    preferredLanguage: z.string().max(10).optional()
  }).strict()
});

const updateUsernameSchema = z.object({
  body: z.object({
    newUsername: z.string()
      .min(3, 'Username must be at least 3 characters')
      .max(20, 'Username cannot exceed 20 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
  })
});

module.exports = {
  updateProfileSchema,
  updateUsernameSchema
};
