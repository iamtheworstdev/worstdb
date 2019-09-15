import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { format } from 'date-fns';
import Models from './model';

class DDB {
  client: DocumentClient;
  tableName: string;
  indexes: string[];
  models: Record<string, Models>;

  constructor({
    client,
    tableName = 'PrimaryData',
    indexes = ['gsi-1', 'gsi-2'],
  }: {
    client: DocumentClient;
    tableName?: string;
    indexes?: string[];
  }) {
    this.client = client;
    this.tableName = tableName;
    this.indexes = indexes;

    this.models = {} as Record<string, Models>;
  }

  getCurrentTimestamp() {
    return format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
  }
}

export default DDB;
