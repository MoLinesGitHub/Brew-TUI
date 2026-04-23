import { spawn } from 'node:child_process';

export async function execBrew(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('brew', args, { env: { ...process.env, HOMEBREW_NO_AUTO_UPDATE: '1' } });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(stderr.trim() || `brew ${args.join(' ')} exited with code ${code}`));
      }
    });
    proc.on('error', (err) => {
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

  const push = (chunk: Buffer) => {
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
        // TODO: replace polling with event-driven approach using stdout.on('data')
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
