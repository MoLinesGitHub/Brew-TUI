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
        reject(new Error(stderr || `brew ${args.join(' ')} exited with code ${code}`));
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
  let error: Error | null = null;

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

  const exitPromise = new Promise<void>((resolve, reject) => {
    proc.on('close', (code) => {
      if (buffer.trim()) lines.push(buffer.trim());
      done = true;
      if (code === 0) resolve();
      else reject(new Error(`brew ${args.join(' ')} exited with code ${code}`));
    });
    proc.on('error', (err) => {
      done = true;
      error = err;
      reject(err);
    });
  });

  while (!done || lines.length > 0) {
    if (lines.length > 0) {
      yield lines.shift()!;
    } else if (!done) {
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  if (error) throw error;
  await exitPromise.catch(() => {});
}
