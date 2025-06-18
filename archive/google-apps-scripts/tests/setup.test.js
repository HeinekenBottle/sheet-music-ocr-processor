const { expect } = require('chai');

describe('Testing Environment', () => {
  it('should run basic assertions', () => {
    expect(true).to.be.true;
    expect({}).to.be.an('object');
    expect([1, 2, 3]).to.have.lengthOf(3);
  });

  it('should handle async tests', async () => {
    const result = await Promise.resolve(42);
    expect(result).to.equal(42);
  });
});