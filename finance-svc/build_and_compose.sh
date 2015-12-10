#!/bin/bash

#cd ./src && npm update && npm install
docker build -t finance-svc .
docker-compose -p finance up