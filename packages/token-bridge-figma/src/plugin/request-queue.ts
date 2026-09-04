export function createSequentialMessageHandler<T>(
  handler: (message: T) => Promise<void>,
  onError: (error: unknown) => void
): (message: T) => void {
  let queue = Promise.resolve();

  return (message: T) => {
    queue = queue
      .then(() => handler(message))
      .catch((error) => {
        onError(error);
      });
  };
}
