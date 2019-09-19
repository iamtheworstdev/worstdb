import { DDB } from './index';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

type Function = () => string | number;

type Model = {
  id: string;
};

type Relationship = {
  index: string;
  partitionKey: string;
  partitionKeyValue?: string;
  sortKey: string;
  sortKeyValue?: string;
  type: 'Many_to_Many' | '1_to_1' | '1_to_many' | 'Many_to_1';
};

type Relationships = Record<string, Relationship>;

type ModelList = (Model | undefined)[];

class Models {
  ddb: DDB;
  resourceName: string = 'model';
  timestampIndex: string | undefined;
  relationships: Relationships | undefined;

  constructor(
    ddb: DDB,
    resourceName: string,
    timestampIndex?: string,
    relationships?: Relationships
  ) {
    this.ddb = ddb;
    this.resourceName = resourceName;
    this.timestampIndex = timestampIndex;
    this.relationships = relationships;
  }

  getPrimaryKey(id: string) {
    return {
      [this.ddb.partitionKey]: this.getIdWithPrefix(id),
      [this.ddb.sortKey]: this.resourceName,
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

    delete item[this.ddb.partitionKey];
    delete item[this.ddb.sortKey];

    return {
      id: this.stripIdPrefix(this.ddb.partitionKey),
      ...item,
    };
  }

  async create(model: Model) {
    const { id, ...modelAttributes } = model;

    return await this.ddb.client
      .put({
        TableName: this.ddb.tableName,
        Item: {
          ...this.getPrimaryKey(id),
          data: this.ddb.getCurrentTimestamp(),
          ...modelAttributes,
        },
      })
      .promise();
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

  async getNodes(
    model: string,
    partitionKeyValue?: number | string | Function,
    sortKeyValue?: number | string | Function
  ): Promise<ModelList> {
    if (!this.relationships || !this.relationships[model]) {
      throw new Error('Relationship not specified');
    }

    const count = 10;
    const r = this.relationships[model];
    const pKey =
      getKeyValue(partitionKeyValue) ||
      getKeyValue(r.partitionKeyValue) ||
      this.resourceName;
    const sKey =
      getKeyValue(sortKeyValue) || getKeyValue(r.sortKeyValue) || model;
    const result = await this.ddb.client
      .query({
        TableName: this.ddb.tableName,
        IndexName: r.index,
        Limit: count,
        KeyConditionExpression: `${r.partitionKey} = :pKey and ${r.sortKey} = :sKey`,
        ExpressionAttributeValues: {
          ':pKey': pKey,
          ':sKey': sKey,
        },
        ScanIndexForward: false,
        // ExclusiveStartKey: cursor ? extractCursor(cursor) : undefined,
      })
      .promise();

    if (result.Count && result.Items) {
      return result.Items.map(item => this.itemToModel(item));
    }
    return [] as ModelList;
  }

  async getRecent(count: number): Promise<ModelList> {
    if (!this.timestampIndex) {
      throw new Error('Model does not support getRecent');
    }

    const result = await this.ddb.client
      .query({
        TableName: this.ddb.tableName,
        IndexName: this.timestampIndex,
        Limit: count,
        KeyConditionExpression: `${this.ddb.sortKey} = :hkey`,
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
    return [] as ModelList;
  }
}

const getKeyValue = (
  value: number | string | Function | undefined
): number | string | undefined => {
  if (typeof value === 'function') {
    return value();
  }
  return value;
};

export default Models;
