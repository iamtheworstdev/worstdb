import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { format } from 'date-fns';
import Models from './model';

export class DDB {
  client: DocumentClient;
  tableName: string;
  partitionKey: string;
  sortKey: string;
  models: Record<string, Models>;

  constructor(
    client: DocumentClient,
    tableName: string,
    partitionKey: string,
    sortKey: string
  ) {
    this.client = client;
    this.tableName = tableName;
    this.partitionKey = partitionKey;
    this.sortKey = sortKey;
    this.models = {} as Record<string, Models>;
  }

  addModel(name: string, timestampIndex?: string) {
    this.models[name] = new Models(this, name, timestampIndex);
  }

  getCurrentTimestamp() {
    return format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
  }
}
