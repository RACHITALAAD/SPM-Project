import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';

const CLOUDINARY_API = 'https://api.cloudinary.com/v1_1';

function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      'Cloudinary is selected, but CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, or CLOUDINARY_API_SECRET is missing.',
    );
  }

  return { cloudName, apiKey, apiSecret };
}

function basicAuth(apiKey, apiSecret) {
  return `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`;
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function signDownloadParameters(parameters, apiSecret) {
  const stringToSign = Object.keys(parameters)
    .sort()
    .map((key) => `${key}=${parameters[key]}`)
    .join('&');

  // Cloudinary API signatures use SHA-1 of the sorted parameter string + API secret.
  return createHash('sha1').update(`${stringToSign}${apiSecret}`, 'utf8').digest('hex');
}

export function assertCloudinaryConfig() {
  getCloudinaryConfig();
}

export async function uploadToCloudinary(file) {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  if (!file?.buffer?.length) {
    throw new Error('The uploaded file is empty or is not available in memory.');
  }

  const extension = path.extname(file.originalname).toLowerCase();
  const publicId = `assignment-submissions/${randomUUID()}${extension}`;
  const form = new FormData();
  const fileBlob = new Blob([file.buffer], {
    type: file.mimetype || 'application/octet-stream',
  });

  form.append('file', fileBlob, path.basename(file.originalname));
  form.append('public_id', publicId);
  form.append('type', 'authenticated');

const endpoint = `${CLOUDINARY_API}/${encodeURIComponent(cloudName)}/raw/upload`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: basicAuth(apiKey, apiSecret) },
    body: form,
    signal: AbortSignal.timeout(60_000),
  });
  const result = await readJson(response);

  if (!response.ok || result.error) {
    throw new Error(result.error?.message || `Cloudinary upload failed (${response.status}).`);
  }

  if (!result.public_id) {
    throw new Error('Cloudinary did not return a public ID for the uploaded file.');
  }

  return {
    publicId: result.public_id,
    format: result.format || extension.replace(/^\./, ''),
  };
}

export async function deleteFromCloudinary(publicId) {
  if (!publicId) return;

  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  const endpoint = new URL(
    `${CLOUDINARY_API}/${encodeURIComponent(cloudName)}/resources/raw/authenticated`,
  );
  endpoint.searchParams.append('public_ids[]', publicId);

  const response = await fetch(endpoint, {
    method: 'DELETE',
    headers: { Authorization: basicAuth(apiKey, apiSecret) },
    signal: AbortSignal.timeout(30_000),
  });
  const result = await readJson(response);

  if (!response.ok || result.error) {
    throw new Error(result.error?.message || `Cloudinary deletion failed (${response.status}).`);
  }
}

export function getCloudinaryDownloadUrl(publicId, format) {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  if (!publicId || !format) {
    throw new Error('Cloudinary file information is incomplete.');
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const parameters = {
    attachment: 'true',
    expires_at: String(timestamp + 300),
    format: String(format),
    public_id: String(publicId),
    timestamp: String(timestamp),
    type: 'authenticated',
  };
  const signature = signDownloadParameters(parameters, apiSecret);
  const query = new URLSearchParams({
    ...parameters,
    api_key: apiKey,
    signature,
  });

  return `${CLOUDINARY_API}/${encodeURIComponent(cloudName)}/raw/download?${query.toString()}`;
}
