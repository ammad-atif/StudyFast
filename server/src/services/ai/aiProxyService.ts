import fastApiClient from './fastApiClient';

// When set to 0, Axios waits indefinitely for the embeddings call to complete.
const EMBEDDINGS_TIMEOUT_MS = parseInt(process.env.FASTAPI_EMBEDDINGS_TIMEOUT || '0', 10);

export class UpstreamTimeoutError extends Error {
  constructor(message: string = 'Upstream service timeout') {
    super(message);
    this.name = 'UpstreamTimeoutError';
  }
}

export class UpstreamServiceError extends Error {
  constructor(message: string = 'Upstream service error', public statusCode: number = 500) {
    super(message);
    this.name = 'UpstreamServiceError';
  }
}

export const aiProxyService = {
  async createEmbeddings(postId: string, chatLink: string, requestId: string) {
    try {
      const response = await fastApiClient.post(
        '/api/embeddings',
        { post_id: postId, chat_link: chatLink },
        {
          headers: { 'x-request-id': requestId },
          // Embedding generation can be long-running; when EMBEDDINGS_TIMEOUT_MS=0
          // Axios will wait indefinitely for the response (no timeout).
          timeout: EMBEDDINGS_TIMEOUT_MS,
        }
      );
      return response.data;
    } catch (error: any) {
      if (error.code === 'FASTAPI_TIMEOUT' || error.message?.includes('timeout')) {
        throw new UpstreamTimeoutError('Embeddings creation timed out');
      }
      if (error.response?.status) {
        throw new UpstreamServiceError(error.response.data?.message || error.message, error.response.status);
      }
      throw new UpstreamServiceError(error.message);
    }
  },

  async answerQuery(postId: string, question: string, requestId: string) {
    try {
      const response = await fastApiClient.post('/api/answer', { post_id: postId, query: question }, {
        headers: { 'x-request-id': requestId },
      });
      return response.data;
    } catch (error: any) {
      if (error.code === 'FASTAPI_TIMEOUT') {
        throw new UpstreamTimeoutError();
      }
      throw new UpstreamServiceError(error.message, error.response?.status);
    }
  },

  async generateSummary(postId: string, requestId: string) {
    try {
      const response = await fastApiClient.post('/api/summary', { post_id: postId }, {
        headers: { 'x-request-id': requestId },
      });
      return response.data;
    } catch (error: any) {
      if (error.code === 'FASTAPI_TIMEOUT') {
        throw new UpstreamTimeoutError();
      }
      throw new UpstreamServiceError(error.message, error.response?.status);
    }
  },

  async generateQuiz(postId: string, requestId: string) {
    try {
      const response = await fastApiClient.post('/api/quiz', { post_id: postId }, {
        headers: { 'x-request-id': requestId },
      });
      return response.data;
    } catch (error: any) {
      if (error.code === 'FASTAPI_TIMEOUT') {
        throw new UpstreamTimeoutError();
      }
      throw new UpstreamServiceError(error.message, error.response?.status);
    }
  },

  async searchEmbeddings(postId: string, query: string, requestId: string) {
    try {
      const response = await fastApiClient.post('/api/search', { post_id: postId, query }, {
        headers: { 'x-request-id': requestId },
      });
      return response.data;
    } catch (error: any) {
      if (error.code === 'FASTAPI_TIMEOUT') {
        throw new UpstreamTimeoutError();
      }
      throw new UpstreamServiceError(error.message, error.response?.status);
    }
  },
};
