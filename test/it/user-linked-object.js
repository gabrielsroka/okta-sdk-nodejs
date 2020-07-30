const expect = require('chai').expect;
const okta = require('../../src');
const models = require('../../src/models');
const Collection = require('../../src/collection');
const utils = require('../utils');
const getMockLinkedObject = require('./mocks/linked-object');
const getMockUser = require('./mocks/user-without-credentials');
let orgUrl = process.env.OKTA_CLIENT_ORGURL;

if (process.env.OKTA_USE_MOCK) {
  orgUrl = `${orgUrl}/user-linked-object`;
}

const client = new okta.Client({
  orgUrl: orgUrl,
  token: process.env.OKTA_CLIENT_TOKEN,
  requestExecutor: new okta.DefaultRequestExecutor()
});

describe('User linked object API', () => {
  let primaryUser;
  let associateUser;
  let linkedObject;
  beforeEach(async () => {
    primaryUser = await client.createUser(getMockUser(), { activate: false });
    associateUser = await client.createUser(getMockUser(), { activate: false });
    linkedObject = await client.addLinkedObjectDefinition(getMockLinkedObject());
  });
  afterEach(async () => {
    await linkedObject.delete(linkedObject.primary.name);
    await utils.cleanupUser(client, primaryUser);
    await utils.cleanupUser(client, associateUser);
  });

  describe('Set linked object value for primary', () => {
    it('should return status 204', async () => {
      const res = await client.setLinkedObjectForUser(associateUser.id, linkedObject.primary.name, primaryUser.id);
      expect(res.status).to.equal(204);
    });
  });

  describe('Get linked object value', () => {
    let links;
    beforeEach(async () => {
      await associateUser.setLinkedObject(linkedObject.primary.name, primaryUser.id);
    });

    it('should return primary linked object value', async () => {
      links = await associateUser.getLinkedObjects(linkedObject.primary.name);
      expect(links).to.be.instanceOf(Collection);
      await links.each(link => {
        expect(link).to.be.instanceOf(models.ResponseLinks);
        expect(link._links.self.href).contains(primaryUser.id);
      });
    });

    it('should return associate linked object value', async () => {
      links = await primaryUser.getLinkedObjects(linkedObject.associated.name);
      expect(links).to.be.instanceOf(Collection);
      await links.each(link => {
        expect(link).to.be.instanceOf(models.ResponseLinks);
        expect(link._links.self.href).contains(associateUser.id);
      });
    });
  });

  describe('Delete linked object value', () => {
    beforeEach(async () => {
      await associateUser.setLinkedObject(linkedObject.primary.name, primaryUser.id);
    });

    it('should return 204 after deleting linked object', async () => {
      const res = await client.removeLinkedObjectForUser(associateUser.id, linkedObject.primary.name);
      expect(res.status).to.equal(204);
    });
  });
});
