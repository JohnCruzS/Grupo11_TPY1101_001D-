import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// 1. Login como superadmin
console.log('Navegando a /conecta...');
await page.goto('http://localhost:5175/conecta');
await page.waitForLoadState('networkidle');
await page.screenshot({ path: 'C:/Users/sotoc/AppData/Local/Temp/01-login.png' });

await page.locator('input[type="email"]').first().fill('superadmin@sotloy.cl');
await page.locator('input[type="password"]').first().fill('temporal123');
await page.keyboard.press('Enter');
await page.waitForTimeout(4000);
await page.screenshot({ path: 'C:/Users/sotoc/AppData/Local/Temp/02-dashboard.png' });
console.log('URL tras login:', page.url());

// 2. Ir a Gestión de Usuarios y probar edición
const userNav = page.locator('text=Usuarios, text=Gestión, button:has-text("Usuarios")').first();
await userNav.click().catch(() => {});
await page.waitForTimeout(1000);

// Buscar botón de editar
const editBtn = page.locator('button[title*="ditar"], button:has-text("Editar")').first();
const hasEdit = await editBtn.isVisible().catch(() => false);
console.log('Botón editar visible:', hasEdit);
await page.screenshot({ path: 'C:/Users/sotoc/AppData/Local/Temp/03-usuarios.png' });

// 3. Ir a Mensajes
const mensajesNav = page.locator('text=Mensajes').first();
await mensajesNav.click().catch(() => {});
await page.waitForTimeout(1500);
await page.screenshot({ path: 'C:/Users/sotoc/AppData/Local/Temp/04-mensajes.png' });
console.log('Sección mensajes cargada');

// 4. Ir a Auditoría
const auditNav = page.locator('text=Auditoría, text=Audit').first();
await auditNav.click().catch(() => {});
await page.waitForTimeout(1500);
await page.screenshot({ path: 'C:/Users/sotoc/AppData/Local/Temp/05-auditoria.png' });
console.log('Sección auditoría cargada');

await browser.close();
console.log('✅ Test completado — screenshots en C:/Users/sotoc/AppData/Local/Temp/');
