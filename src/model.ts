import { DDB } from './index';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

type Function = () => string | number;

export type Model = {
  id: string;
} & Record<string, any>;

export type Index = {
  index: string;
  partitionKey: string;
  partitionKeyValue?: string;
  sortKey: string;
  sortKeyValue?: string;
};
export type Relationship = Index & {
  type: 'Many_to_Many' | '1_to_1' | '1_to_many' | 'Many_to_1';
};

type Relationships = Record<string, Relationship>;

type ModelList = (Model | undefined)[];

export class Models {
  ddb: DDB;
  resourceName: string = 'model';
  timestamp: Index | undefined;
  relationships: Relationships | undefined;

  constructor(
    ddb: DDB,
    resourceName: string,
    timestamp?: Index,
    relationships?: Relationships
  ) {
    this.ddb = ddb;
    this.resourceName = resourceName;
    this.timestamp = timestamp;
    this.relationships = relationships;
  }

  public getPrimaryKey(id: string) {
    const pk = {
      [this.ddb.partitionKey]: this.getIdWithPrefix(id),
      [this.ddb.sortKey]: this.resourceName,
    };
    console.log(`pk = ${JSON.stringify(pk)}`);
    return pk;
  }

  public getIdWithPrefix(id: string) {
    const prefix = `${this.resourceName}#`;
    return id.startsWith(prefix) ? id : `${prefix}${id}`;
  }

  public stripIdPrefix(id: string) {
    if (id.match(/^#/)) {
      return id;
    }
    return id.substring(id.indexOf('#') + 1);
  }

  public itemToModel(
    item: DocumentClient.AttributeMap | undefined
  ): Model | undefined {
    if (!item) {
      return undefined;
    }

    const model: Model = {
      id: this.stripIdPrefix(item[this.ddb.partitionKey]),
      ...item,
    };

    if (this.timestamp) {
      model.created_at = model[this.timestamp.sortKey];
      delete model[this.timestamp.sortKey];
    }

    delete model['pk'];
    delete model['sk'];

    return model;
  }

  public getKeyValue(
    value: number | string | Function | undefined
  ): number | string | undefined {
    if (typeof value === 'function') {
      return value();
    }
    return value;
  }

  public async create(model: Model) {
    const { id, ...modelAttributes } = model;
    const item = {
      ...this.getPrimaryKey(id),
      ...modelAttributes,
    };
    if (this.timestamp) {
      item[`${this.timestamp.sortKey}`] = this.ddb.getCurrentTimestamp();
    }
    console.log(`create - ${JSON.stringify(item)}`);
    return this.save(item);
  }

  public async save(Item: DocumentClient.PutItemInputAttributeMap) {
    console.log(`save - ${JSON.stringify(Item)}`);
    return await this.ddb.client
      .put({
        TableName: this.ddb.tableName,
        Item,
      })
      .promise();
  }

  public async get(id: string): Promise<Model | undefined> {
    console.log(`get id - ${JSON.stringify(id)}`);
    const { Item } = await this.ddb.client
      .get({
        TableName: this.ddb.tableName,
        Key: this.getPrimaryKey(id),
      })
      .promise();

    console.log(`get ${JSON.stringify(Item)}`);

    return this.itemToModel(Item);
  }

  public async getNodes(
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
      this.getKeyValue(partitionKeyValue) ||
      this.getKeyValue(r.partitionKeyValue) ||
      this.resourceName;
    const sKey =
      this.getKeyValue(sortKeyValue) ||
      this.getKeyValue(r.sortKeyValue) ||
      model;
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

  public async getRecent(count: number): Promise<ModelList> {
    if (!this.timestamp) {
      throw new Error('Model does not support getRecent');
    }

    console.log(`ts index - ${JSON.stringify(this.timestamp)}`);

    const query: DocumentClient.QueryInput = {
      TableName: this.ddb.tableName,
      IndexName: this.timestamp.index,
      Limit: count,
      KeyConditionExpression: `sk = :hkey`,
      ExpressionAttributeValues: {
        ':hkey': this.resourceName,
      },
      ScanIndexForward: false,
      // ExclusiveStartKey: cursor ? extractCursor(cursor) : undefined,
    };

    console.log(`query input - ${JSON.stringify(query)}`);

    const result = await this.ddb.client.query(query).promise();

    if (result.Count && result.Items) {
      return result.Items.map(item => this.itemToModel(item));
    }
    return [] as ModelList;
  }
}
