import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { format } from 'date-fns';
import { Models, Index } from './model';

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

  addGenericModel(name: string, timestampIndex?: string) {
    if (timestampIndex) {
      let timestamp: Index = {
        index: timestampIndex,
        partitionKey: 'sk',
        sortKey: `${timestampIndex}sk`,
      };
      this.models[name] = new Models(this, name, timestamp);
    } else {
      this.models[name] = new Models(this, name);
    }
  }

  addModel(name: string, model: Models) {
    this.models[name] = model;
  }

  getCurrentTimestamp() {
    return format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
  }
}
