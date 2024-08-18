// to send error messages and statuses to client
class HttpError extends Error {
    constructor(message, errorCode) {
      super(message);
      this.code = errorCode;
    }
  }
  
  module.exports = HttpError;