import { DocumentClient } from 'aws-sdk/clients/dynamodb';

const config = {
  convertEmptyValues: true,
  endpoint: 'localhost:4569',
  sslEnabled: false,
  region: 'us-east-1',
};

const client = new DocumentClient(config);

export default client;
