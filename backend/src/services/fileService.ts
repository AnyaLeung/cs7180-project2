import { randomUUID } from 'crypto';
import { supabase } from './supabaseClient';

const BUCKET = 'python-files';
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BadRequestError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export interface FileRecord {
  id: string;
  filename: string;
  storage_path: string;
  size_bytes: number;
  uploaded_at: string;
}

export interface UploadInput {
  buffer: Buffer;
  originalname: string;
  size: number;
}

export interface UploadResult {
  id: string;
  filename: string;
  storagePath: string;
  sizeBytes: number;
  uploadedAt: string;
}

interface ExampleFileInternal {
  id: string;
  filename: string;
  sizeBytes: number;
  uploadedAt: string;
  content: string;
}

const EXAMPLE_FILES: ExampleFileInternal[] = [
  {
    id: 'example-1',
    filename: 'analysis_plan.py',
    content: `# Step 1: Load the dataset from CSV
# Step 2: Clean missing values
# Step 3: Filter rows where age > 18
# Step 4: Compute summary statistics
# Step 5: Visualize the distribution of income

import pandas as pd

# This is just a regular comment, not an instruction
# Author: demo user

df = pd.read_csv("data.csv")
print(df.head())
`,
    sizeBytes: Buffer.byteLength(
      `# Step 1: Load the dataset from CSV
# Step 2: Clean missing values
# Step 3: Filter rows where age > 18
# Step 4: Compute summary statistics
# Step 5: Visualize the distribution of income

import pandas as pd

# This is just a regular comment, not an instruction
# Author: demo user

df = pd.read_csv("data.csv")
print(df.head())
`,
      'utf8'
    ),
    uploadedAt: new Date(0).toISOString(),
  },
  {
    id: 'example-2',
    filename: 'data_cleaning.py',
    content: `# Step 1: Read raw data from the API
# Step 2: Transform column names to snake_case


import pandas as pd
import requests
# Step 3: Merge with the reference table
# Step 4: Export cleaned data to Parquet

# Configuration
API_URL = "https://api.example.com/data"
`,
    sizeBytes: Buffer.byteLength(
      `# Step 1: Read raw data from the API
# Step 2: Transform column names to snake_case


import pandas as pd
import requests
# Step 3: Merge with the reference table
# Step 4: Export cleaned data to Parquet

# Configuration
API_URL = "https://api.example.com/data"
`,
      'utf8'
    ),
    uploadedAt: new Date(0).toISOString(),
  },
];

function toCamelCase(row: FileRecord): UploadResult {
  return {
    id: row.id,
    filename: row.filename,
    storagePath: row.storage_path,
    sizeBytes: row.size_bytes,
    uploadedAt: row.uploaded_at,
  };
}

export async function upload(
  userId: string,
  file: UploadInput
): Promise<UploadResult> {
  const name = file.originalname.toLowerCase();
  if (!name.endsWith('.py')) {
    throw new BadRequestError('Only .py files are allowed');
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new BadRequestError('File size must not exceed 5MB');
  }

  const fileId = randomUUID();
  const storagePath = `${userId}/${fileId}.py`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file.buffer, {
      contentType: 'text/x-python',
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('files')
    .insert({
      user_id: userId,
      filename: file.originalname,
      storage_path: storagePath,
      size_bytes: file.size,
    })
    .select('id, filename, storage_path, size_bytes, uploaded_at')
    .single();

  if (error) throw error;
  if (!data) throw new Error('Insert succeeded but no data returned');

  return toCamelCase(data as FileRecord);
}

export async function listByUserId(userId: string): Promise<UploadResult[]> {
  const { data, error } = await supabase
    .from('files')
    .select('id, filename, storage_path, size_bytes, uploaded_at')
    .eq('user_id', userId)
    .order('uploaded_at', { ascending: false });

  if (error) throw error;
  const dbFiles = (data ?? []).map((row) => toCamelCase(row as FileRecord));
  const exampleFiles: UploadResult[] = EXAMPLE_FILES.map((f) => ({
    id: f.id,
    filename: f.filename,
    storagePath: `examples/${f.id}.py`,
    sizeBytes: f.sizeBytes,
    uploadedAt: f.uploadedAt,
  }));
  return [...exampleFiles, ...dbFiles];
}

export async function deleteById(
  fileId: string,
  userId: string
): Promise<'ok' | 'not_found' | 'forbidden'> {
  const { data: row, error: fetchError } = await supabase
    .from('files')
    .select('id, user_id, storage_path')
    .eq('id', fileId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!row) return 'not_found';
  if ((row as { user_id: string }).user_id !== userId) return 'forbidden';

  const storagePath = (row as { storage_path: string }).storage_path;
  await supabase.storage.from(BUCKET).remove([storagePath]);

  const { error: deleteError } = await supabase.from('files').delete().eq('id', fileId);
  if (deleteError) throw deleteError;

  return 'ok';
}

export async function getFileContentById(
  fileId: string,
  userId: string
): Promise<{ content: string; filename: string } | 'not_found' | 'forbidden'> {
  const example = EXAMPLE_FILES.find((f) => f.id === fileId);
  if (example) {
    return { content: example.content, filename: example.filename };
  }

  const { data: row, error: fetchError } = await supabase
    .from('files')
    .select('filename, storage_path, user_id')
    .eq('id', fileId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!row) return 'not_found';
  if ((row as { user_id: string }).user_id !== userId) return 'forbidden';

  const storagePath = (row as { storage_path: string }).storage_path;
  const filename = (row as { filename: string }).filename;

  const { data: blob, error: downloadError } = await supabase.storage
    .from(BUCKET)
    .download(storagePath);

  if (downloadError) throw downloadError;
  if (!blob) throw new Error('Download returned no data');

  const content = await blob.text();
  return { content, filename };
}
