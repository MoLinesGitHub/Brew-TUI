import { spawn } from 'node:child_process';

const DEFAULT_TIMEOUT_MS = 30_000; // 30 seconds for instant commands
const STREAM_IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes idle timeout for streaming

export async function execBrew(args: string[], timeoutMs = DEFAULT_TIMEOUT_MS): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('brew', args, { env: { ...process.env, HOMEBREW_NO_AUTO_UPDATE: '1' } });
    let stdout = '';
    let stderr = '';
    let killed = false;

    // EP-012: Timeout with AbortController pattern
    const timer = setTimeout(() => {
      killed = true;
      proc.kill();
      reject(new Error(`brew ${args.join(' ')} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
    proc.on('close', (code) => {
      clearTimeout(timer);
      if (killed) return;
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(stderr.trim() || `brew ${args.join(' ')} exited with code ${code}`));
      }
    });
    proc.on('error', (err) => {
      clearTimeout(timer);
      if (killed) return;
      reject(new Error(`Failed to run brew: ${err.message}`));
    });
  });
}

export async function* streamBrew(args: string[]): AsyncGenerator<string> {
  const proc = spawn('brew', args, {
    env: { ...process.env, HOMEBREW_NO_AUTO_UPDATE: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let buffer = '';
  const lines: string[] = [];
  let done = false;
  let exitError: string | null = null;
  let lastOutputAt = Date.now();

  const push = (chunk: Buffer) => {
    lastOutputAt = Date.now();
    buffer += chunk.toString();
    const parts = buffer.split('\n');
    buffer = parts.pop() ?? '';
    for (const line of parts) {
      if (line.trim()) lines.push(line);
    }
  };

  proc.stdout.on('data', push);
  proc.stderr.on('data', push);

  proc.on('close', (code) => {
    if (buffer.trim()) lines.push(buffer.trim());
    done = true;
    if (code !== 0) {
      exitError = `brew ${args.join(' ')} exited with code ${code}`;
    }
  });

  proc.on('error', (err) => {
    done = true;
    exitError = err.message;
  });

  try {
    while (!done || lines.length > 0) {
      if (lines.length > 0) {
        yield lines.shift()!;
      } else if (!done) {
        // EP-012: Kill process if idle for too long
        if (Date.now() - lastOutputAt > STREAM_IDLE_TIMEOUT_MS) {
          proc.kill();
          throw new Error(`brew ${args.join(' ')} timed out: no output for ${STREAM_IDLE_TIMEOUT_MS / 1000}s`);
        }
        await new Promise((r) => setTimeout(r, 100));
      }
    }
  } finally {
    if (!done) {
      proc.kill();
    }
  }

  // Throw after all lines have been yielded so the consumer sees
  // brew's stderr output in the stream before the error surfaces.
  if (exitError) {
    throw new Error(exitError);
  }
}
