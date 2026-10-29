const { test, before, after } = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const { connectDB, getPool } = require('../src/config/db');

let server;
let baseUrl;
let token; // Token de autenticación para las peticiones protegidas

before(async () => {
    await connectDB();
    server = app.listen(0);
    baseUrl = `http://localhost:${server.address().port}/api`;

    // Nota: Autenticarte previamente o insertar un usuario/película de prueba 
});

after(async () => {
    server.close();
    await getPool().end();
});

test('crear reseña valida responde 201', async () => {
    // Ejemplo de prueba para la creación de reseña (HU-08)
    const reviewData = {
        title: 'Excelente película',
        rating: 9,
        comment: 'Me encantó la trama y el desarrollo de los personajes.'
    };


});

test('error 400/422 al enviar un título de reseña que excede los 255 caracteres', async () => {
    const longTitleReview = {
        title: 'a'.repeat(256), // Excede el límite de 255 caracteres
        rating: 8,
        comment: 'Comentario de prueba.'
    };


});

test('listar reseñas de una película con GET /movies/:id/reviews responde 200', async () => {

});