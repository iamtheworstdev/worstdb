import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { format } from 'date-fns';
import Models from './model';

class DDB {
  client: DocumentClient;
  tableName: string;
  models: Record<string, Models>;

  constructor({
    client,
    tableName = 'PrimaryData',
  }: {
    client: DocumentClient;
    tableName?: string;
  }) {
    this.client = client;
    this.tableName = tableName;
    this.models = {} as Record<string, Models>;
  }

  addModel(
    name: string,
    partitionKey: string,
    sortKey?: string,
    timestampIndex?: string
  ) {
    this.models[name] = new Models(
      this,
      name,
      partitionKey,
      sortKey,
      timestampIndex
    );
  }

  getCurrentTimestamp() {
    return format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
  }
}

export default DDB;
