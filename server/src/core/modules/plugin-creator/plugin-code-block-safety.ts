const forbiddenPatterns = [
  /\bimport\s+/,
  /\brequire\s*\(/,
  /\bprocess\b/,
  /\bchild_process\b/,
  /\bnode:/,
  /\bfs\b/,
  /\beval\s*\(/,
  /\bFunction\s*\(/,
  /\bglobalThis\b/,
  /\b__dirname\b/,
  /\b__filename\b/,
];

export function assertSafePluginCreatorCodeBlock(source: string): void {
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(source)) {
      throw new Error("Code block contains not allowed runtime access");
    }
  }
}
