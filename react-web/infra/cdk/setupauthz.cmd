@echo off
cd /d "%~dp0"
set POOL=us-east-2_6jr9ZaxsH
set CLIENT=5jsaa5peabemi0a4nd8q94lif9
echo === crear cobrador === > setupauthz.log 2>&1
aws cognito-idp admin-create-user --user-pool-id %POOL% --username cobrador@demo.co --user-attributes Name=email,Value=cobrador@demo.co Name=email_verified,Value=true --message-action SUPPRESS >> setupauthz.log 2>&1
aws cognito-idp admin-set-user-password --user-pool-id %POOL% --username cobrador@demo.co --password "Demo1234" --permanent >> setupauthz.log 2>&1
aws cognito-idp admin-add-user-to-group --user-pool-id %POOL% --username cobrador@demo.co --group-name COLLECTION_AGENT >> setupauthz.log 2>&1
echo === tokens === >> setupauthz.log 2>&1
aws cognito-idp initiate-auth --auth-flow USER_PASSWORD_AUTH --client-id %CLIENT% --auth-parameters USERNAME=admin@demo.co,PASSWORD=Demo1234 --query "AuthenticationResult.IdToken" --output text > tadmin.txt 2>> setupauthz.log
aws cognito-idp initiate-auth --auth-flow USER_PASSWORD_AUTH --client-id %CLIENT% --auth-parameters USERNAME=cobrador@demo.co,PASSWORD=Demo1234 --query "AuthenticationResult.IdToken" --output text > tcoll.txt 2>> setupauthz.log
node authz.cjs >> setupauthz.log 2>&1
echo DONE_EXIT=%ERRORLEVEL% >> setupauthz.log
