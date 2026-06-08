export async function readFile(): Promise<never> {
  throw new Error('[editor] fs.readFile is not available in browser context');
}
