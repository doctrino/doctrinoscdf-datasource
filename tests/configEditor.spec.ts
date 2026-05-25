import { test, expect } from '@grafana/plugin-e2e';
import { CDFLoginOptions, CDFSecureLoginOptions } from '../src/types';

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
  await page.getByLabel('Input mode').click();
  await page.getByRole('option', { name: 'Guided' }).click();

  // Fill project fields
  await page.getByRole('textbox', { name: 'Project' }).fill(ds.jsonData.cdfProject ?? '');
  await page.getByRole('textbox', { name: 'CDF Cluster' }).fill(ds.jsonData.cdfCluster ?? '');

  // Set login flow to client credentials
  await page.getByLabel('Login Flow').click();
  await page.getByRole('option', { name: 'Client Credentials' }).click();

  await page.getByLabel('IDP Provider').fill(ds.jsonData.idpProvider ?? '');
  await page.getByLabel('Tenant ID').fill(ds.jsonData.idpProvider ?? '');
  await page.getByLabel('Client ID').fill(ds.jsonData.clientId ?? '');

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
