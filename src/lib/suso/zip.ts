import { strFromU8, unzip, zipSync, strToU8 } from "fflate";

const KEEP_EXTENSION = /\.(tab|csv|txt|do|json)$/i;
const MAX_FILE_BYTES = 40_000_000;

export function zipTextFiles(files: Record<string, string>): Uint8Array {
  const entries: Record<string, Uint8Array> = {};
  for (const [name, text] of Object.entries(files)) {
    entries[name] = strToU8(text);
  }
  return zipSync(entries);
}

export function unzipSurvey(
  data: Uint8Array,
): Promise<{ files: Record<string, string>; skipped: string[] }> {
  const skipped: string[] = [];
  return new Promise((resolve, reject) => {
    unzip(
      data,
      {
        filter(file) {
          const base = file.name.split(/[/\\]/).pop() ?? file.name;
          const keep =
            KEEP_EXTENSION.test(base) &&
            !base.startsWith(".") &&
            file.originalSize <= MAX_FILE_BYTES;
          if (!keep) skipped.push(file.name);
          return keep;
        },
      },
      (error, unzipped) => {
        if (error) {
          reject(error);
          return;
        }
        const files: Record<string, string> = {};
        for (const [name, bytes] of Object.entries(unzipped)) {
          files[name] = strFromU8(bytes);
        }
        resolve({ files, skipped });
      },
    );
  });
}
