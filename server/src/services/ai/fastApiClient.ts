import axios, { AxiosError } from 'axios';

const FASTAPI_BASE_URL = process.env.FASTAPI_URL || 'http://localhost:8000';
const FASTAPI_TIMEOUT = parseInt(process.env.FASTAPI_TIMEOUT || '15000');

export const fastApiClient = axios.create({
  baseURL: FASTAPI_BASE_URL,
  timeout: FASTAPI_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

fastApiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.code === 'ECONNABORTED') {
      const timeoutError = new Error('FastAPI request timeout');
      (timeoutError as any).code = 'FASTAPI_TIMEOUT';
      throw timeoutError;
    }
    throw error;
  }
);

export default fastApiClient;
