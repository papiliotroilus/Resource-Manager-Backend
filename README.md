QUICK START WITH DOCKER:
- Make sure you have a Keycloak instance up with a client that has authentication on, as well as a PostgreSQL database.
- Build the image with `docker build -t resource-manager-backend .` if necessary.
- Run the image with `docker run --name dvloper-backend --net=host --restart=unless-stopped -d -e LOGOUT_URL=http://localhost:3000/ -e PORT=3000 -e DATABASE_URL=postgresql://admin:admin@localhost:5432/resource-manager -e FRONTEND_URL=https://localhost -e KEYCLOAK_URL=http://localhost:8080/ -e KEYCLOAK_REALM=resource-manager -e KEYCLOAK_CLIENT=resource-manager-backend -e KEYCLOAK_SECRET=vAHgrkFHmwaWQsdt7KhQzdDnacv7RP6W -e KEYCLOAK_ADMIN_USERNAME=admin -e KEYCLOAK_ADMIN_PASSWORD=admin resource-manager-backend` replacing the environment variables with the appropriate info. If the realm name contains spaces, replace them with `%20`.

This repository contains the backend of a resource manager.
- It is built in TypeScript with Express.js and connects to a separate frontend housed in the `resource-manager-frontend` repository.
- To properly initialise, a `.env` file needs to be created containing the app's logout redirect URL, e.g. `LOGOUT_URL=http://localhost:3000/`, and its port, e.g. `PORT=3000`, Keycloak's URL, realm, client, and client secret (`KEYCLOAK_URL`, `KEYCLOAK_REALM`, `KEYCLOAK_CLIENT`, and `KEYCLOAK_SECRET` respectively), and Keycloak admin credentials (`KEYCLOAK_ADMIN_USERNAME`, `KEYCLOAK_ADMIN_PASSWORD`)

The database is designated as PostgreSQL and accessed with Prisma ORM.
- To make it, create a Docker container with the `postgres` image and standard parameters, then add its URL in `.env` as `DATABASE_URL="postgresql://{username}:{password}>{address}/{database name}` and apply the Prisma schema with `npx prisma migrate deploy`
- To seed it, run `npx prisma db seed`
- To view it, run `npx prisma studio` and access it in a browser on port 5555.

Authentication is done via Keycloak and account data is stored in its own database.
- The Keycloak server can be created as a Docker container with the `keycloak` image and standard parameters.
- The admin console can be accessed in a browser on port 8080 by default.
- To link the Keycloak server to the app, create a realm, then a backend client with all fields set to the backend's address (and "Valid redirect URIs" with an \* at the end) and client authentication enabled, and use the adapter config info to set up the environment variables. If the realm names contains spaces, replace them with `%20`.
- Two roles should be defined in the realm, namely 'admin' and 'user'. Admins can update and delete the resources and reservations of users other than themselves, which normal users cannot.
- The first user has to be manually assigned as such in the console, after which existing admins can promote other users.

The most important endpoints to know are:
- `/` leads to the homepage which contains a welcome message that echoes the user's name back, or to the Keycloak login screen if not logged in.
- `/v1/login` redirects to the Keycloak login page or to the homepage if logged in; it can also be posted to for direct log in, returning an access token.
- `/v1/register` also redirects to the Keycloak login page where registration in browser is possible, and can also be posted to for direct user creation.
- `/v1/whoami` returns the logged in user's details
- `/v1/logout` logs the user out.
- `/api` leads to the API documentation page with more info as well as a list of the CRUD endpoints for resources, reservations, and users.
- All endpoints except the documentation one are either protected by Keycloak or redirect to it. In addition, some of the user endpoints are restricted to admin-only access.

To connect to the frontend, CORS needs to be configured by adding the frontend's root URL, without a trialing slash, to `.env`, e.g. `FRONTEND_URL=https://localhost`.

A few notes on automated testing:
- Tests are stored in `../__tests__/`, which also needs to include a copy of `keycloak.json` since the Keycloak library uses relative paths.
- Because tests access the same database, they are organised into an integration test suite named `organisedTests.test` which contains multiple child suites stored in `../__tests__/tests/` that individually test parts of the app and depend on previous ones, but can be toggled off an on to some extent by commenting out their function invocations in the parent suite.
- To avoid redundancy, it is recommended to run the test suite with `npm test` which only run the main suite once, otherwise it will also try to run the child suites separately
- Coverage info is outputted to the `/coverage/` directory.

Finally, this repository also contains a GitLab CI/CD manifest to incorporate this app as part of a self-updating Kubernetes cluster. For more information on this, see the `resource-manager-devops` repository.
