import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';
async function login(page:Page, role:'admin'|'hr'|'employee') {
 const port=role==='admin'?3001:3000;
 await page.goto(`http://localhost:${port}/login?role=${role}`);
 await page.getByLabel('Work email').fill(`${role}@teamora.test`);
 await page.getByLabel('Password',{exact:true}).fill(role==='admin'?'Initial-Admin-Password!':role==='hr'?'Browser-HR-Password!':'Browser-Employee-Password!');
 await page.getByRole('button',{name:'Sign in to your workspace'}).click();
 await expect(page).toHaveURL(new RegExp(`${role==='admin'?'':role+'/'}dashboard$`));
 await page.locator('.workspace-header').waitFor();
}
test('Design system: role routing, persisted themes, reduced motion, mobile navigation, suggestions and dialogs',async({page,browser})=>{
 await mkdir('.local/screenshots/after',{recursive:true});
 await page.goto('http://localhost:3000/');
 await expect(page.getByRole('heading',{name:/A place for/})).toBeVisible();
 await page.getByRole('link',{name:/PEOPLE OPERATIONS HR/}).click();
 await expect(page).toHaveURL(/login\?role=hr/);await page.goBack();await expect(page).toHaveURL('http://localhost:3000/');
 await page.getByRole('button',{name:'dark theme',exact:true}).click();await page.reload();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await page.getByRole('button',{name:'light theme',exact:true}).click();
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await expect(page.locator('canvas')).toHaveCount(0);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await login(page,'hr');await page.goto('http://localhost:3000/hr/employees');
 const search=page.getByRole('combobox',{name:'Search people'});
 await search.fill('Employee');await expect(page.getByRole('option',{name:/Employee Tester/})).toBeVisible();
 await search.press('ArrowDown');await search.press('Enter');await expect(page.getByRole('dialog',{name:'Employee details'})).toBeVisible();
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(search).toBeFocused();
 await page.getByRole('button',{name:'Clear search',exact:true}).click();
 await page.getByLabel('Filter account status').selectOption('false');await expect(page.getByText('Your team starts here.')).toBeVisible();
 await page.getByLabel('Filter account status').selectOption('true');await expect(page.getByRole('cell',{name:/Employee Tester/})).toBeVisible();
 await search.fill('ZZZZ-no-person');await expect(page.getByText('No matches. Try a name, employee ID, or department.')).toBeVisible();await search.press('Escape');await expect(search).toHaveAttribute('aria-expanded','false');await page.getByRole('button',{name:'Clear search',exact:true}).click();
 await page.getByRole('button',{name:'Collapse sidebar'}).click();await page.reload();await expect(page.locator('.workspace')).toHaveClass(/workspace-compact/);await page.getByRole('button',{name:'Expand sidebar'}).click();
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Open navigation'}).click();await expect(page.getByRole('dialog',{name:'Teamora'})).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Open navigation'})).toBeFocused();
 await page.getByRole('button',{name:'Open notifications'}).click();await expect(page.getByRole('region',{name:'Notifications'})).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Open notifications'})).toBeFocused();
 await page.getByRole('button',{name:'Open Teamora AI'}).click();await expect(page.getByRole('dialog',{name:'Teamora AI'})).toBeVisible();await page.getByLabel('Message Teamora AI').fill('Who is on leave today?');await page.getByRole('button',{name:'Send message'}).click();await expect(page.getByRole('alert')).toContainText(/configured|unavailable|AI|Gemini/i);await expect(page.getByRole('button',{name:'Try again',exact:true})).toBeVisible();await page.keyboard.press('Escape');
 const reduced=await browser.newContext({viewport:{width:375,height:812},reducedMotion:'reduce'});const rp=await reduced.newPage();const heavy:string[]=[];rp.on('request',r=>{if(r.url().endsWith('.glb'))heavy.push(r.url());});await rp.goto('http://localhost:3000/login');await rp.getByLabel('Work email').waitFor();expect(heavy).toEqual([]);await reduced.close();
});

test('Responsive route and accessibility audit in both themes',async({browser})=>{
 test.setTimeout(300000);
 const widths=[375,390,430,768,1024,1366,1440,1920];const results:unknown[]=[];const violations:unknown[]=[];
 for(const role of ['admin','hr','employee'] as const){
  const context=await browser.newContext({viewport:{width:1440,height:900}});const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await login(page,role);
  const routes=role==='admin'?['dashboard','employees','hr-accounts','attendance','leave','payroll','organization','leave-settings','audit','profile']:role==='hr'?['hr/dashboard','hr/employees','hr/attendance','hr/leave','hr/payroll','hr/my-attendance','hr/my-leave','hr/profile']:['employee/dashboard','employee/attendance','employee/leave','employee/payslips','employee/profile'];
  for(const route of routes){await page.goto(`http://localhost:${role==='admin'?3001:3000}/${route}`);await page.locator('.workspace-header').waitFor();await page.locator('main h1').waitFor();
   for(const theme of ['light','dark']){await page.evaluate(t=>{localStorage.setItem('teamora-theme',t);document.documentElement.dataset.theme=t;},theme);
    for(const width of widths){await page.setViewportSize({width,height:width===1366?640:900});const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);results.push({role,route,theme,width,overflow});expect.soft(overflow,`${role}/${route}/${theme}/${width} page overflow`).toBe(false);}
    await page.setViewportSize({width:1440,height:1000});
    if(['dashboard','hr/dashboard','employee/dashboard','hr/payroll','payroll'].includes(route))await page.screenshot({path:`.local/screenshots/after/${route.replaceAll('/','-')}-${theme}.png`,fullPage:true});
    if(route.endsWith('dashboard')||route.endsWith('employees')||route==='organization'){
      const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();violations.push({route,theme,violations:axe.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))});
    }
   }
   await page.setViewportSize({width:390,height:844});if(route.endsWith('dashboard')||route.endsWith('attendance')||route.endsWith('payroll'))await page.screenshot({path:`.local/screenshots/after/${route.replaceAll('/','-')}-mobile.png`,fullPage:true});
  }
  expect.soft(errors).toEqual([]);await context.close();
 }
 await writeFile('.local/responsive-results.json',JSON.stringify(results,null,2));await writeFile('.local/accessibility-results.json',JSON.stringify(violations,null,2));
});
