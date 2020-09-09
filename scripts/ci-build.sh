#!/bin/bash

echo $(pwd)

docker --version
aws --version

echo $TRAVIS_COMMIT
commit=$(git rev-parse --short=7 $TRAVIS_COMMIT)

accountID=$(aws sts get-caller-identity --output text --query 'Account')
regionID=us-west-2
application=stakez
registryURL="zilliqa/$application"

#eval "$(aws ecr get-login --no-include-email --region $regionID)"
echo "$DOCKER_API_TOKEN" | docker login -u "$DOCKER_USERNAME" --password-stdin

rm -rf "$application"-artifact
mkdir -p "$application"-artifact/stg/

docker build --build-arg REACT_APP_DEPLOY_ENV="stg" -t "tempimagestg:$commit" .
docker create --name extractstg "tempimagestg:$commit"
docker cp extractstg:/usr/share/nginx/html/. $(pwd)/"$application"-artifact/stg/
docker rm extractstg
docker push "$registryURL"

cd "$application"-artifact
cd stg
echo $commit > "$application"-artifact-commit.txt
zip -r "$application"-artifact-stg.zip .
aws s3 sync . s3://"$application"-static-artifact --exclude='*' --include=''"$application"'-artifact-stg.zip'

cd ..
echo $(date) > date_created.txt
aws s3 sync . s3://"$application"-static-artifact --exclude='*' --include='date_created.txt'
