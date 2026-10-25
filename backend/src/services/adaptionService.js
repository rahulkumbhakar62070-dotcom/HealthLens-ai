import dotenv from 'dotenv';
dotenv.config();

const ADAPTION_API_BASE = 'https://api.prod.adaptionlabs.ai/api/v1';

export class AdaptionConfigurationError extends Error {
  constructor(message = 'ADAPTION_API_KEY is not configured in backend environment variables.') {
    super(message);
    this.name = 'AdaptionConfigurationError';
  }
}

export class AdaptionApiError extends Error {
  constructor(message, statusCode, details = null) {
    super(message);
    this.name = 'AdaptionApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Validates whether the Adaption API key is configured in the environment.
 */
export const isAdaptionConfigured = () => {
  const key = process.env.ADAPTION_API_KEY;
  return Boolean(key && key.trim().length > 0 && key !== 'your_adaption_api_key_here');
};

/**
 * Returns standard authentication headers for Adaption Labs API.
 */
const getAuthHeaders = () => {
  if (!isAdaptionConfigured()) {
    throw new AdaptionConfigurationError(
      'Cannot execute request to Adaption Labs: ADAPTION_API_KEY is missing or invalid. Please add your API key to backend/.env.'
    );
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.ADAPTION_API_KEY.trim()}`,
  };
};

/**
 * List datasets in the account.
 * Official Endpoint: GET /api/v1/datasets
 */
export const listDatasets = async () => {
  const headers = getAuthHeaders();
  const response = await fetch(`${ADAPTION_API_BASE}/datasets`, {
    method: 'GET',
    headers,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new AdaptionApiError(
      data?.message || `Failed to fetch datasets list (HTTP ${response.status})`,
      response.status,
      data
    );
  }

  return data;
};

/**
 * Fetch available domain and subdomain codes from Adaption Labs.
 * Official Endpoint: GET /api/v1/datasets/invent_domains
 */
export const listInventDomains = async () => {
  const headers = getAuthHeaders();
  const response = await fetch(`${ADAPTION_API_BASE}/datasets/invent_domains`, {
    method: 'GET',
    headers,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new AdaptionApiError(
      data?.message || `Failed to fetch invent domains (HTTP ${response.status})`,
      response.status,
      data
    );
  }

  return data;
};

/**
 * Estimates credit cost for dataset generation without creating or charging.
 * Official Endpoint: POST /api/v1/datasets/invent with estimate: true
 */
export const estimateInventDataset = async ({
  prompt,
  rows = 25,
  domains = ['medical'],
  subdomains = ['medical.symptoms_diagnosis'],
}) => {
  const headers = getAuthHeaders();
  const payload = {
    dataset_prompt: prompt,
    rows: Number(rows),
    domains,
    subdomains,
    estimate: true,
  };

  const response = await fetch(`${ADAPTION_API_BASE}/datasets/invent`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new AdaptionApiError(
      data?.message || `Failed to estimate dataset cost (HTTP ${response.status})`,
      response.status,
      data
    );
  }

  return data;
};

/**
 * Creates and starts generation of a synthetic dataset on Adaption Labs.
 * Official Endpoint: POST /api/v1/datasets/invent
 */
export const inventDataset = async ({
  name = 'HealthLens Synthetic Benchmark',
  prompt,
  rows = 25,
  domains = ['medical'],
  subdomains = ['medical.symptoms_diagnosis'],
  trainingType = 'instruction_dataset',
}) => {
  const headers = getAuthHeaders();
  const payload = {
    name,
    dataset_prompt: prompt,
    rows: Number(rows),
    domains,
    subdomains,
    training_type: trainingType,
  };

  const response = await fetch(`${ADAPTION_API_BASE}/datasets/invent`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new AdaptionApiError(
      data?.message || `Failed to create invented dataset on Adaption Labs (HTTP ${response.status})`,
      response.status,
      data
    );
  }

  return data; // Returns { id, status: "running", ... }
};

/**
 * Polls the current generation status of a dataset on Adaption Labs.
 * Official Endpoint: GET /api/v1/datasets/{dataset_id}
 */
export const getDatasetStatus = async (datasetId) => {
  if (!datasetId) throw new Error('Dataset ID is required to query status');
  const headers = getAuthHeaders();

  const response = await fetch(`${ADAPTION_API_BASE}/datasets/${datasetId}`, {
    method: 'GET',
    headers,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new AdaptionApiError(
      data?.message || `Failed to query dataset status for ${datasetId} (HTTP ${response.status})`,
      response.status,
      data
    );
  }

  return data;
};

/**
 * Downloads the completed dataset rows from Adaption Labs.
 * Official Endpoint: GET /api/v1/datasets/{dataset_id}/download
 */
export const downloadDataset = async (datasetId) => {
  if (!datasetId) throw new Error('Dataset ID is required to download dataset');
  const headers = getAuthHeaders();

  const response = await fetch(`${ADAPTION_API_BASE}/datasets/${datasetId}/download`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new AdaptionApiError(
      errorData?.message || `Failed to download dataset ${datasetId} (HTTP ${response.status})`,
      response.status,
      errorData
    );
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return await response.json();
  }
  return await response.text();
};
