import { test, expect } from '@grafana/plugin-e2e';
import { CDFLoginOptions, CDFSecureLoginOptions } from '../src/types';
import dotenv from 'dotenv';

dotenv.config();

test('smoke: should render config editor', async ({ createDataSourceConfigPage, readProvisionedDataSource, page }) => {
  const ds = await readProvisionedDataSource({ fileName: 'datasources.yml' });
  await createDataSourceConfigPage({ type: ds.type });
  await expect(page.getByLabel('Project')).toBeVisible();
});

test('"Save & test" should be successful when configuration is valid', async ({
  createDataSourceConfigPage,
  readProvisionedDataSource,
  page,
}) => {
  const ds = await readProvisionedDataSource<CDFLoginOptions, CDFSecureLoginOptions>({ fileName: 'datasources.yml' });
  const configPage = await createDataSourceConfigPage({ type: ds.type });

  // Set input mode to guided
  await page.locator('#config-editor-login-helper-mode').click();
  await page.getByRole('option', { name: 'Guided' }).click();

  // Fill project fields
  await page.getByRole('textbox', { name: 'Project' }).fill(ds.jsonData.cdfProject ?? '');
  await page.getByRole('textbox', { name: 'CDF Cluster' }).fill(ds.jsonData.cdfCluster ?? '');

  // Set login flow to client credentials
  await page.locator('#config-editor-login-flow').click();
  await page.getByRole('option', { name: 'Client Credentials' }).click();

  await page.locator('#config-editor-idp-provider').waitFor({ state: 'visible' });
  await page.locator('#config-editor-idp-provider').click();
  await page.getByRole('option', { name: ds.jsonData.idpProvider ?? '' }).click();
  await page.getByLabel('Tenant ID').fill(ds.jsonData.idpTenantID ?? '');
  await page.getByLabel('Client ID').fill(ds.jsonData.clientId ?? '');
  await page.getByLabel('Client Secret').fill(process.env.IDP_CLIENT_SECRET ?? '');
  await expect(configPage.saveAndTest()).toBeOK();
});

test('"Save & test" should fail when configuration is invalid', async ({
  createDataSourceConfigPage,
  readProvisionedDataSource,
  page,
}) => {
  const ds = await readProvisionedDataSource<CDFLoginOptions, CDFSecureLoginOptions>({ fileName: 'datasources.yml' });
  const configPage = await createDataSourceConfigPage({ type: ds.type });

  // Only fill project, leave authentication empty
  await page.getByRole('textbox', { name: 'Project' }).fill(ds.jsonData.cdfProject ?? '');

  await expect(configPage.saveAndTest()).not.toBeOK();
  await expect(configPage).toHaveAlert('error');
});
