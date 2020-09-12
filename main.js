'use strict';

const http = require('http');
const mysqlx = require('@mysql/xdevapi');

const port = process.env.PORT || 9999;
const statusOk = 200;
// const statusNoContent = 204;
const statusBadRequest = 400;
const statusNotFound = 404;
const statusInternalServerError = 500;
const schema = 'social';

const client = mysqlx.getClient({
    user: 'app',
    password: 'pass',
    host: '0.0.0.0',
    port: 33060
});

const methods = new Map();

methods.set('/posts.get', async ({ response, db }) => {
    const table = db.getTable('posts');
    const result = await table
        .select(['id', 'content', 'likes', 'created'])
        .where('removed = :removed')
        .bind('removed', false)
        .orderBy('id DESC')
        .execute();

    const data = result.fetchAll();
    const columns = result.getColumns();
    const posts = data.map(map(columns));
    sendJSON(response, posts);
});

methods.set('/posts.getById', async ({ response, searchParams, db }) => {
    if (!searchParams.has('id')) {
        sendResponse(response, { status: statusBadRequest });
        return;
    }

    const postId = Number(searchParams.get('id'));
    if (Number.isNaN(postId)) {
        sendResponse(response, { status: statusBadRequest });
        return;
    }

    const table = db.getTable('posts');

    const result = await table
        .select(['id', 'content', 'likes', 'created'])
        .where('id = :id AND removed = :removed')
        .bind('id', postId)
        .bind('removed', false)
        .execute();

    const data = result.fetchAll();

    if (!data.length) {
        sendResponse(response, { status: statusNotFound });
        return;
    }

    const columns = result.getColumns();
    const post = data.map(map(columns))[0];
    sendJSON(response, post);
});

methods.set('/posts.post', async ({ response, searchParams, db }) => {

    if (!searchParams.has('content')) {
        sendResponse(response, { status: statusBadRequest });
        return;
    }

    const content = searchParams.get('content');

    const table = db.getTable('posts');
    const insertResult = await table
        .insert('content')
        .values(content)
        .execute();

    const createdPostId = insertResult.getAutoIncrementValue();
    const selectResult = await table
        .select(['id', 'content', 'likes', 'created'])
        .where('id = :id')
        .bind('id', createdPostId)
        .execute();

    const data = selectResult.fetchAll();
    const columns = selectResult.getColumns();
    const post = data.map(map(columns))[0];
    sendJSON(response, post);
});

methods.set('/posts.edit', async ({ response, searchParams, db }) => {

    if (!searchParams.has('id') || !searchParams.has('content')) {
        sendResponse(response, { status: statusBadRequest });
        return;
    }

    const postId = Number(searchParams.get('id'));
    const postContent = searchParams.get('content');

    if (Number.isNaN(postId)) {
        sendResponse(response, { status: statusBadRequest });
        return;
    }

    const table = db.getTable('posts');
    const updateResult = await table
        .update()
        .set('content', postContent)
        .where('id = :id AND removed = :removed')
        .bind('id', postId)
        .bind('removed', false)
        .execute();

    const updated = updateResult.getAffectedItemsCount();

    if (!updated) {
        sendResponse(response, { status: statusNotFound });
        return;
    }

    const selectResult = await table
        .select(['id', 'content', 'likes', 'created'])
        .where('id = :id AND removed = :removed')
        .bind('removed', false)
        .bind('id', postId)
        .execute();

    const data = selectResult.fetchAll();
    const columns = selectResult.getColumns();
    const post = data.map(map(columns))[0];
    sendJSON(response, post);
});

methods.set('/posts.delete', async ({ response, searchParams, db }) => {
    if (!searchParams.has('id')) {
        sendResponse(response, { status: statusBadRequest });
    }

    const postId = Number(searchParams.get('id'));
    if (Number.isNaN(postId)) {
        sendResponse(response, { status: statusBadRequest });
        return;
    }

    const table = await db.getTable('posts');
    const updatedResult = await table
        .update()
        .set('removed', true)
        .where('id = :id AND removed = :removed')
        .bind('id', postId)
        .bind('removed', false)
        .execute();

    const updated = updatedResult.getAffectedItemsCount();

    if (!updated) {
        sendResponse(response, { status: statusNotFound });
        return;
    }

    const selectResult = await table
        .select(['id', 'content', 'likes', 'created'])
        .where('id = :id AND removed = :removed')
        .bind('id', postId)
        .bind('removed', true)
        .execute();

    const data = selectResult.fetchAll();
    const columns = selectResult.getColumns();
    const post = data.map(map(columns))[0];
    sendJSON(response, post);
});

