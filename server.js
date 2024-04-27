import { server, serverQL, app } from './src/index.js'
const job = require('./cron.js')

if (process.env.LINK_BACKEND !== "http://localhost:4000")
    job.start();

serverQL.start().then((res) => {
    serverQL.applyMiddleware({ app });

    const port = process.env.PORT;
    server.listen(port, () => {
        console.log('Runing server succeed!');
        console.log(`Server RestFull API at http://localhost:${port}/api`);
        console.log(
            `Server GraphQL at http://localhost:${port}${serverQL.graphqlPath}`
        );
    });
});

// app.listen(3000, () => {
//     console.log(`Start server listen at http://localhost:${3000}`)
// });
