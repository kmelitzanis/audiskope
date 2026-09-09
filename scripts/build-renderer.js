// Compile browser-native ES modules with the existing TypeScript dependency.
const ts = require('typescript');
const fs = require('fs');
const path = require('path');
const root = path.resolve('src/renderer');
function compile(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const source = path.join(directory, entry.name);
    if (entry.isDirectory()) { compile(source); continue; }
    if (!entry.name.endsWith('.ts')) continue;
    const result = ts.transpileModule(fs.readFileSync(source, 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ES2020 }
    });
    const output = path.join('dist/renderer', path.relative(root, source).replace(/\.ts$/, '.js'));
    fs.mkdirSync(path.dirname(output), { recursive: true });
    // Browsers require explicit extensions for relative module specifiers.
    fs.writeFileSync(output, result.outputText.replace(/(from\s+['"])(\.[^'"]+)(['"])/g,
      (_, prefix, specifier, quote) => prefix + specifier + (path.extname(specifier) ? '' : '.js') + quote));
  }
}
compile(root);
console.log('Renderer compiled successfully.');