methods.set('/posts.restore', async ({ response, searchParams, db }) => {
    if (!searchParams.has('id')) {
        sendResponse(response, { status: statusBadRequest });
    }

    const postId = Number(searchParams.get('id'));
    if (Number.isNaN(postId)) {
        sendResponse(response, { status: statusBadRequest });
        return;
    }

    const table = await db.getTable('posts');
    const updatedResult = await table
        .update()
        .set('removed', false)
        .where('id = :id AND removed = :removed')
        .bind('id', postId)
        .bind('removed', true)
        .execute();

    const updated = updatedResult.getAffectedItemsCount();

    if (!updated) {
        sendResponse(response, { status: statusNotFound });
        return;
    }

    const selectResult = await table
        .select(['id', 'content', 'likes', 'created'])
        .where('id = :id AND removed = :removed')
        .bind('id', postId)
        .bind('removed', false)
        .execute();

    const data = selectResult.fetchAll();
    const columns = selectResult.getColumns();
    const post = data.map(map(columns))[0];
    sendJSON(response, post);
});


methods.set('/posts.like', async ({ response, searchParams, db }) => {
    if (!searchParams.has('id')) {
        sendResponse(response, { status: statusBadRequest });
    }

    const postId = Number(searchParams.get('id'));
    if (Number.isNaN(postId)) {
        sendResponse(response, { status: statusBadRequest });
        return;
    }

    const table = await db.getTable('posts');

    let selectResult = [];
    let data = [];
    let columns = [];
    let likes;

    selectResult = await table
        .select(['likes'])
        .where('id = :id AND removed = :removed')
        .bind('id', postId)
        .bind('removed', false)
        .execute();

    data = selectResult.fetchAll();

    if (!data.length) {
        sendResponse(response, { status: statusNotFound });
        return;
    }

    columns = selectResult.getColumns();
    likes = data.map(map(columns))[0].likes;

    await table.update()
        .set('likes', likes = likes + 1)
        .where('id = :id AND removed = :removed')
        .bind('id', postId)
        .bind('removed', false)
        .execute();

    selectResult = await table
        .select(['id', 'content', 'likes', 'created'])
        .where('id = :id AND removed = :removed')
        .bind('id', postId)
        .bind('removed', false)
        .execute();

    data = selectResult.fetchAll();
    columns = selectResult.getColumns();
    const post = data.map(map(columns))[0];

    sendJSON(response, post);
});

methods.set('/posts.dislike', async ({ response, searchParams, db }) => {
    if (!searchParams.has('id')) {
        sendResponse(response, { status: statusBadRequest });
    }

    const postId = Number(searchParams.get('id'));
    if (Number.isNaN(postId)) {
        sendResponse(response, { status: statusBadRequest });
        return;
    }

    const table = await db.getTable('posts');

    let selectResult = [];
    let data = [];
    let columns = [];
    let likes;

    selectResult = await table
        .select(['likes'])
        .where('id = :id AND removed = :removed')
        .bind('id', postId)
        .bind('removed', false)
        .execute();

    data = selectResult.fetchAll();

    if (!data.length) {
        sendResponse(response, { status: statusNotFound });
        return;
    }

    columns = selectResult.getColumns();
    likes = data.map(map(columns))[0].likes;

    await table.update()
        .set('likes', likes = likes - 1)
        .where('id = :id AND removed = :removed')
        .bind('id', postId)
        .bind('removed', false)
        .execute();

    selectResult = await table
        .select(['id', 'content', 'likes', 'created'])
        .where('id = :id AND removed = :removed')
        .bind('id', postId)
        .bind('removed', false)
        .execute();

    data = selectResult.fetchAll();
    columns = selectResult.getColumns();
    const post = data.map(map(columns))[0];

    sendJSON(response, post);
});


const server = http.createServer(async (request, response) => {
    const { pathname, searchParams } = new URL(request.url, `http://${request.headers.host}`);

    const method = methods.get(pathname);
    if (method === undefined) {
        response.writeHead(statusNotFound);
        response.end();
        return;
    }

    let session = null;
    try {
        session = await client.getSession();
        const db = await session.getSchema(schema);

        const params = {
            request,
            response,
            searchParams,
            pathname,
            db
        };

        await method(params);
    } catch (e) {
        console.log(e);
        sendResponse(response, { status: statusInternalServerError });
    } finally {
        if (session !== null) {
            try {
                session.close();
            } catch (e) {
                console.log(e);
            }
        }
    }



});

function map(columns) {
    return row => row.reduce((res, value, i) => ({ ...res, [columns[i].getColumnLabel()]: value }), {});
}

function sendResponse(response, { status = statusOk, headers = {}, body = null }) {
    Object.entries(headers).forEach(([key, value]) => {
        response.setHeader(key, value);
    });
    response.writeHead(status);
    response.end(body);
}

function sendJSON(response, body) {
    sendResponse(response, {
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
}

server.listen(port);