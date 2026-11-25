import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir:'./tests/e2e',
  timeout:45000,
  expect:{timeout:8000},
  fullyParallel:false,
  forbidOnly:Boolean(process.env.CI),
  retries:process.env.CI?1:0,
  workers:1,
  reporter:[['line'],['html',{outputFolder:'playwright-report',open:'never'}]],
  use:{
    baseURL:'http://127.0.0.1:4173/depofibra-crm/',
    channel:'chrome',
    headless:true,
    trace:'retain-on-failure',
    screenshot:'only-on-failure'
  },
  webServer:{
    command:'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url:'http://127.0.0.1:4173/depofibra-crm/',
    reuseExistingServer:!process.env.CI,
    timeout:40000
  }
});
