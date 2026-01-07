terraform {
  required_version = ">= 1.8.1"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "6.27.0"
    }
  }

  backend "s3" {
    bucket = "terraform-state-jatheesishoh"
    key    = "terraform_state.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = "us-east-1"
}
