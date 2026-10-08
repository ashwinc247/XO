const validate = (schema) => (req, res, next) => {
  try {
    // Parse request body/query/params using the schema
    const parsed = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params
    });

    if (!parsed.success) {
      const errorDetails = parsed.error.issues.map(issue => ({
        field: issue.path.slice(1).join('.'),
        message: issue.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errorDetails.map(err => `${err.field}: ${err.message}`)
      });
    }

    // Assign back parsed values
    req.body = parsed.data.body || req.body;
    req.query = parsed.data.query || req.query;
    req.params = parsed.data.params || req.params;

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = validate;
