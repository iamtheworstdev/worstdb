import { DDB } from '../src';
import client from './client';

describe('model', () => {
  // beforeAll(clearPrimaryData);
  const ddb = new DDB(client, 'PrimaryData', 'pk', 'sk');

  ddb.addGenericModel('model', 'gsi2');

  it('should create a proper primary key', () => {
    const key = ddb.models.model.getPrimaryKey('1');
    expect(key).toMatchObject({ pk: 'model#1', sk: 'model' });
  });

  it('should insert the model into table', async () => {
    const id = '1';

    await ddb.models.model.create({
      id,
    });

    const model = await ddb.models.model.get(id);

    expect(model).toBeDefined();

    expect(model).toMatchObject({
      id,
    });
  });

  it('should retrieve recent entries in order from newest to oldest', async () => {
    await ddb.models.model.create({
      id: '2',
    });

    await ddb.models.model.create({
      id: '3',
    });

    const list = await ddb.models.model.getRecent(3);
    console.log(JSON.stringify(list));

    expect(list.length).toBeGreaterThan(0);

    expect(list).toMatchObject([{ id: '3' }, { id: '2' }, { id: '1' }]);
  });
});
