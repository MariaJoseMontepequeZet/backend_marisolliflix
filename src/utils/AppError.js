// Error propio del API: lleva el codigo HTTP que se debe responder.
// Se lanza desde controladores/servicios y lo atrapa el errorHandler.
class AppError extends Error {
  constructor(message, statusCode = 500, errors = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

module.exports = AppError;
