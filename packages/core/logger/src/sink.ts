import type { LogRecord, LogSink, WritableLike } from './types';

/**
 * Builds a sink that JSON-serializes each record and writes a newline-delimited
 * line to the provided stream. Serialization is failure-tolerant: if a record
 * contains a value that cannot be stringified, a minimal fallback line is
 * written instead so logging never throws into the caller.
 */
export function createStreamSink(stream: WritableLike): LogSink {
  return (record: LogRecord): void => {
    let line: string;
    try {
      line = JSON.stringify(record);
    } catch {
      line = JSON.stringify({
        level: record.level,
        levelRank: record.levelRank,
        time: record.time,
        epochMs: record.epochMs,
        msg: record.msg,
        fields: { _serializationError: true },
      });
    }
    stream.write(line + '\n');
  };
}
