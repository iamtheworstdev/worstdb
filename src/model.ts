import DDB from './index';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

type Model = {
  id: string;
};

type ModelList = (Model | undefined)[];

class Models {
  ddb: DDB;
  resourceName: string = 'model';
  partitionKey: string = 'pk';
  sortKey: string | undefined;

  constructor(
    ddb: DDB,
    resourceName: string,
    partitionKey: string,
    sortKey?: string
  ) {
    this.ddb = ddb;
    this.resourceName = resourceName;
    this.partitionKey = partitionKey;
    this.sortKey = sortKey;
  }

  getPrimaryKey(id: string) {
    return {
      pk: this.getIdWithPrefix(id),
      sk: this.resourceName,
    };
  }

  getIdWithPrefix(id: string) {
    const prefix = `${this.resourceName}#`;
    return id.startsWith(prefix) ? id : `${prefix}${id}`;
  }

  stripIdPrefix(id: string) {
    if (id.match(/^#/)) {
      return id;
    }
    return id.substring(id.indexOf('#') + 1);
  }

  itemToModel(
    item: DocumentClient.AttributeMap | undefined
  ): Model | undefined {
    if (!item) {
      return undefined;
    }

    const { pk, sk, ...model } = item;

    return {
      id: this.stripIdPrefix(pk),
      ...model,
    };
  }

  async create(model: Model) {
    const { id, ...modelAttributes } = model;

    return await this.ddb.client.put({
      TableName: this.ddb.tableName,
      Item: {
        ...this.getPrimaryKey(id),
        data: this.ddb.getCurrentTimestamp(),
        ...modelAttributes,
      },
    });
  }

  async get(id: string): Promise<Model | undefined> {
    const { Item } = await this.ddb.client
      .get({
        TableName: this.ddb.tableName,
        Key: this.getPrimaryKey(id),
      })
      .promise();

    return this.itemToModel(Item);
  }

  getRecent = async (count: number): Promise<ModelList> => {
    const result = await this.ddb.client
      .query({
        TableName: this.ddb.tableName,
        IndexName: this.ddb.indexes[1],
        Limit: count,
        KeyConditionExpression: 'sk = :hkey',
        ExpressionAttributeValues: {
          ':hkey': this.resourceName,
        },
        ScanIndexForward: false,
        // ExclusiveStartKey: cursor ? extractCursor(cursor) : undefined,
      })
      .promise();

    if (result.Count && result.Items) {
      return result.Items.map(item => this.itemToModel(item));
    }
    return [] as Model[];
  };
}

export default Models;
