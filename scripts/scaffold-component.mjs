import fs from 'node:fs';
import path from 'node:path';

const LEVEL_MAP = {
  atom: 'atoms',
  atoms: 'atoms',
  molecule: 'molecules',
  molecules: 'molecules',
  organism: 'organisms',
  organisms: 'organisms',
};

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    index += 1;
  }
  return args;
}

function toKebabCase(input) {
  return input
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
}

function toPascalCase(input) {
  return input
    .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
    .replace(/^(.)/, (char) => char.toUpperCase());
}

function printUsage() {
  console.log('Usage: npm run scaffold:component -- --level <atom|molecule|organism> --name <ComponentName> [--folder <folder-name>] [--no-style]');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFileSafe(filePath, content) {
  if (fs.existsSync(filePath)) {
    throw new Error(`File already exists: ${filePath}`);
  }
  fs.writeFileSync(filePath, content, 'utf8');
}

function createComponentTemplate(componentName, cssClassName) {
  return `import React from 'react';
import './${componentName}.scss';

type ${componentName}Props = {
};

const ${componentName}: React.FC<${componentName}Props> = () => {
  return <div className="${cssClassName}">${componentName}</div>;
};

export default ${componentName};
`;
}

function createStyleTemplate(cssClassName) {
  return `.${cssClassName} {
}
`;
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const levelInput = String(args.level ?? args.type ?? '').toLowerCase();
    const atomicFolder = LEVEL_MAP[levelInput];
    const rawName = String(args.name ?? '').trim();

    if (!atomicFolder || !rawName) {
      printUsage();
      process.exit(1);
    }

    const componentName = toPascalCase(rawName);
    const folderName = String(args.folder ?? toKebabCase(componentName));
    const cssClassName = toKebabCase(componentName);
    const withStyle = args['no-style'] !== true;

    const componentDir = path.resolve(process.cwd(), 'src', 'components', atomicFolder, folderName);
    ensureDir(componentDir);

    const tsxPath = path.join(componentDir, `${componentName}.tsx`);
    writeFileSafe(tsxPath, createComponentTemplate(componentName, cssClassName));

    if (withStyle) {
      const scssPath = path.join(componentDir, `${componentName}.scss`);
      writeFileSafe(scssPath, createStyleTemplate(cssClassName));
    }

    console.log(`Created ${levelInput} component at: ${path.relative(process.cwd(), componentDir)}`);
    console.log(`- ${path.relative(process.cwd(), tsxPath)}`);
    if (withStyle) {
      console.log(`- ${path.relative(process.cwd(), path.join(componentDir, `${componentName}.scss`))}`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
