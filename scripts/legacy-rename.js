import fs from 'fs';
import path from 'path';

// One-off migration script from the 2026-05-07 thematic rename pass.
// Keep for audit history; do not run during normal development.

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src');
files.push('./tests/state.test.ts', './tests/tick.test.ts', './tests/save.test.ts', './tests/unlock.test.ts', './tests/combat.test.ts', './tests/location.test.ts', './tests/events.test.ts', './tests/state_managers.test.ts', './tests/basic.test.ts');

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\bknowledge\b/g, 'insight');
  content = content.replace(/\bstamina\b/g, 'essence');
  content = content.replace(/\bSTAMINA\b/g, 'ESSENCE');
  content = content.replace(/\bStamina\b/g, 'Essence');
  // Handle some UI labels
  content = content.replace(/见闻:/g, '神识:');
  content = content.replace(/体力:/g, '精元:');
  content = content.replace(/读书/g, '观想');
  content = content.replace(/休息/g, '调息');
  content = content.replace(/dushu/g, 'guanxiang');
  content = content.replace(/xiuxi/g, 'tiaoxi');

  fs.writeFileSync(file, content, 'utf8');
});
