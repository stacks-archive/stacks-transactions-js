export class StacksTransactionError extends Error {
  constructor(message: string) {
    super(message);
    this.message = message;
    this.name = this.constructor.name;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class SerializationError extends StacksTransactionError {}

export class DeserializationError extends StacksTransactionError {}

export class NotImplementedError extends StacksTransactionError {}

export class SigningError extends StacksTransactionError {}
