const request = require('supertest');
const app = require('../app'); // Path relative to src/__tests__

describe('Health Check Endpoint', () => {
  describe('GET /health', () => {
    it('should return 200 OK and a valid health status object', async () => {
      const res = await request(app).get('/health');
      
      // Check for status code
      expect(res.statusCode).toEqual(200);
      
      // Check that the response is JSON
      expect(res.headers['content-type']).toMatch(/json/);
      
      // Check for the 'status' property in the body
      expect(res.body).toHaveProperty('status', 'ok');
      
      // Check for other essential properties
      expect(res.body).toHaveProperty('uptime');
      expect(res.body).toHaveProperty('memory');
      expect(res.body).toHaveProperty('cpu');
    });
  });
});
