// main.tf
provider "aws" {
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true
  access_key                  = "mock_access_key"
  secret_key                  = "mock_secret_key"
  region                      = "us-east-1"

  endpoints {
    dynamodb = "http://localstack:4569"
  }
}

resource "aws_dynamodb_table" "primary_data" {
  name           = "PrimaryData"
  billing_mode   = "PROVISIONED"
  read_capacity  = 2
  write_capacity = 2

  hash_key  = "pk"
  range_key = "sk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  attribute {
    name = "data"
    type = "S"
  }

  global_secondary_index {
    name            = "gsi-1"
    hash_key        = "sk"
    range_key       = "pk"
    write_capacity  = 1
    read_capacity   = 1
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "gsi-2"
    hash_key        = "sk"
    range_key       = "data"
    write_capacity  = 1
    read_capacity   = 1
    projection_type = "ALL"
  }

  ttl {
    attribute_name = "TimeToExist"
    enabled        = false
  }
}