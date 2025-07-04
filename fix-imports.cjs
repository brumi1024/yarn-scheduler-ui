const fs = require('fs');
const path = require('path');

// Function to recursively find all TypeScript files
function findTsFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.includes('node_modules') && !item.includes('.')) {
      findTsFiles(fullPath, files);
    } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Fix imports in a file
function fixImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Replace relative imports from src structure
  const replacements = [
    // Types
    [/from ['"]\.\.\/types/g, "from '~/lib/types"],
    [/from ['"]\.\.\/\.\.\/types/g, "from '~/lib/types"],
    [/from ['"]\.\.\/\.\.\/\.\.\/types/g, "from '~/lib/types"],
    
    // Utils
    [/from ['"]\.\.\/utils/g, "from '~/lib/utils"],
    [/from ['"]\.\.\/\.\.\/utils/g, "from '~/lib/utils"],
    [/from ['"]\.\.\/\.\.\/\.\.\/utils/g, "from '~/lib/utils"],
    
    // API
    [/from ['"]\.\.\/api/g, "from '~/lib/api"],
    [/from ['"]\.\.\/\.\.\/api/g, "from '~/lib/api"],
    [/from ['"]\.\.\/\.\.\/\.\.\/api/g, "from '~/lib/api"],
    
    // Config
    [/from ['"]\.\.\/config/g, "from '~/lib/config"],
    [/from ['"]\.\.\/\.\.\/config/g, "from '~/lib/config"],
    [/from ['"]\.\.\/\.\.\/\.\.\/config/g, "from '~/lib/config"],
    
    // Store
    [/from ['"]\.\.\/store/g, "from '~/lib/store"],
    [/from ['"]\.\.\/\.\.\/store/g, "from '~/lib/store"],
    [/from ['"]\.\.\/\.\.\/\.\.\/store/g, "from '~/lib/store"],
    
    // Hooks
    [/from ['"]\.\.\/hooks/g, "from '~/hooks"],
    [/from ['"]\.\.\/\.\.\/hooks/g, "from '~/hooks"],
    
    // Components
    [/from ['"]\.\.\/components/g, "from '~/components"],
    [/from ['"]\.\.\/\.\.\/components/g, "from '~/components"],
    
    // Test utils
    [/from ['"]\.\.\/test\//g, "from '~/test/"],
    [/from ['"]\.\.\/\.\.\/test\//g, "from '~/test/"],
    
    // Mocks
    [/from ['"]\.\.\/\.\.\/__mocks__/g, "from '~/__mocks__"],
    [/from ['"]\.\.\/__mocks__/g, "from '~/__mocks__"],
  ];
  
  for (const [pattern, replacement] of replacements) {
    const newContent = content.replace(pattern, replacement);
    if (newContent !== content) {
      content = newContent;
      modified = true;
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed imports in: ${path.relative(process.cwd(), filePath)}`);
  }
}

// Main execution
const libPath = path.join(__dirname, 'app', 'lib');
const files = findTsFiles(libPath);

console.log(`Found ${files.length} TypeScript files to process`);

for (const file of files) {
  fixImports(file);
}

console.log('Import fixing complete!');