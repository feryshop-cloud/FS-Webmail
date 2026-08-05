export const logger = {
  debug: (message: string, meta?: any) => {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "debug",
        message,
        ...meta,
      }),
    );
  },
  info: (message: string, meta?: any) => {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "info",
        message,
        ...meta,
      }),
    );
  },
  warn: (message: string, meta?: any) => {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "warn",
        message,
        ...meta,
      }),
    );
  },
  error: (message: string, meta?: any) => {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "error",
        message,
        ...meta,
      }),
    );
  },
};
