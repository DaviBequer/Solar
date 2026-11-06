// Publica o Sonit no GitHub Pages.
// Uso: npm run publicar            -> sobe a versão (3.0.0 -> 3.0.1), testa, gera e publica
//      npm run publicar -- minor   -> 3.0.1 -> 3.1.0
//      npm run publicar -- --manter -> publica sem mudar a versão
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, cpSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const run = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', ...opts });
const out = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim();

const args = process.argv.slice(2);
const keep = args.includes('--manter');
const level = args.includes('major') ? 'major' : args.includes('minor') ? 'minor' : 'patch';

if (!keep) run(`npm version ${level} --no-git-tag-version`, { stdio: 'pipe' });
const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
console.log(`\nPublicando Sonit v${version}\n`);

run('npm test');
run('npm run build');
writeFileSync('dist/.nojekyll', '');

run('git add -A');
const pending = out('git status --porcelain');
if (pending) run(`git commit -q -m "Publica v${version}"`);
run('git push -q origin HEAD:main');

const remote = out('git remote get-url origin');
const tmp = mkdtempSync(join(tmpdir(), 'sonit-pages-'));
try {
  // Atualiza o ramo gh-pages com um commit novo por versão (sem reescrever histórico)
  try {
    execSync(`git clone -q --depth 1 --branch gh-pages ${remote} ${tmp}`, { stdio: 'pipe' });
  } catch {
    run('git init -q -b gh-pages', { cwd: tmp });
    run(`git remote add origin ${remote}`, { cwd: tmp });
  }
  for (const entry of readdirSync(tmp)) if (entry !== '.git') rmSync(join(tmp, entry), { recursive: true, force: true });
  cpSync('dist', tmp, { recursive: true });
  const name = out('git config user.name') || 'Sonit';
  const email = out('git config user.email') || 'sonit@users.noreply.github.com';
  run('git add -A', { cwd: tmp });
  run(`git -c user.name="${name}" -c user.email="${email}" commit -q --allow-empty -m "Site v${version}"`, { cwd: tmp });
  run('git push -q origin gh-pages', { cwd: tmp });
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

console.log(`\nPronto: v${version} publicada em https://davibequer.github.io/Solar/\n`);
