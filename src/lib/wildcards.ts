export function processWildcards(str: string): string {
  let prev: string | null = null;
  let result = str;
  while (prev !== result) {
    prev = result;
    result = result.replace(/\{[^{}]*\}/g, (match) => {
      const options = match.slice(1, -1).split('|');
      return options[Math.floor(Math.random() * options.length)].trim();
    });
  }
  return result;
}
